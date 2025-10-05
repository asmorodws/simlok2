'use client';

import React, { useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import Alert from '@/components/ui/alert/Alert';
import ScanHistoryTable, { QrScan } from '@/components/scanner/ScanHistoryTable';
import ApproverScanDetailModal from '@/components/approver/ApproverScanDetailModal';
import SimlokPdfModal from '@/components/common/SimlokPdfModal';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  verifier: string;
  submissionId: string;
}

export default function ApproverScanHistoryContent() {
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

  const fetchScanHistory = async () => {
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
  };

  useEffect(() => {
    const t = setTimeout(fetchScanHistory, 300);
    return () => clearTimeout(t);
  }, [page, search]);

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

          <Button
            onClick={() => setShowFilters((s) => !s)}
            variant={showFilters ? 'secondary' : 'primary'}
            className="inline-flex items-center space-x-2"
          >
            <DocumentTextIcon className="h-4 w-4" />
            <span>Filter</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari berdasarkan nomor simlok, nama perusahaan, atau verifikator..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4">
            <form onSubmit={applyFilters} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Dari</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Sampai</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Verifikator</label>
                  <input
                    type="text"
                    value={filters.verifier}
                    onChange={(e) => setFilters((p) => ({ ...p, verifier: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Nama verifikator…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Simlok</label>
                  <input
                    type="text"
                    value={filters.submissionId}
                    onChange={(e) => setFilters((p) => ({ ...p, submissionId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Contoh: SIMLOK/2024/0001"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit">Terapkan Filter</Button>
                <Button type="button" variant="secondary" onClick={resetFilters}>Reset</Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {error && <Alert variant="error" title="Error" message={error} />}

      {/* Reusable Table */}
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

      {/* Modal khusus Approver */}
      <ApproverScanDetailModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        scan={selected}
        onOpenPdf={(s) => { setSelected(s); setOpenPdf(true); }}
      />

      {/* PDF modal (opsional khusus approver) */}
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
