'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import Button from '@/components/ui/button/Button';
import DateRangePicker from '@/components/form/DateRangePicker';

interface ExportFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (filters: ExportFilters) => void;
  currentFilters: ExportFilters;
  exportLoading: boolean;
}

export interface ExportFilters {
  search: string;
  reviewStatus: string;
  finalStatus: string;
  startDate: string;
  endDate: string;
}

export default function ExportFilterModal({
  isOpen,
  onClose,
  onExport,
  currentFilters,
  exportLoading
}: ExportFilterModalProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Reset dates when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Include current page filters but only use dates from modal
    onExport({
      search: currentFilters.search,
      reviewStatus: currentFilters.reviewStatus,
      finalStatus: currentFilters.finalStatus,
      startDate: startDate,
      endDate: endDate
    });
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasDateFilter = startDate || endDate;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ArrowDownTrayIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Export ke Excel</h2>
              <p className="text-sm text-gray-500">Pilih rentang tanggal untuk export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={exportLoading}
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                Filter Rentang Tanggal (Opsional)
              </label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(value) => setStartDate(value)}
                onEndDateChange={(value) => setEndDate(value)}
              />
              <p className="text-xs text-gray-500 mt-2">
                Kosongkan kedua field untuk export semua data
              </p>
            </div>

            {/* Info Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                {hasDateFilter ? (
                  <div>
                    <div className="font-medium mb-1">Export dengan filter:</div>
                    <div>
                      Tanggal: {
                        startDate && endDate 
                          ? `${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`
                          : startDate
                          ? `Dari ${new Date(startDate).toLocaleDateString('id-ID')}`
                          : `Sampai ${new Date(endDate).toLocaleDateString('id-ID')}`
                      }
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">Export data SIMLOK ke Excel</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3 justify-end">
              {hasDateFilter && (
                <Button
                  type="button"
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  disabled={exportLoading}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  Reset Tanggal
                </Button>
              )}
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                disabled={exportLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={exportLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                {exportLoading ? 'Mengekspor...' : 'Export Excel'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}