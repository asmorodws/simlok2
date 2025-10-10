'use client';

import React from 'react';
import { ArrowPathIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';

interface RefreshIndicatorProps {
  isActive: boolean;
  timeUntilNext: number;
  onToggle: () => void;
  onRefresh: () => void;
  className?: string;
}

export default function RefreshIndicator({
  isActive,
  timeUntilNext,
  onToggle,
  onRefresh,
  className = ''
}: RefreshIndicatorProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {/* Auto-refresh toggle button */}
      <button
        onClick={onToggle}
        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${
          isActive
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title={isActive ? 'Matikan auto-refresh' : 'Aktifkan auto-refresh'}
      >
        {isActive ? (
          <PauseIcon className="h-3 w-3 mr-1" />
        ) : (
          <PlayIcon className="h-3 w-3 mr-1" />
        )}
        Auto-refresh
      </button>

      {/* Countdown timer */}
      {isActive && timeUntilNext > 0 && (
        <span className="text-xs text-gray-500">
          {formatTime(timeUntilNext)}
        </span>
      )}

      {/* Manual refresh button */}
      <button
        onClick={onRefresh}
        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
        title="Refresh manual"
      >
        <ArrowPathIcon className="h-3 w-3 mr-1" />
        Refresh
      </button>
    </div>
  );
}