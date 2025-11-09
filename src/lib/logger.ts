import fs from 'fs';
import path from 'path';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  } | undefined;
  userId?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
}

class Logger {
  private logDir: string;
  private maxLogFiles = 30; // Keep logs for 30 days
  private isServer: boolean;

  constructor() {
    this.isServer = typeof window === 'undefined';
    this.logDir = path.join(process.cwd(), 'logs');
    
    if (this.isServer) {
      this.ensureLogDirectory();
      this.cleanOldLogs();
    }
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          time: fs.statSync(path.join(this.logDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Remove old log files if we exceed maxLogFiles
      if (logFiles.length > this.maxLogFiles) {
        logFiles.slice(this.maxLogFiles).forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Error cleaning old logs:', error);
    }
  }

  private getLogFileName(level: LogLevel): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `${level.toLowerCase()}-${date}.log`);
  }

  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level}]`,
      `[${entry.context}]`,
      entry.message,
    ];

    if (entry.userId) {
      parts.push(`| User: ${entry.userId}`);
    }

    if (entry.ip) {
      parts.push(`| IP: ${entry.ip}`);
    }

    if (entry.data) {
      parts.push(`| Data: ${JSON.stringify(entry.data)}`);
    }

    if (entry.error) {
      parts.push(`| Error: ${entry.error.name} - ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`\nStack: ${entry.error.stack}`);
      }
    }

    return parts.join(' ');
  }

  private writeToFile(level: LogLevel, entry: LogEntry) {
    if (!this.isServer) return;

    try {
      const logFile = this.getLogFileName(level);
      const logLine = this.formatLogEntry(entry) + '\n';
      fs.appendFileSync(logFile, logLine, 'utf-8');

      // Also write to all.log for combined logs
      const allLogFile = this.getLogFileName(LogLevel.INFO).replace('info-', 'all-');
      fs.appendFileSync(allLogFile, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private log(level: LogLevel, context: string, message: string, additionalData?: Partial<LogEntry>) {
    const timestamp = new Date().toISOString();
    
    const entry: LogEntry = {
      timestamp,
      level,
      context,
      message,
      ...additionalData,
    };

    // Console output with colors
    const colors = {
      [LogLevel.INFO]: '\x1b[36m',    // Cyan
      [LogLevel.WARN]: '\x1b[33m',    // Yellow
      [LogLevel.ERROR]: '\x1b[31m',   // Red
      [LogLevel.DEBUG]: '\x1b[35m',   // Magenta
    };
    const resetColor = '\x1b[0m';

    console.log(`${colors[level]}${this.formatLogEntry(entry)}${resetColor}`);

    // Write to file
    this.writeToFile(level, entry);
  }

  info(context: string, message: string, data?: any) {
    this.log(LogLevel.INFO, context, message, { data });
  }

  warn(context: string, message: string, data?: any) {
    this.log(LogLevel.WARN, context, message, { data });
  }

  error(context: string, message: string, error?: Error | unknown, data?: any) {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack || undefined,
    } : error ? {
      name: 'Unknown Error',
      message: String(error),
      stack: undefined,
    } : undefined;

    this.log(LogLevel.ERROR, context, message, { error: errorData, data });
  }

  debug(context: string, message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, context, message, { data });
    }
  }

  // Specialized method for API errors with request context
  apiError(
    context: string,
    message: string,
    error: Error | unknown,
    options?: {
      userId?: string | undefined;
      ip?: string | undefined;
      userAgent?: string | undefined;
      requestBody?: any;
      requestParams?: any;
    }
  ) {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : {
      name: 'Unknown Error',
      message: String(error),
    };

    const additionalData = {
      error: errorData,
      userId: options?.userId,
      ip: options?.ip,
      userAgent: options?.userAgent,
      data: {
        requestBody: options?.requestBody,
        requestParams: options?.requestParams,
      },
    };

    this.log(LogLevel.ERROR, context, message, additionalData);
  }

  // Method to get logs for a specific date and level
  getLogs(date: string, level?: LogLevel): string[] {
    if (!this.isServer) return [];

    try {
      const fileName = level 
        ? `${level.toLowerCase()}-${date}.log`
        : `all-${date}.log`;
      
      const logFile = path.join(this.logDir, fileName);
      
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf-8');
      return content.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
      console.error('Error reading log file:', error);
      return [];
    }
  }

  // Method to search logs
  searchLogs(searchTerm: string, daysBack: number = 7): string[] {
    if (!this.isServer) return [];

    const results: string[] = [];
    const today = new Date();

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      if (!dateStr) continue;

      const logs = this.getLogs(dateStr);
      const matchingLogs = logs.filter(log => 
        log.toLowerCase().includes(searchTerm.toLowerCase())
      );

      results.push(...matchingLogs);
    }

    return results;
  }
}

// Export singleton instance
export const logger = new Logger();

// Helper function to extract request metadata
export function getRequestMetadata(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ip, userAgent };
}
