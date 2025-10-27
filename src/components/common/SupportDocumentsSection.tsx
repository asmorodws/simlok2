'use client';

import { DocumentIcon, EyeIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import DetailSection from '@/components/common/DetailSection';
import { fileUrlHelper } from '@/lib/fileUrlHelper';
import { SubmissionSupportDocument } from '@/types/submission';
import { formatDocumentTypeLabel } from '@/utils/documentTypeFormatter';

interface SupportDocumentsSectionProps {
  supportDocuments?: SubmissionSupportDocument[];
  onViewDocument: (url: string, title: string) => void;
}

export default function SupportDocumentsSection({
  supportDocuments,
  onViewDocument,
}: SupportDocumentsSectionProps) {
  // If no documents provided, don't render
  if (!supportDocuments || supportDocuments.length === 0) {
    return null;
  }

  // Group documents by type
  const simjaDocuments = supportDocuments.filter(doc => doc.document_type === 'SIMJA');
  const sikaDocuments = supportDocuments.filter(doc => doc.document_type === 'SIKA');
  const workOrderDocuments = supportDocuments.filter(doc => doc.document_type === 'WORK_ORDER');
  const kontrakKerjaDocuments = supportDocuments.filter(doc => doc.document_type === 'KONTRAK_KERJA');
  const jsaDocuments = supportDocuments.filter(doc => doc.document_type === 'JSA');

  // Count how many document sections we have (for dynamic grid)
  const documentSections = [
    simjaDocuments.length > 0,
    sikaDocuments.length > 0,
    workOrderDocuments.length > 0,
    kontrakKerjaDocuments.length > 0,
    jsaDocuments.length > 0,
  ].filter(Boolean).length;

  // Determine grid columns based on number of sections (maximum 4 columns)
  const getGridClass = () => {
    if (documentSections === 1) {
      return 'grid-cols-1'; // Single column if only one section
    } else if (documentSections === 2) {
      return 'grid-cols-1 md:grid-cols-2'; // 2 columns on tablet+ if 2 sections
    } else if (documentSections === 3) {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'; // 3 columns on desktop if 3 sections
    } else {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'; // 4 columns on desktop if 4+ sections (maximum 4)
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'SIMJA':
        return 'text-blue-500';
      case 'SIKA':
        return 'text-green-500';
      case 'WORK_ORDER':
        return 'text-orange-500';
      case 'KONTRAK_KERJA':
        return 'text-indigo-500';
      case 'JSA':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const renderDocumentGroup = (
    documents: SubmissionSupportDocument[],
    title: string,
    bgColor: string,
    iconColor: string
  ) => {
    if (documents.length === 0) return null;

    return (
      <div className="space-y-2">
        {/* Group Header with colored badge */}
        <div className={`${bgColor} px-3 py-2 rounded-lg`}>
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <DocumentIcon className={`h-4 w-4 ${iconColor}`} />
            {title}
            <span className="ml-auto text-xs font-normal text-gray-500">
              {documents.length} dok
            </span>
          </h4>
        </div>

        {/* Documents list */}
        <div className="space-y-1.5">
          {documents.map((doc, index) => (
            <div
              key={doc.id}
              className="border border-gray-200 rounded-md hover:border-gray-300 hover:shadow-sm transition-all duration-150 bg-white"
            >
              <div className="p-2.5">
                {/* Icon and Title */}
                <div className="flex items-start gap-2 mb-1.5">
                  <div className={`p-1 rounded ${bgColor} flex-shrink-0 mt-0.5`}>
                    <DocumentIcon className={`h-3.5 w-3.5 ${getDocumentIcon(doc.document_type)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-gray-900 truncate leading-tight">
                      {doc.document_subtype || 
                        `${formatDocumentTypeLabel(doc.document_type as any)} #${index + 1}`}
                    </p>
                  </div>
                </div>

                {/* Details - stacked for narrow columns */}
                <div className="space-y-1 text-xs text-gray-600 ml-6">
                  {doc.document_number && (
                    <div className="flex items-center gap-1 truncate">
                      <span className="text-gray-400 flex-shrink-0">#</span>
                      <span className="truncate">{doc.document_number}</span>
                    </div>
                  )}
                  
                  {doc.document_date && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-500 text-[10px] mr-0.5">Tgl:</span>
                      <span>
                        {new Date(doc.document_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* View button - full width, compact */}
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onViewDocument(
                        fileUrlHelper.convertLegacyUrl(doc.document_upload),
                        doc.document_subtype || 
                          `${formatDocumentTypeLabel(doc.document_type as any)} Document`
                      )
                    }
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    <span>Lihat Dokumen</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DetailSection
      title="Dokumen Pendukung"
      icon={<DocumentIcon className="h-5 w-5 text-gray-500" />}
    >
      {/* Dynamic grid layout based on number of document sections */}
      <div className={`grid ${getGridClass()} gap-4`}>
        {renderDocumentGroup(simjaDocuments, 'Dokumen SIMJA', 'bg-blue-50', 'text-blue-600')}
        {renderDocumentGroup(sikaDocuments, 'Dokumen SIKA', 'bg-green-50', 'text-green-600')}
        {renderDocumentGroup(workOrderDocuments, 'Dokumen Work Order', 'bg-orange-50', 'text-orange-600')}
        {renderDocumentGroup(kontrakKerjaDocuments, 'Dokumen Kontrak Kerja', 'bg-indigo-50', 'text-indigo-600')}
        {renderDocumentGroup(jsaDocuments, 'Dokumen JSA', 'bg-purple-50', 'text-purple-600')}
      </div>
    </DetailSection>
  );
}
