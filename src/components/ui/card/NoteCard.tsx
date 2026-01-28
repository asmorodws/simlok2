"use client";

import React from 'react';
import { DocumentIcon } from '@heroicons/react/24/outline';

interface NoteCardProps {
  title?: string;
  note?: string | null;
  className?: string;
}

export default function NoteCard({ title = 'Catatan', note, className = '' }: NoteCardProps) {
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
