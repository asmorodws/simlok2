import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// GET /api/logs/stream - SSE endpoint for real-time log streaming
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Only SUPER_ADMIN can stream logs
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return new Response('Unauthorized', { status: 403 });
  }

  const encoder = new TextEncoder();
  const logDir = path.join(process.cwd(), 'logs');

  // Track file positions for each log file
  const filePositions = new Map<string, number>();
  let isStreamActive = true;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`));

      // Function to get all log files for today
      const getTodayLogFiles = (): string[] => {
        const todayDate = new Date().toISOString().split('T')[0] || '';
        const files: string[] = [];
        
        try {
          if (fs.existsSync(logDir)) {
            const allFiles = fs.readdirSync(logDir);
            for (const file of allFiles) {
              if (todayDate && file.includes(todayDate) && file.endsWith('.log')) {
                files.push(path.join(logDir, file));
              }
            }
          }
        } catch (error) {
          console.error('[LogStream] Error reading log directory:', error);
        }
        
        return files;
      };

      // Function to parse a log line
      const parseLogLine = (line: string) => {
        const match = line.match(/\[([^\]]+)\]\s\[([^\]]+)\]\s\[([^\]]+)\]\s(.+)/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2],
            context: match[3],
            message: match[4],
            raw: line,
          };
        }
        return { raw: line };
      };

      // Function to check for new logs
      const checkForNewLogs = () => {
        if (!isStreamActive) return;

        const logFiles = getTodayLogFiles();
        
        for (const filePath of logFiles) {
          try {
            const stats = fs.statSync(filePath);
            const currentSize = stats.size;
            const lastPosition = filePositions.get(filePath) || 0;

            // If file has grown, read new content
            if (currentSize > lastPosition) {
              const fd = fs.openSync(filePath, 'r');
              const buffer = Buffer.alloc(currentSize - lastPosition);
              fs.readSync(fd, buffer, 0, buffer.length, lastPosition);
              fs.closeSync(fd);

              const newContent = buffer.toString('utf8');
              const newLines = newContent.split('\n').filter(line => line.trim());

              for (const line of newLines) {
                const parsedLog = parseLogLine(line);
                try {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsedLog)}\n\n`));
                } catch (error) {
                  // Stream might be closed
                  isStreamActive = false;
                  return;
                }
              }

              filePositions.set(filePath, currentSize);
            } else if (currentSize < lastPosition) {
              // File was rotated/truncated, reset position
              filePositions.set(filePath, 0);
            }
          } catch (error) {
            // File might not exist anymore
            filePositions.delete(filePath);
          }
        }
      };

      // Initialize file positions to current file sizes (don't send old logs)
      const initialFiles = getTodayLogFiles();
      for (const filePath of initialFiles) {
        try {
          const stats = fs.statSync(filePath);
          filePositions.set(filePath, stats.size);
        } catch (error) {
          // Ignore
        }
      }

      // Poll for new logs every 1 second
      const pollInterval = setInterval(() => {
        checkForNewLogs();
      }, 1000);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (!isStreamActive) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`));
        } catch (error) {
          isStreamActive = false;
        }
      }, 30000);

      // Cleanup when request is aborted
      request.signal.addEventListener('abort', () => {
        isStreamActive = false;
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch (error) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
