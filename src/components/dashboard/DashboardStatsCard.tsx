/**
 * DashboardStatsCard Component
 * Reusable stats card for dashboard pages
 * 
 * Replaces duplicate stat card logic across 6 dashboard pages:
 * - SuperAdmin, Reviewer, Approver, Verifier, Vendor, Visitor dashboards
 * 
 * @example
 * <DashboardStatsCard
 *   title="Total Users"
 *   value={stats.totalUsers}
 *   icon={UserIcon}
 *   color="blue"
 * />
 */

'use client';

import { ReactNode } from 'react';

export type StatsCardColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'gray';

interface DashboardStatsCardProps {
  /** Card title */
  title: string;
  
  /** Main value to display */
  value: number | string;
  
  /** Optional subtitle or additional info */
  subtitle?: string;
  
  /** Icon component from @heroicons/react */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  
  /** Color theme */
  color?: StatsCardColor;
  
  /** Optional link href */
  href?: string;
  
  /** Optional click handler */
  onClick?: () => void;
  
  /** Optional badge/tag */
  badge?: ReactNode;
  
  /** Loading state */
  loading?: boolean;
  
  /** Custom className */
  className?: string;
}

const colorVariants: Record<StatsCardColor, {
  bg: string;
  iconBg: string;
  iconText: string;
  borderFocus: string;
}> = {
  blue: {
    bg: 'bg-white hover:bg-blue-50',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    borderFocus: 'focus:ring-blue-500',
  },
  green: {
    bg: 'bg-white hover:bg-green-50',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    borderFocus: 'focus:ring-green-500',
  },
  yellow: {
    bg: 'bg-white hover:bg-yellow-50',
    iconBg: 'bg-yellow-100',
    iconText: 'text-yellow-600',
    borderFocus: 'focus:ring-yellow-500',
  },
  red: {
    bg: 'bg-white hover:bg-red-50',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    borderFocus: 'focus:ring-red-500',
  },
  purple: {
    bg: 'bg-white hover:bg-purple-50',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    borderFocus: 'focus:ring-purple-500',
  },
  indigo: {
    bg: 'bg-white hover:bg-indigo-50',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    borderFocus: 'focus:ring-indigo-500',
  },
  gray: {
    bg: 'bg-white hover:bg-gray-50',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    borderFocus: 'focus:ring-gray-500',
  },
};

export default function DashboardStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  href,
  onClick,
  badge,
  loading = false,
  className = '',
}: DashboardStatsCardProps) {
  const colors = colorVariants[color];

  const content = (
    <>
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colors.iconBg}`}>
          <Icon className={`w-6 h-6 ${colors.iconText}`} />
        </div>
        {badge && <div>{badge}</div>}
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {loading ? (
          <div className="mt-1 h-8 w-20 bg-gray-200 animate-pulse rounded" />
        ) : (
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        )}
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    </>
  );

  const baseClassName = `
    p-6 rounded-xl border border-gray-200 shadow-sm transition-all duration-200
    ${colors.bg}
    ${className}
  `;

  if (href) {
    return (
      <a
        href={href}
        className={`
          ${baseClassName}
          cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.borderFocus}
        `}
      >
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className={`
          ${baseClassName}
          cursor-pointer text-left w-full
          focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.borderFocus}
          disabled:cursor-not-allowed disabled:opacity-60
        `}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={baseClassName}>
      {content}
    </div>
  );
}
