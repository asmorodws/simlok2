'use client';

import React from 'react';
import {
  BuildingOfficeIcon,
  BriefcaseIcon,
  DocumentIcon,
  DocumentArrowUpIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import DetailSection from '@/components/features/dashboard/DetailSection';
import { InfoCard, NoteCard } from '@/components/ui/card';
import SupportDocumentsSection from '@/components/features/document/SupportDocumentsSection';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import type { BaseSubmissionDetail } from '../SubmissionDetailShared';
import { formatDate, formatWorkLocation } from '../SubmissionDetailShared';

interface DetailsTabProps {
  submission: BaseSubmissionDetail;
  onViewPdf: () => void;
  onViewDocument: (url: string, title: string) => void;
}

export default function DetailsTab({
  submission,
  onViewPdf,
  onViewDocument,
}: DetailsTabProps) {
  return (
    <div className="space-y-6">
      {/* Informasi Vendor */}
      <DetailSection title="Informasi Vendor" icon={<BuildingOfficeIcon className="h-5 w-5" />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoCard label="Nama Vendor" value={submission.vendor_name} />
          <InfoCard label="Nama Petugas" value={submission.officer_name} />
          {submission.vendor_phone && (
            <InfoCard label="No. Telepon" value={submission.vendor_phone} />
          )}
          {submission.officer_email && (
            <InfoCard label="Email Petugas" value={submission.officer_email} />
          )}
        </div>
      </DetailSection>

      {/* Informasi Pekerjaan */}
      <DetailSection title="Informasi Pekerjaan" icon={<BriefcaseIcon className="h-5 w-5" />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoCard label="Dasar Pekerjaan" value={submission.based_on} />
          <InfoCard label="Deskripsi Pekerjaan" value={submission.job_description} />
          <InfoCard 
            label="Lokasi Kerja" 
            value={formatWorkLocation(submission.work_location)} 
          />
          <InfoCard label="Jam Kerja" value={submission.working_hours} />
          {submission.holiday_working_hours && (
            <InfoCard label="Jam Kerja Libur" value={submission.holiday_working_hours} />
          )}
          <InfoCard label="Jumlah Pekerja" value={submission.worker_count?.toString() || '-'} />
          <InfoCard label="Fasilitas Kerja" value={submission.work_facilities} />
        </div>

        {submission.other_notes && (
          <div className="mt-4">
            <NoteCard title="Catatan Lainnya" note={submission.other_notes} />
          </div>
        )}
      </DetailSection>

      {/* Dokumen Pendukung Utama */}
      <DetailSection title="Dokumen Pendukung" icon={<DocumentIcon className="h-5 w-5" />}>
        <div className="space-y-4">
          {/* SIMJA */}
          {submission.simja_number && (
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">SIMJA</h4>
                <Badge variant="info">{submission.simja_type || 'Dokumen'}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Nomor:</span>
                  <span className="ml-2 text-gray-900 font-medium">{submission.simja_number}</span>
                </div>
                {submission.simja_date && (
                  <div>
                    <span className="text-gray-500">Tanggal:</span>
                    <span className="ml-2 text-gray-900">{formatDate(submission.simja_date)}</span>
                  </div>
                )}
              </div>
              {submission.simja_document_upload && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewDocument(
                    submission.simja_document_upload!,
                    'SIMJA Document'
                  )}
                  className="mt-3"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Lihat Dokumen
                </Button>
              )}
            </div>
          )}

          {/* SIKA */}
          {submission.sika_number && (
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">SIKA</h4>
                <Badge variant="info">{submission.sika_type || 'Dokumen'}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Nomor:</span>
                  <span className="ml-2 text-gray-900 font-medium">{submission.sika_number}</span>
                </div>
                {submission.sika_date && (
                  <div>
                    <span className="text-gray-500">Tanggal:</span>
                    <span className="ml-2 text-gray-900">{formatDate(submission.sika_date)}</span>
                  </div>
                )}
              </div>
              {submission.sika_document_upload && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewDocument(
                    submission.sika_document_upload!,
                    'SIKA Document'
                  )}
                  className="mt-3"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Lihat Dokumen
                </Button>
              )}
            </div>
          )}
        </div>
      </DetailSection>

      {/* Supporting Documents Section */}
      {submission.support_documents && (
        <SupportDocumentsSection supportDocuments={submission.support_documents} onViewDocument={onViewDocument} />
      )}

      {/* View PDF Button */}
      <div className="flex justify-center pt-4">
        <Button
          variant="primary"
          size="lg"
          onClick={onViewPdf}
        >
          <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
          Lihat PDF SIMLOK
        </Button>
      </div>
    </div>
  );
}
