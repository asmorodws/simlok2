import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { logger, LogLevel } from '@/lib/logging/logger';
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import fs from 'fs';
import path from 'path';

// GET /api/logs - Get logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.SUPER_ADMINS, 'Only super admins can view logs');
    if (userOrError instanceof NextResponse) return userOrError;

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const level = searchParams.get('level') as LogLevel | null;
    const search = searchParams.get('search');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const logs: string[] = [];

    // Get all dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0] || '');
    }

    // Collect logs from all dates in range
    for (const date of dates) {
      if (!date) continue;
      
      let dateLogs: string[];
      if (level) {
        dateLogs = logger.getLogs(date, level);
      } else {
        dateLogs = logger.getLogs(date);
      }
      
      // Filter by search term if provided
      if (search) {
        dateLogs = dateLogs.filter(log => 
          log.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      logs.push(...dateLogs);
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
      startDate,
      endDate,
      level: level || 'ALL',
      total: parsedLogs.length,
      logs: parsedLogs,
    });
  } catch (error) {
    logger.error('API:Logs', 'Failed to retrieve logs', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/logs - Clear logs (for date range or all)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.SUPER_ADMINS, 'Only super admins can delete logs');
    if (userOrError instanceof NextResponse) return userOrError;

    const { startDate, endDate } = await request.json();
    const logDir = path.join(process.cwd(), 'logs');

    if (!startDate || !endDate) {
      // Clear all logs
      const files = fs.readdirSync(logDir);
      files.forEach(file => {
        if (file.endsWith('.log')) {
          fs.unlinkSync(path.join(logDir, file));
        }
      });

      logger.info('API:Logs', `All logs cleared by ${userOrError.email}`, {
        userId: userOrError.id,
      });

      return NextResponse.json({ message: 'All logs cleared successfully' });
    } else {
      // Clear logs for date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: string[] = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0] || '');
      }

      const files = fs.readdirSync(logDir);
      const deletedFiles: string[] = [];

      files.forEach(file => {
        const matchingDate = dates.find(date => file.includes(date));
        if (matchingDate && file.endsWith('.log')) {
          fs.unlinkSync(path.join(logDir, file));
          deletedFiles.push(file);
        }
      });

      logger.info('API:Logs', `Logs cleared for range ${startDate} to ${endDate} by ${userOrError.email}`, {
        userId: userOrError.id,
        deletedFiles,
      });

      return NextResponse.json({ 
        message: `Logs cleared for ${startDate} to ${endDate}`,
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
    const userOrError = requireSessionWithRole(session, RoleGroups.SUPER_ADMINS, 'Only super admins can view log files');
    if (userOrError instanceof NextResponse) return userOrError;

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
