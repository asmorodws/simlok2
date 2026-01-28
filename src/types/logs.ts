/**
 * Logs related types
 */

export interface LogEntry {
  timestamp?: string;
  level?: string;
  context?: string;
  message?: string;
  raw: string;
}

export interface LogsResponse {
  startDate: string;
  endDate: string;
  level: string;
  total: number;
  logs: LogEntry[];
}
