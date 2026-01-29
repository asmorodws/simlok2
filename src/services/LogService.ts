import { logger, LogLevel } from '@/lib/logging/logger';
import fs from 'fs';
import path from 'path';

interface ParsedLog {
  timestamp?: string;
  level?: string;
  context?: string;
  message?: string;
  raw: string;
}

/**
 * Service for log management
 */
class LogService {
  private logDir = path.join(process.cwd(), 'logs');

  /**
   * Get logs within a date range
   */
  async getLogs(filters: {
    startDate: string;
    endDate: string;
    level?: LogLevel | null;
    search?: string | null;
  }) {
    const { startDate, endDate, level, search } = filters;

    const logs: string[] = [];

    // Get all dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr) dates.push(dateStr);
    }

    // Collect logs from all dates in range
    for (const date of dates) {
      let dateLogs: string[];
      if (level) {
        dateLogs = logger.getLogs(date, level);
      } else {
        dateLogs = logger.getLogs(date);
      }

      // Filter by search term if provided
      if (search) {
        dateLogs = dateLogs.filter((log) => log.toLowerCase().includes(search.toLowerCase()));
      }

      logs.push(...dateLogs);
    }

    // Parse logs into structured format
    const parsedLogs: ParsedLog[] = logs.map((log) => {
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

    return {
      startDate,
      endDate,
      level: level || 'ALL',
      total: parsedLogs.length,
      logs: parsedLogs,
    };
  }

  /**
   * Clear logs (all or within date range)
   */
  async clearLogs(
    userId: string,
    userEmail: string,
    dateRange?: { startDate: string; endDate: string }
  ) {
    if (!dateRange) {
      // Clear all logs
      const files = fs.readdirSync(this.logDir);
      const deletedFiles: string[] = [];

      files.forEach((file) => {
        if (file.endsWith('.log')) {
          fs.unlinkSync(path.join(this.logDir, file));
          deletedFiles.push(file);
        }
      });

      logger.info('API:Logs', `All logs cleared by ${userEmail}`, { userId });

      return {
        message: 'All logs cleared successfully',
        deletedFiles,
      };
    } else {
      // Clear logs for date range
      const { startDate, endDate } = dateRange;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: string[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr) dates.push(dateStr);
      }

      const files = fs.readdirSync(this.logDir);
      const deletedFiles: string[] = [];

      files.forEach((file) => {
        const matchingDate = dates.find((date) => file.includes(date));
        if (matchingDate && file.endsWith('.log')) {
          fs.unlinkSync(path.join(this.logDir, file));
          deletedFiles.push(file);
        }
      });

      logger.info('API:Logs', `Logs cleared for range ${startDate} to ${endDate} by ${userEmail}`, {
        userId,
        deletedFiles,
      });

      return {
        message: `Logs cleared for ${startDate} to ${endDate}`,
        deletedFiles,
      };
    }
  }

  /**
   * Get list of available log files
   */
  async getLogFiles() {
    if (!fs.existsSync(this.logDir)) {
      return { files: [] };
    }

    const files = fs
      .readdirSync(this.logDir)
      .filter((file) => file.endsWith('.log'))
      .map((file) => {
        const stats = fs.statSync(path.join(this.logDir, file));
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());

    return { files };
  }
}

// Export singleton instance
export const logService = new LogService();
