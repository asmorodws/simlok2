'use client';

import React from 'react';

type Accent =
  | 'blue'
  | 'green'
  | 'red'
  | 'amber'
  | 'purple'
  | 'indigo'
  | 'gray';

const accentMap: Record<
  Accent,
  { text: string; bg: string; ring: string; pill: string }
> = {
  blue:   { text: 'text-blue-600',   bg: 'bg-blue-100',   ring: 'ring-blue-200',   pill: 'text-blue-700 bg-blue-50' },
  green:  { text: 'text-green-600',  bg: 'bg-green-100',  ring: 'ring-green-200',  pill: 'text-green-700 bg-green-50' },
  red:    { text: 'text-red-600',    bg: 'bg-red-100',    ring: 'ring-red-200',    pill: 'text-red-700 bg-red-50' },
  amber:  { text: 'text-amber-600',  bg: 'bg-amber-100',  ring: 'ring-amber-200',  pill: 'text-amber-700 bg-amber-50' },
  purple: { text: 'text-purple-600', bg: 'bg-purple-100', ring: 'ring-purple-200', pill: 'text-purple-700 bg-purple-50' },
  indigo: { text: 'text-indigo-600', bg: 'bg-indigo-100', ring: 'ring-indigo-200', pill: 'text-indigo-700 bg-indigo-50' },
  gray:   { text: 'text-gray-600',   bg: 'bg-gray-100',   ring: 'ring-gray-200',   pill: 'text-gray-700 bg-gray-50' },
};

export interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  accent?: Accent;
  /** subtitle kecil di bawah title (opsional) */
  hint?: string;
  /** delta: +12% / -3 / dst (opsional) */
  deltaText?: string;
  /** up | down | neutral (opsional) */
  deltaTrend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  accent = 'gray',
  hint,
  deltaText,
  deltaTrend = 'neutral',
  className = '',
}: StatCardProps) {
  const a = accentMap[accent];

  const deltaColor =
    deltaTrend === 'up'
      ? 'text-green-700 bg-green-50'
      : deltaTrend === 'down'
      ? 'text-red-700 bg-red-50'
      : 'text-gray-700 bg-gray-50';

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
          {hint && <p className="text-xs text-gray-400 mt-0.5 truncate">{hint}</p>}
          <p className={`text-2xl font-bold mt-2 ${a.text}`}>{value}</p>
        </div>
        {icon ? (
          <div className={`p-3 rounded-full ${a.bg} ring-1 ${a.ring}`}>
            {icon}
          </div>
        ) : null}
      </div>

      {typeof deltaText !== 'undefined' && deltaText !== '' && (
        <div
          className={`inline-flex items-center gap-1 text-xs font-medium mt-3 px-2 py-1 rounded-full ${deltaColor}`}
        >
          {deltaTrend === 'up' && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 12l7-7 7 7H3z" />
            </svg>
          )}
          {deltaTrend === 'down' && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17 8l-7 7-7-7h14z" />
            </svg>
          )}
          <span>{deltaText}</span>
        </div>
      )}
    </div>
  );
}
