/**
 * Reusable Status Cards Component
 * Displays submission status information in a consistent format
 */

import React from 'react';
import { formatDate } from '@/components/features/submission/shared/SubmissionDetailShared';

export interface StatusCardData {
  label: string;
  content: React.ReactNode;
}

interface StatusCardsProps {
  cards: StatusCardData[];
  className?: string;
}

export default function StatusCards({ cards, className = '' }: StatusCardsProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(cards.length, 3)} gap-3 ${className}`}>
      {cards.map((card, index) => (
        <div key={index} className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
          <div className="flex items-center justify-between sm:flex-col sm:items-start sm:space-y-1">
            <span className="text-xs text-gray-500 font-medium">{card.label}</span>
            <div className="text-sm font-semibold text-gray-900 sm:mt-1">{card.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Specific Status Cards for Submission Details
 */
interface SubmissionStatusCardsProps {
  createdAt: string;
  reviewStatusBadge: React.ReactNode;
  approvalStatusBadge: React.ReactNode;
  className?: string;
}

export function SubmissionStatusCards({
  createdAt,
  reviewStatusBadge,
  approvalStatusBadge,
  className = ''
}: SubmissionStatusCardsProps) {
  const cards: StatusCardData[] = [
    {
      label: 'Tanggal Pengajuan',
      content: formatDate(createdAt),
    },
    {
      label: 'Status Review',
      content: reviewStatusBadge,
    },
    {
      label: 'Status Persetujuan',
      content: approvalStatusBadge,
    },
  ];

  return <StatusCards cards={cards} className={className} />;
}
