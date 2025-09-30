'use client';

import { ReactNode } from 'react';

interface InfoCardProps {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
  copyable?: boolean;
  className?: string;
  valueClassName?: string;
}

export default function InfoCard({
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
        // You could add a toast notification here
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
