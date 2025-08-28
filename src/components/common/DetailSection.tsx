'use client';

import { ReactNode } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface DetailSectionProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  badge?: ReactNode;
  className?: string;
}

export default function DetailSection({
  title,
  children,
  icon,
  defaultOpen = true,
  collapsible = false,
  badge,
  className = ''
}: DetailSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div 
        className={`flex items-center justify-between p-4 ${
          collapsible ? 'cursor-pointer hover:bg-gray-50' : ''
        } border-b border-gray-100`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center space-x-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>
        
        {collapsible && (
          <div className="flex-shrink-0">
            {isOpen ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-500" />
            )}
          </div>
        )}
      </div>
      
      {(!collapsible || isOpen) && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}
