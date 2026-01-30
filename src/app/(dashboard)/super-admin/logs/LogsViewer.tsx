'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Download, Trash2, X, Search, Filter, Play, Pause, Wifi, WifiOff } from 'lucide-react';
import DateRangePicker from '@/components/form/DateRangePicker';

interface LogEntry {
  timestamp?: string;
  level?: string;
  context?: string;
  message?: string;
  raw: string;
}

interface LogsResponse {
  startDate: string;
  endDate: string;
  level: string;
  total: number;
  logs: LogEntry[];
}

type LogLevel = 'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

// Auto-refresh intervals
const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '1m', value: 60000 },
];

export default function LogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || ''
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0] || ''
  );
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  // 🔄 Auto-refresh state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0); // 0 = off
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // 📡 Live streaming state (SSE)
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [newLogsCount, setNewLogsCount] = useState(0);

  // Fetch logs
  const fetchLogs = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.set('search', searchTerm);
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      } else {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
        if (selectedLevel !== 'ALL') {
          params.set('level', selectedLevel);
        }
      }

      const response = await fetch(`/api/logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data: LogsResponse = await response.json();
      setLogs(data.logs);
      setCurrentPage(1);
      setLastRefresh(new Date());
      setNewLogsCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedLevel, searchTerm]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchLogs();
  }, []);

  // 🔄 Auto-refresh effect
  useEffect(() => {
    // Clear existing interval
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    // Set new interval if enabled
    if (autoRefreshInterval > 0) {
      autoRefreshRef.current = setInterval(() => {
        fetchLogs(false); // Silent refresh (no loading spinner)
      }, autoRefreshInterval);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefreshInterval, fetchLogs]);

  // 📡 Live streaming (SSE) effect
  useEffect(() => {
    if (isLiveStreaming) {
      // Connect to SSE endpoint
      const eventSource = new EventSource('/api/logs/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[LogsViewer] SSE connected');
        setStreamConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const newLog = JSON.parse(event.data) as LogEntry;
          
          // Check if log matches current filter
          const matchesLevel = selectedLevel === 'ALL' || newLog.level?.toUpperCase() === selectedLevel;
          const matchesSearch = !searchTerm || newLog.raw.toLowerCase().includes(searchTerm.toLowerCase());
          
          if (matchesLevel && matchesSearch) {
            setLogs(prev => [newLog, ...prev]); // Add to top
            setNewLogsCount(prev => prev + 1);
          }
        } catch (err) {
          console.error('[LogsViewer] Failed to parse SSE message:', err);
        }
      };

      eventSource.onerror = () => {
        console.error('[LogsViewer] SSE connection error');
        setStreamConnected(false);
        // Attempt reconnect after 3 seconds
        setTimeout(() => {
          if (isLiveStreaming && eventSourceRef.current) {
            eventSourceRef.current.close();
            setIsLiveStreaming(false);
            setTimeout(() => setIsLiveStreaming(true), 100);
          }
        }, 3000);
      };

      return () => {
        eventSource.close();
        setStreamConnected(false);
      };
    } else {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setStreamConnected(false);
      }
      return undefined;
    }
  }, [isLiveStreaming, selectedLevel, searchTerm]);

  // Download logs as text file
  const handleDownload = () => {
    const logText = logs.map(log => log.raw).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${startDate}-to-${endDate}-${selectedLevel}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear logs
  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear logs? This cannot be undone!')) {
      return;
    }

    try {
      const response = await fetch('/api/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (response.ok) {
        alert('Logs cleared successfully');
        fetchLogs();
      } else {
        alert('Failed to clear logs');
      }
    } catch (err) {
      alert('Error clearing logs');
    }
  };

  // Get color for log level
  const getLevelColor = (level?: string) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'WARN':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'INFO':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'DEBUG':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  // Pagination
  const totalPages = Math.ceil(logs.length / logsPerPage);
  const paginatedLogs = logs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  return (
    <div className="space-y-4">
      {/* Real-time Controls */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Live Streaming Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                  isLiveStreaming
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {isLiveStreaming ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Stop Live
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Live
                  </>
                )}
              </button>
              {isLiveStreaming && (
                <div className="flex items-center gap-1.5 text-sm">
                  {streamConnected ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-500 animate-pulse" />
                      <span className="text-green-600 dark:text-green-400">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400">Connecting...</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Auto-refresh Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                disabled={isLiveStreaming}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                {REFRESH_INTERVALS.map(({ label, value }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4 text-sm">
            {newLogsCount > 0 && (
              <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-medium animate-pulse">
                +{newLogsCount} new
              </span>
            )}
            {lastRefresh && (
              <span className="text-gray-500 dark:text-gray-400">
                Last updated: {lastRefresh.toLocaleTimeString('id-ID')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Date Range Filter */}
          <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Date Range
            </label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>

          {/* Level Filter */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Level
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as LogLevel)}
                disabled={!!searchTerm}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed appearance-none transition"
              >
                <option value="ALL">All Levels</option>
                <option value="ERROR">Error</option>
                <option value="WARN">Warning</option>
                <option value="INFO">Info</option>
                <option value="DEBUG">Debug</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Search Logs
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search in date range..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1 flex items-end">
            <button
              onClick={() => fetchLogs()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={handleClearLogs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear Logs
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total: <span className="font-semibold text-gray-700 dark:text-gray-300">{logs.length}</span> logs
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Logs Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Log Entries
              {searchTerm && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  (searching for "{searchTerm}")
                </span>
              )}
            </h2>
            {logs.length > 0 && (
              <div className="flex gap-3 text-xs">
                {(['ERROR', 'WARN', 'INFO', 'DEBUG'] as const).map((level) => {
                  const count = logs.filter((log) => log.level?.toUpperCase() === level).length;
                  if (count === 0) return null;
                  const colorClass = getLevelColor(level);
                  const bgColor = colorClass.split(' ')[0]?.replace('text-', 'bg-') || 'bg-gray-500';
                  return (
                    <div key={level} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${bgColor}`}></span>
                      <span className="text-gray-600 dark:text-gray-400">{level}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm">No logs found for the selected filters</p>
          </div>
        ) : (
          <>
            {/* Logs List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  {log.timestamp && log.level && log.context ? (
                    // Parsed log
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-gray-500 dark:text-gray-400 font-mono">
                          {new Date(log.timestamp).toLocaleString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(log.level)}`}
                        >
                          {log.level}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                          {log.context}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 break-words pl-1">
                        {log.message}
                      </div>
                    </div>
                  ) : (
                    // Raw log (fallback)
                    <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-mono">
                      {log.raw}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-600 dark:text-gray-400">
                    Showing {(currentPage - 1) * logsPerPage + 1} to{' '}
                    {Math.min(currentPage * logsPerPage, logs.length)} of {logs.length}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-gray-700 dark:text-gray-300"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1.5 text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-gray-700 dark:text-gray-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
