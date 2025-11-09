'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  raw: string;
}

interface LogsResponse {
  date: string;
  level: string;
  total: number;
  logs: LogEntry[];
}

export default function LogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [daysBack, setDaysBack] = useState(7);
  const [total, setTotal] = useState(0);

  // Check authorization
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [session, status, router]);

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.append('search', searchTerm);
        params.append('daysBack', daysBack.toString());
      } else {
        if (selectedDate) {
          params.append('date', selectedDate);
        }
        if (selectedLevel !== 'ALL') {
          params.append('level', selectedLevel);
        }
      }

      const response = await fetch(`/api/logs?${params.toString()}`);
      const data: LogsResponse = await response.json();

      if (response.ok) {
        setLogs(data.logs);
        setTotal(data.total);
      } else {
        console.error('Failed to fetch logs:', data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'SUPER_ADMIN') {
      fetchLogs();
    }
  }, [selectedDate, selectedLevel, session]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const clearLogs = async () => {
    if (!confirm(`Are you sure you want to clear logs for ${selectedDate}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (response.ok) {
        alert('Logs cleared successfully');
        fetchLogs();
      } else {
        alert('Failed to clear logs');
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
      alert('Error clearing logs');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
      case 'WARN':
        return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950';
      case 'INFO':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950';
      case 'DEBUG':
        return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950';
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950';
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Logs
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage application logs
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ALL">All Levels</option>
                <option value="ERROR">Error</option>
                <option value="WARN">Warning</option>
                <option value="INFO">Info</option>
                <option value="DEBUG">Debug</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Days Back (Search)
              </label>
              <input
                type="number"
                value={daysBack}
                onChange={(e) => setDaysBack(parseInt(e.target.value))}
                min="1"
                max="30"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actions
              </label>
              <button
                onClick={clearLogs}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Clear Logs
              </button>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total logs: <span className="font-bold text-gray-900 dark:text-white">{total}</span>
          </p>
        </div>

        {/* Logs List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <div className="flex items-start gap-4">
                    {/* Level Badge */}
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getLevelColor(
                        log.level
                      )}`}
                    >
                      {log.level}
                    </span>

                    {/* Log Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {log.timestamp}
                        </span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          [{log.context}]
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white font-mono break-all">
                        {log.message}
                      </p>
                      {log.raw !== log.message && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            Show raw log
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                            {log.raw}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
