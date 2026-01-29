/**
 * Reusable Tab Navigation Component
 * Used by SubmissionDetailModals across different roles
 */

import React from 'react';

export interface TabItem {
  key: string;
  label: string;
  shortLabel?: string; // For mobile
  icon: React.ComponentType<{ className?: string }>;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  className?: string;
}

export default function TabNavigation({ tabs, activeTab, onTabChange, className = '' }: TabNavigationProps) {
  return (
    <nav className={`flex space-x-1 sm:space-x-4 border-b border-gray-200 ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
              isActive
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.shortLabel && <span className="sm:hidden">{tab.shortLabel}</span>}
          </button>
        );
      })}
    </nav>
  );
}
