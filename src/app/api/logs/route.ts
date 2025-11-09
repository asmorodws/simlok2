import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger, LogLevel } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

// GET /api/logs - Get logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only SUPER_ADMIN can view logs
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const level = searchParams.get('level') as LogLevel | null;
    const search = searchParams.get('search');
    const daysBack = parseInt(searchParams.get('daysBack') || '7', 10);

    if (!date) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    let logs: string[];

    if (search) {
      // Search across multiple days
      logs = logger.searchLogs(search, daysBack);
    } else {
      // Get logs for specific date and level
      if (level) {
        logs = logger.getLogs(date, level);
      } else {
        logs = logger.getLogs(date);
      }
    }

    // Parse logs into structured format
    const parsedLogs = logs.map(log => {
      const match = log.match(/\[([^\]]+)\]\s\[([^\]]+)\]\s\[([^\]]+)\]\s(.+)/);
      if (match) {
        return {
          timestamp: match[1],
          level: match[2],
          context: match[3],
          message: match[4],
          raw: log,
        };
      }
      return { raw: log };
    });

    return NextResponse.json({
      date,
      level: level || 'ALL',
      total: parsedLogs.length,
      logs: parsedLogs,
    });
  } catch (error) {
    logger.error('API:Logs', 'Failed to retrieve logs', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/logs - Clear logs (for specific date or all)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only SUPER_ADMIN can delete logs
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { date } = await request.json();
    const logDir = path.join(process.cwd(), 'logs');

    if (!date || date === 'all') {
      // Clear all logs
      const files = fs.readdirSync(logDir);
      files.forEach(file => {
        if (file.endsWith('.log')) {
          fs.unlinkSync(path.join(logDir, file));
        }
      });

      logger.info('API:Logs', `All logs cleared by ${session.user.email}`, {
        userId: session.user.id,
      });

      return NextResponse.json({ message: 'All logs cleared successfully' });
    } else {
      // Clear logs for specific date
      const files = fs.readdirSync(logDir);
      const deletedFiles: string[] = [];

      files.forEach(file => {
        if (file.includes(date) && file.endsWith('.log')) {
          fs.unlinkSync(path.join(logDir, file));
          deletedFiles.push(file);
        }
      });

      logger.info('API:Logs', `Logs cleared for date ${date} by ${session.user.email}`, {
        userId: session.user.id,
        deletedFiles,
      });

      return NextResponse.json({ 
        message: `Logs cleared for ${date}`,
        deletedFiles,
      });
    }
  } catch (error) {
    logger.error('API:Logs', 'Failed to delete logs', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/logs/files - Get list of available log files
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only SUPER_ADMIN can view log files
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const logDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const stats = fs.statSync(path.join(logDir, file));
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());

    return NextResponse.json({ files });
  } catch (error) {
    logger.error('API:Logs', 'Failed to list log files', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
