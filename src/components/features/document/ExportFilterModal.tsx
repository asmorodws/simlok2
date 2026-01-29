'use client';

import { useState, useEffect } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import BaseModal from '@/components/ui/modal/BaseModal';
import Button from '@/components/ui/button/Button';
import { DateRangePicker } from '@/components/ui/input';

interface ExportFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (filters: { startDate: string; endDate: string }) => void;
  currentFilters?: { startDate: string; endDate: string };
  exportLoading?: boolean;
}

export default function ExportFilterModal({
  isOpen,
  onClose,
  onExport,
  currentFilters,
  exportLoading = false,
}: ExportFilterModalProps) {
  const [startDate, setStartDate] = useState<string>(currentFilters?.startDate || '');
  const [endDate, setEndDate] = useState<string>(currentFilters?.endDate || '');

  useEffect(() => {
    if (isOpen) {
      setStartDate(currentFilters?.startDate || '');
      setEndDate(currentFilters?.endDate || '');
    }
  }, [isOpen, currentFilters]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport({ startDate, endDate });
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasFilters = startDate || endDate;

  const icon = (
    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
      <ArrowDownTrayIcon className="h-5 w-5 text-green-600" />
    </div>
  );

  const footer = (
    <div className="flex justify-between items-center w-full">
      {hasFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Reset Filter
        </button>
      )}
      <div className={`flex gap-3 ${!hasFilters ? 'ml-auto' : ''}`}>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={exportLoading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          onClick={handleSubmit}
          disabled={exportLoading}
        >
          {exportLoading ? 'Exporting...' : (
            <>
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export Excel
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Data Permohonan"
      subtitle="Pilih rentang tanggal untuk data yang akan di-export"
      icon={icon}
      footer={footer}
      size="md"
      closeOnBackdrop={!exportLoading}
      closeOnEscape={!exportLoading}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rentang Tanggal (Opsional)
          </label>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            {hasFilters ? (
              <>
                Data akan di-export untuk rentang tanggal{' '}
                <strong>
                  {startDate ? new Date(startDate).toLocaleDateString('id-ID') : 'Awal'} -{' '}
                  {endDate ? new Date(endDate).toLocaleDateString('id-ID') : 'Akhir'}
                </strong>
              </>
            ) : (
              'Semua data permohonan akan di-export (tanpa filter tanggal)'
            )}
          </p>
        </div>

        <div className="text-sm text-gray-600">
          <p className="mb-1">
            <strong>Catatan:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            <li>Export akan mencakup semua kolom data permohonan</li>
            <li>Format file: Excel (.xlsx)</li>
            <li>Filter tanggal bersifat opsional</li>
          </ul>
        </div>
      </form>
    </BaseModal>
  );
}
