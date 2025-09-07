'use client';

import { useState } from 'react';
import { 
  XMarkIcon, 
  ArrowDownTrayIcon, 
  CalendarIcon,
  DocumentArrowDownIcon 
} from '@heroicons/react/24/outline';
import { exportSubmissionsToExcel } from '@/lib/exportToExcel';
import Button from '@/components/ui/button/Button';
import DatePicker from '@/components/form/DatePicker';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportStatus, setExportStatus] = useState<'success' | 'error' | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage('');
    setExportStatus(null);

    try {
      // Fetch submissions data
      const response = await fetch('/api/admin/submissions/export');
      if (!response.ok) {
        throw new Error('Failed to fetch submissions data');
      }

      const data = await response.json();
      
      // Export to Excel
      const result = exportSubmissionsToExcel(data.submissions, {
        dateFrom: dateFrom || '',
        dateTo: dateTo || '',
        filename: `submissions_export_${dateFrom || 'all'}_${dateTo || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`
      });

      if (result.success) {
        setExportStatus('success');
        setExportMessage(`${result.message}. Total data: ${result.totalData} submissions.`);
      } else {
        setExportStatus('error');
        setExportMessage(result.message);
      }

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
      setExportMessage('Gagal mengexport data. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  const resetForm = () => {
    setDateFrom('');
    setDateTo('');
    setExportMessage('');
    setExportStatus(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <DocumentArrowDownIcon className="h-6 w-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Export Data Submissions
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
              title="Tutup Modal"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Pilih rentang tanggal untuk filter data submissions. Kosongkan untuk export semua data.
                </p>
              </div>

              {/* Date Range Picker */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Dari
                  </label>
                  <div className="relative">
                    <DatePicker
                      value={dateFrom}
                      onChange={setDateFrom}
                      placeholder="Pilih tanggal dari"
                      className="w-full"
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Sampai
                  </label>
                  <div className="relative">
                    <DatePicker
                      value={dateTo}
                      onChange={setDateTo}
                      placeholder="Pilih tanggal sampai"
                      className="w-full"
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start">
                  <DocumentArrowDownIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Format Export:</p>
                    <ul className="text-xs space-y-1">
                      <li>• File Excel (.xlsx)</li>
                      <li>• Data lengkap submissions</li>
                      <li>• Summary sheet dengan info filter</li>
                      <li>• Auto-download ke folder Downloads</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Export Message */}
              {exportMessage && (
                <div className={`p-3 rounded-lg ${
                  exportStatus === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <p className="text-sm">{exportMessage}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            {/* <div className="text-sm text-gray-500">
              {dateFrom || dateTo ? (
                <>Filter: {dateFrom || '...'} s/d {dateTo || '...'}</>
              ) : (
                'Export semua data'
              )}
            </div> */}
            
              <Button
                onClick={resetForm}
                variant="outline"
                size="sm"
                disabled={isExporting}
              >
                Reset
              </Button>
              
              <Button
                onClick={handleExport}
                variant="primary"
                size="sm"
                disabled={isExporting}
                className="flex items-center"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export Excel
                  </>
                )}
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
