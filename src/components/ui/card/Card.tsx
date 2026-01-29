"use client";
import type { ReactNode } from "react";
import { DocumentIcon } from '@heroicons/react/24/outline';

// Base Card (original functionality)
export default function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "info" | "note";
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

// InfoCard (merged from InfoCard.tsx)
interface InfoCardProps {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
  copyable?: boolean;
  className?: string;
  valueClassName?: string;
}

export function InfoCard({
  label,
  value,
  icon,
  copyable = false,
  className = '',
  valueClassName = ''
}: InfoCardProps) {
  const handleCopy = async () => {
    if (copyable && typeof value === 'string') {
      try {
        await navigator.clipboard.writeText(value);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center space-x-2">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <label className="text-sm font-semibold text-gray-700">
          {label}
        </label>
      </div>
      
      <div className={`group relative ${copyable ? 'cursor-pointer' : ''}`} onClick={copyable ? handleCopy : undefined}>
        {typeof value === 'string' ? (
          <p className={`text-sm font-normal text-gray-900 ${copyable ? 'hover:text-blue-600' : ''} ${valueClassName}`}>
            {value || '-'}
          </p>
        ) : (
          <div className={valueClassName}>
            {value}
          </div>
        )}
        
        {copyable && typeof value === 'string' && value && (
          <span className="absolute top-0 left-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500">
            Klik untuk copy
          </span>
        )}
      </div>
    </div>
  );
}

// NoteCard (merged from NoteCard.tsx)
interface NoteCardProps {
  title?: string;
  note?: string | null;
  className?: string;
}

export function NoteCard({ title = 'Catatan', note, className = '' }: NoteCardProps) {
  if (!note) return null;

  return (
    <div className={`w-full bg-white border border-gray-100 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5 mr-3">
          <DocumentIcon className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-800 mb-1">{title}</h4>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {note}
          </div>
        </div>
      </div>
    </div>
  );
}