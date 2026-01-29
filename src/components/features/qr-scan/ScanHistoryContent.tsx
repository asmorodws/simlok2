/**
 * Shared Scan History Component
 * Digunakan oleh Approver dan Reviewer untuk melihat riwayat scan QR code
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MagnifyingGlassIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import Alert from '@/components/ui/alert/Alert';
import ScanHistoryTable from './ScanHistoryTable';
import type { QrScan } from '@/types';
import SimlokPdfModal from '@/components/features/document/SimlokPdfModal';
import ScanDetailModal from '@/components/features/qr-scan/ScanDetailModal';
import { convertQrScanToScanData, getScanDetailSubtitle } from '@/utils/qr-scan';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  verifier: string;
  submissionId: string;
}

interface ScanHistoryContentProps {
  /** User role - determines modal behavior */
  role: 'APPROVER' | 'REVIEWER';
}

export default function ScanHistoryContent({ role }: ScanHistoryContentProps) {
  const [scans, setScans] = useState<QrScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filters, setFilters] = useState<FilterState>({ dateFrom: '', dateTo: '', verifier: '', submissionId: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<QrScan | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [openPdf, setOpenPdf] = useState(false);
  const pageSize = 15;

  const fetchScanHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.verifier && { verifier: filters.verifier }),
        ...(filters.submissionId && { submissionId: filters.submissionId }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/scan-history?${params}`);
      if (!res.ok) throw new Error('Failed to fetch scan history');
      const data = await res.json();
      setScans(data.scans || []);
      setPages(Math.max(1, Math.ceil((data.total || 0) / pageSize)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, search]);

  // Initial fetch and debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      fetchScanHistory();
    }, 300);
    return () => clearTimeout(t);
  }, [page, search, filters]); // fetchScanHistory removed to prevent infinite loop

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchScanHistory();
  };

  const resetFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', verifier: '', submissionId: '' });
    setSearch('');
    setPage(1);
    fetchScanHistory();
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manajemen Riwayat Scan</h2>
              <p className="text-sm text-gray-500">Pantau aktivitas scan QR code oleh verifikator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowFilters((s) => !s)}
              variant={showFilters ? 'secondary' : 'primary'}
              className="inline-flex items-center space-x-2"
            >
              <DocumentTextIcon className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari SIMLOK, vendor, verifier..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Form */}
        {showFilters && (
          <form onSubmit={applyFilters} className="border-t border-gray-200 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verifier</label>
                <input
                  type="text"
                  value={filters.verifier}
                  onChange={(e) => setFilters({ ...filters, verifier: e.target.value })}
                  placeholder="Nama verifier..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor SIMLOK</label>
                <input
                  type="text"
                  value={filters.submissionId}
                  onChange={(e) => setFilters({ ...filters, submissionId: e.target.value })}
                  placeholder="Nomor SIMLOK..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button type="button" onClick={resetFilters} variant="outline">
                Reset Filter
              </Button>
              <Button type="submit" variant="primary">
                Terapkan Filter
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" title="Error" message={error} />
      )}

      {/* Table */}
      <ScanHistoryTable
        scans={scans}
        loading={loading}
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pages, p + 1))}
        renderAction={(scan) => (
          <Button
            onClick={() => { setSelected(scan); setOpenModal(true); }}
            variant="outline"
            size="sm"
            className="inline-flex items-center"
          >
            Lihat
          </Button>
        )}
      />

      {/* Detail Modal (role-specific) */}
      <ScanDetailModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        scan={selected ? convertQrScanToScanData(selected) : null}
        title="Detail Scan QR Code"
        subtitle={getScanDetailSubtitle(role)}
        showPdfButton={true}
        onViewPdf={() => setOpenPdf(true)}
      />

      {/* PDF Modal */}
      {selected && (
        <SimlokPdfModal
          isOpen={openPdf}
          onClose={() => setOpenPdf(false)}
          submissionId={selected.submission.id}
          submissionName={selected.submission.vendor_name}
          nomorSimlok={selected.submission.simlok_number}
        />
      )}
    </div>
  );
}
