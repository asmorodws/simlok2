/**
 * Reusable Empty State Component
 * Can be used throughout the application for consistent empty state UI
 */

import { 
  FolderOpenIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  DocumentTextIcon,
  UserGroupIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { ReactNode } from 'react';
import Link from 'next/link';

export type EmptyStateIcon = 'folder' | 'search' | 'inbox' | 'document' | 'users' | 'custom';

interface EmptyStateProps {
  icon?: EmptyStateIcon;
  customIcon?: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
  children?: ReactNode;
}

const iconMap = {
  folder: FolderOpenIcon,
  search: MagnifyingGlassIcon,
  inbox: InboxIcon,
  document: DocumentTextIcon,
  users: UserGroupIcon,
};

export default function EmptyState({
  icon = 'inbox',
  customIcon,
  title = 'Tidak Ada Data',
  description = 'Belum ada data yang tersedia saat ini.',
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  variant = 'default',
  className = '',
  children,
}: EmptyStateProps) {
  const IconComponent = icon !== 'custom' && customIcon === undefined ? iconMap[icon] : null;

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`text-center py-8 ${className}`}>
        {customIcon || (IconComponent && (
          <IconComponent className="mx-auto h-8 w-8 text-gray-400" />
        ))}
        <p className="mt-2 text-sm text-gray-600">{title}</p>
        {actionLabel && (
          <div className="mt-3">
            {actionHref ? (
              <Link
                href={actionHref}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {actionLabel}
              </Link>
            ) : onAction ? (
              <button
                onClick={onAction}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {actionLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`text-center py-8 px-4 ${className}`}>
        <div className="inline-flex items-center justify-center p-2 bg-gray-100 rounded-lg mb-3">
          {customIcon || (IconComponent && (
            <IconComponent className="h-6 w-6 text-gray-400" />
          ))}
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">{description}</p>
        )}
        {children}
        {(actionLabel || secondaryActionLabel) && (
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
            {actionLabel && (
              actionHref ? (
                <Link
                  href={actionHref}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1.5" />
                  {actionLabel}
                </Link>
              ) : onAction ? (
                <button
                  onClick={onAction}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1.5" />
                  {actionLabel}
                </button>
              ) : null
            )}
            {secondaryActionLabel && (
              secondaryActionHref ? (
                <Link
                  href={secondaryActionHref}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {secondaryActionLabel}
                </Link>
              ) : onSecondaryAction ? (
                <button
                  onClick={onSecondaryAction}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {secondaryActionLabel}
                </button>
              ) : null
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant - full featured
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="inline-flex items-center justify-center p-3 bg-gray-100 rounded-full mb-4">
        {customIcon || (IconComponent && (
          <IconComponent className="h-10 w-10 text-gray-400" />
        ))}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      
      {description && (
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      )}

      {children}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          {actionLabel && (
            actionHref ? (
              <Link
                href={actionHref}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {actionLabel}
              </Link>
            ) : onAction ? (
              <button
                onClick={onAction}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {actionLabel}
              </button>
            ) : null
          )}
          
          {secondaryActionLabel && (
            secondaryActionHref ? (
              <Link
                href={secondaryActionHref}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
              >
                {secondaryActionLabel}
              </Link>
            ) : onSecondaryAction ? (
              <button
                onClick={onSecondaryAction}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
              >
                {secondaryActionLabel}
              </button>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
