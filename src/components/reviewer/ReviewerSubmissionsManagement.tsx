'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import Button from '@/components/ui/button/Button';
import { useToast } from '@/hooks/useToast';
import ReviewerSubmissionDetailModal from './ReviewerSubmissionDetailModal';
import ExportFilterModal, { ExportFilters } from './ExportFilterModal';
import { useSocket } from '@/components/common/RealtimeUpdates';
import ReviewerTable, { ReviewerSubmission } from '@/components/reviewer/ReviewerTable';

interface SubmissionsResponse {
  submissions: ReviewerSubmission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ReviewerSubmissionsManagement() {
  const [submissions, setSubmissions] = useState<ReviewerSubmission[]>([]);
  const [_loading, setLoading] = useState(true);
  const { showError } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<ReviewerSubmission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('');
  const [finalStatusFilter, setFinalStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  const socket = useSocket();

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
      });
      if (searchTerm) params.append('search', searchTerm);
      if (reviewStatusFilter) params.append('reviewStatus', reviewStatusFilter);
      if (finalStatusFilter) params.append('finalStatus', finalStatusFilter);

      const response = await fetch(`/api/submissions?${params}`);
      if (!response.ok) throw new Error('Gagal mengambil data pengajuan');

      const data: SubmissionsResponse = await response.json();
      setSubmissions(data.submissions ?? []);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      showError('Gagal Memuat Data', 'Tidak dapat mengambil data pengajuan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, reviewStatusFilter, finalStatusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      fetchSubmissions();
    };
    socket.emit('join', { role: 'REVIEWER' });
    socket.on('submission:created', refresh);
    socket.on('submission:reviewed', refresh);
    socket.on('submission:approved', refresh);
    socket.on('submission:rejected', refresh);
    return () => {
      socket.off('submission:created', refresh);
      socket.off('submission:reviewed', refresh);
      socket.off('submission:approved', refresh);
      socket.off('submission:rejected', refresh);
    };
  }, [socket, fetchSubmissions]);

  // Listen to custom events untuk refresh data submissions list dari notification panel
  useEffect(() => {
    const handleSubmissionsRefresh = () => {
      console.log('🔄 Reviewer submissions list received refresh event');
      fetchSubmissions();
    };

    window.addEventListener('reviewer-dashboard-refresh', handleSubmissionsRefresh);
    
    return () => {
      window.removeEventListener('reviewer-dashboard-refresh', handleSubmissionsRefresh);
    };
  }, [fetchSubmissions]);

  const handleExportToExcel = async (filters: ExportFilters) => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.reviewStatus) params.append('reviewStatus', filters.reviewStatus);
      if (filters.finalStatus) params.append('finalStatus', filters.finalStatus);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/submissions/export?${params}`);
      if (!response.ok) {
        // Try to parse JSON error body
        let errBody: any = null;
        try { errBody = await response.json(); } catch (e) { /* ignore */ }
        if (errBody?.error === 'NO_DATA') {
          showError('Tidak ada data', 'Tidak ada data untuk rentang tanggal atau filter yang dipilih.');
          return;
        }
        throw new Error('Gagal mengekspor data');
      }

      // Get filename from server headers (most reliable)
      const contentDisposition = response.headers.get('Content-Disposition');
      const excelFilenameHeader = response.headers.get('X-Excel-Filename');
      
      let filename = 'simlok_export.xlsx'; // Default fallback
      
      // Try custom header first (most reliable)
      if (excelFilenameHeader) {
        filename = excelFilenameHeader;
        console.log(' Excel filename from X-Excel-Filename header:', filename);
      } else if (contentDisposition) {
        // Parse from Content-Disposition header
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
          console.log(' Excel filename from Content-Disposition:', filename);
        }
      }

      console.log('📥 Downloading Excel file:', filename);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (e) {
      console.error(e);
      showError('Gagal Mengekspor Data', 'Tidak dapat mengekspor data ke Excel. Silakan coba lagi.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Toolbar */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Review Pengajuan</h1>
            <p className="text-sm text-gray-500 mt-1">Kelola dan review pengajuan SIMLOK</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowExportModal(true)}
              disabled={exportLoading}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan nama vendor, deskripsi pekerjaan, atau penanggung jawab..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 md:w-auto">
            <select
              value={reviewStatusFilter}
              onChange={(e) => { setReviewStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
            >
              <option value="">Semua Status Review</option>
              <option value="PENDING_REVIEW">Menunggu Review</option>
              <option value="MEETS_REQUIREMENTS">Memenuhi Syarat</option>
              <option value="NOT_MEETS_REQUIREMENTS">Tidak Memenuhi Syarat</option>
            </select>
            <select
              value={finalStatusFilter}
              onChange={(e) => { setFinalStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
            >
              <option value="">Semua Status Akhir</option>
              <option value="PENDING_APPROVAL">Menunggu Persetujuan</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
        </div>
      </div>

      <ReviewerTable
        mode="management"
        data={submissions}
        loading={_loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => { setSortBy(String(field)); setSortOrder(order); setCurrentPage(1); }}
        page={pagination.page}
        pages={pagination.pages}
        limit={pagination.limit}
        total={pagination.total}
        onPageChange={(p: number) => setCurrentPage(p)}
        onOpenDetail={(id) => {
          const s = submissions.find((x) => x.id === id);
          if (!s) return;
          setSelectedSubmission(s);
          setShowDetailModal(true);
        }}
        reviewLabel="Review"
        viewLabel="Lihat"
      />

      <ExportFilterModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportToExcel}
        currentFilters={{
          search: searchTerm,
          reviewStatus: reviewStatusFilter,
          finalStatus: finalStatusFilter,
          startDate: '',
          endDate: ''
        }}
        exportLoading={exportLoading}
      />

      {showDetailModal && selectedSubmission && (
        <ReviewerSubmissionDetailModal
          key={selectedSubmission.id}
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedSubmission(null); }}
          submissionId={selectedSubmission.id}
          onReviewSubmitted={() => { 
            fetchSubmissions(); 
          }}
        />
      )}
    </div>
  );
}
