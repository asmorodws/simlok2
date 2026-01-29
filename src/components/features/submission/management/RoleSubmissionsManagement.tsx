/**
 * Unified Role-based Submissions Management Component
 * Supports APPROVER and REVIEWER roles with role-specific features
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import Button from '@/components/ui/button/Button';
import { useToast } from '@/hooks/useToast';
import { UnifiedSubmissionDetailModal } from '@/components/features/submission';
import ExportFilterModal from '@/components/features/document/ExportFilterModal';
import UnifiedSubmissionTable from '@/components/features/submission/UnifiedSubmissionTable';
import { ApproverTableSkeleton, ReviewerTableSkeleton } from '@/components/ui/loading';
import { PageSkeleton } from '@/components/ui/loading';
import type { ApproverSubmission, ReviewerSubmission, BaseSubmission } from '@/types';
import {
  EmptyState,
  type SubmissionsResponse,
  type FilterState,
  buildSubmissionsParams,
} from '../SubmissionsManagementShared';

// Extended submission types for each role
type RoleSubmission = ApproverSubmission | ReviewerSubmission;

interface RoleSubmissionsManagementProps {
  role: 'APPROVER' | 'REVIEWER';
}

// Approver-specific empty state content
function ApproverEmptyContent() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-blue-900">Vendor Submit</p>
        <p className="text-xs text-blue-600">Pengajuan masuk</p>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg text-center">
        <UserGroupIcon className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-yellow-900">Reviewer Check</p>
        <p className="text-xs text-yellow-600">Proses review</p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg text-center">
        <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-green-900">Approver Final</p>
        <p className="text-xs text-green-600">Menunggu Anda</p>
      </div>
    </div>
  );
}

export default function RoleSubmissionsManagement({ role }: RoleSubmissionsManagementProps) {
  const [submissions, setSubmissions] = useState<RoleSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  // Modal state
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Reviewer-specific export state
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    limit: 10,
    total: 0,
  });

  // Filters & sorting & pagination
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    reviewStatusFilter: '',
    finalStatusFilter: '',
    currentPage: 1,
    sortBy: role === 'APPROVER' ? 'reviewed_at' : 'created_at',
    sortOrder: 'desc',
  });

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const params = buildSubmissionsParams(filters);

      const response = await fetch(`/api/submissions?${params.toString()}`);
      if (!response.ok) throw new Error('Gagal mengambil data pengajuan');

      const data: SubmissionsResponse<RoleSubmission> = await response.json();
      setSubmissions(data.submissions ?? []);
      if (data.pagination) {
        // Map PaginationMeta to local pagination state
        setPagination({
          page: data.pagination.currentPage,
          pages: data.pagination.totalPages,
          limit: data.pagination.pageSize,
          total: data.pagination.totalItems,
        });
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
      showError('Gagal Memuat Data', 'Tidak dapat mengambil data pengajuan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [filters, showError]);

  useEffect(() => {
    fetchSubmissions();
  }, [filters]);
  // Note: Triggered by filters changes, fetchSubmissions is memoized with filters as dep

  // Listen to custom dashboard refresh events
  useEffect(() => {
    const eventName = role === 'APPROVER' ? 'approver-dashboard-refresh' : 'reviewer-dashboard-refresh';
    
    const handleSubmissionsRefresh = () => {
      // Refresh submissions list
      fetchSubmissions();
    };

    window.addEventListener(eventName, handleSubmissionsRefresh);
    
    return () => {
      window.removeEventListener(eventName, handleSubmissionsRefresh);
    };
  }, [role]);
  // Note: fetchSubmissions tidak perlu di deps karena handleSubmissionsRefresh selalu memanggil versi terbaru

  // Reviewer-specific export handler
  const handleExportToExcel = async (filters: { startDate: string; endDate: string }) => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/submissions/export?${params}`);
      if (!response.ok) {
        let errBody: any = null;
        try {
          errBody = await response.json();
        } catch (e) {
          /* ignore */
        }
        if (errBody?.error === 'NO_DATA') {
          showError(
            'Tidak ada data',
            'Tidak ada data untuk rentang tanggal atau filter yang dipilih.'
          );
          return;
        }
        throw new Error('Gagal mengekspor data');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const excelFilenameHeader = response.headers.get('X-Excel-Filename');

      let filename = 'simlok_export.xlsx';

      if (excelFilenameHeader) {
        filename = excelFilenameHeader;
        console.log('📊 Excel filename from X-Excel-Filename header:', filename);
      } else if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
          console.log('📊 Excel filename from Content-Disposition:', filename);
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

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      reviewStatusFilter: '',
      finalStatusFilter: '',
      currentPage: 1,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedSubmissionId(null);
  };

  const handleSubmissionAction = () => {
    fetchSubmissions();
    handleCloseModal();
  };

  const hasFilters = Boolean(
    filters.searchTerm || filters.reviewStatusFilter || filters.finalStatusFilter
  );

  if (loading && submissions.length === 0) {
    return <PageSkeleton hasHeader hasFilters hasStats={false} />;
  }

  // Role-specific configurations
  const config = {
    APPROVER: {
      title: 'Persetujuan Pengajuan',
      description: 'Kelola dan setujui pengajuan SIMLOK',
      showExportButton: false,
      showScanColumn: false,
      actionLabelPending: 'Review',
      actionLabelCompleted: 'Lihat',
      pendingCondition: (s: RoleSubmission) => s.approval_status === 'PENDING_APPROVAL',
      emptyTitle: 'Belum ada pengajuan untuk disetujui',
      emptyDescription: 'Saat ini belum ada pengajuan Simlok yang telah direview dan memerlukan persetujuan final dari Anda.',
      emptyContent: <ApproverEmptyContent />,
      reviewStatusOptions: [
        { value: 'MEETS_REQUIREMENTS', label: 'Memenuhi Syarat' },
        { value: 'NOT_MEETS_REQUIREMENTS', label: 'Tidak Memenuhi Syarat' },
      ],
      SkeletonComponent: ApproverTableSkeleton,
    },
    REVIEWER: {
      title: 'Review Pengajuan',
      description: 'Kelola dan review pengajuan SIMLOK',
      showExportButton: true,
      showScanColumn: true,
      actionLabelPending: 'Review',
      actionLabelCompleted: 'Lihat',
      pendingCondition: (s: RoleSubmission) => s.review_status === 'PENDING_REVIEW',
      emptyTitle: 'Tidak ada pengajuan',
      emptyDescription: 'Belum ada pengajuan yang tersedia untuk di-review.',
      emptyContent: null,
      reviewStatusOptions: [
        { value: 'PENDING_REVIEW', label: 'Menunggu Review' },
        { value: 'MEETS_REQUIREMENTS', label: 'Memenuhi Syarat' },
        { value: 'NOT_MEETS_REQUIREMENTS', label: 'Tidak Memenuhi Syarat' },
      ],
      SkeletonComponent: ReviewerTableSkeleton,
    },
  };

  const currentConfig = config[role];

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">{currentConfig.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{currentConfig.description}</p>
          </div>
          {currentConfig.showExportButton && (
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
          )}
        </div>

        {/* Toolbar - Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan nama vendor, deskripsi pekerjaan, atau penanggung jawab..."
              value={filters.searchTerm}
              onChange={(e) =>
                setFilters({ ...filters, searchTerm: e.target.value, currentPage: 1 })
              }
              className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 md:w-auto">
            <select
              value={filters.reviewStatusFilter}
              onChange={(e) =>
                setFilters({ ...filters, reviewStatusFilter: e.target.value, currentPage: 1 })
              }
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
            >
              <option value="">Semua Status Review</option>
              {currentConfig.reviewStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={filters.finalStatusFilter}
              onChange={(e) =>
                setFilters({ ...filters, finalStatusFilter: e.target.value, currentPage: 1 })
              }
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
            >
              <option value="">Semua Status Akhir</option>
              <option value="PENDING_APPROVAL">Menunggu Persetujuan</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
            {hasFilters && role === 'APPROVER' && (
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State or Table */}
      {!loading && submissions.length === 0 && role === 'APPROVER' ? (
        <EmptyState
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          title={currentConfig.emptyTitle}
          description={currentConfig.emptyDescription}
        >
          {currentConfig.emptyContent}
        </EmptyState>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <UnifiedSubmissionTable<BaseSubmission>
            data={submissions as BaseSubmission[]}
            loading={loading}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={(field, order) => {
              setFilters({ ...filters, sortBy: String(field), sortOrder: order, currentPage: 1 });
            }}
            page={pagination.page}
            pages={pagination.pages}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={(p) => setFilters({ ...filters, currentPage: p })}
            onOpenDetail={(id) => {
              setSelectedSubmissionId(id);
              setShowDetailModal(true);
            }}
            showScanColumn={currentConfig.showScanColumn}
            actionLabelPending={currentConfig.actionLabelPending}
            actionLabelCompleted={currentConfig.actionLabelCompleted}
            pendingCondition={currentConfig.pendingCondition}
            emptyTitle={hasFilters ? 'Tidak ada data sesuai filter' : currentConfig.emptyTitle}
            emptyDescription={
              hasFilters
                ? 'Coba hapus atau ubah filter pencarian.'
                : currentConfig.emptyDescription
            }
            SkeletonComponent={currentConfig.SkeletonComponent}
          />
        </div>
      )}

      {/* Unified Detail Modal */}
      <UnifiedSubmissionDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        submissionId={selectedSubmissionId ?? ''}
        userRole={role}
        onSuccess={handleSubmissionAction}
      />

      {/* Reviewer Export Modal */}
      {role === 'REVIEWER' && (
        <ExportFilterModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportToExcel}
          currentFilters={{
            startDate: '',
            endDate: '',
          }}
          exportLoading={exportLoading}
        />
      )}
    </div>
  );
}
