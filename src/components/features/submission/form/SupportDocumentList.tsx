'use client';

import { useRef } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import EnhancedFileUpload from '@/components/features/document/upload/EnhancedFileUpload';
import DatePicker from '@/components/form/DatePicker';
import Button from '@/components/ui/button/Button';

export interface SupportDoc {
  id: string;
  document_subtype?: string; // Subtype untuk SIMJA/SIKA (e.g., "Pekerjaan Panas", "Izin Masuk")
  document_number?: string;
  document_type?: 'SIMJA' | 'SIKA' | 'WORK_ORDER' | 'KONTRAK_KERJA' | 'JSA';
  document_date?: string;
  document_upload: string;
}

interface SupportDocumentListProps {
  title: string;
  documentType: 'SIMJA' | 'SIKA' | 'JSA' | 'WORK_ORDER' | 'KONTRAK_KERJA';
  documents: SupportDoc[];
  onDocumentsChange: (docs: SupportDoc[]) => void;
  disabled?: boolean;
  invalidDocumentIds?: Map<string, string>; // Map of document ID to error message
}

export default function SupportDocumentList({
  title,
  documentType,
  documents,
  onDocumentsChange,
  disabled = false,
  invalidDocumentIds,
}: SupportDocumentListProps) {
  const lastAddedRef = useRef<HTMLInputElement | null>(null);

  const addDocument = () => {
    let defaultSubtype: string | undefined;
    if (documentType === 'SIMJA') {
      defaultSubtype = 'Ast. Man. Facility Management';
    } else if (documentType === 'SIKA') {
      defaultSubtype = '';
    } else if (documentType === 'JSA') {
      defaultSubtype = ''; // JSA tidak memiliki subtype
    } else if (documentType === 'WORK_ORDER' || documentType === 'KONTRAK_KERJA') {
      defaultSubtype = undefined; // Work Order dan Kontrak Kerja tidak memiliki subtype
    } else {
      defaultSubtype = undefined;
    }

    const newDoc: SupportDoc = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      document_subtype: defaultSubtype as any,
      document_number: '',
      document_date: '',
      document_upload: '',
    };
    onDocumentsChange([...documents, newDoc]);

    // Focus on newly added input
    setTimeout(() => {
      lastAddedRef.current?.focus();
    }, 100);
  };

  const removeDocument = (id: string) => {
    if (documents.length <= 1) return; // Keep at least one
    onDocumentsChange(documents.filter((doc) => doc.id !== id));
  };

  const placeholderText = (type: string) => {
    if (type === 'WORK_ORDER') {
      return 'Nomor Work Order';
    } else if (type === 'KONTRAK_KERJA') {
      return 'Nomor Kontrak Kerja';
    } else {
      return `Nomor ${type}`;
    }
  }

  const updateDocument = (id: string, field: keyof SupportDoc, value: string) => {
    onDocumentsChange(
      documents.map((doc) =>
        doc.id === id ? { ...doc, [field]: value } : doc
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="space-y-6">
        {documents.map((doc, index) => {
          // Check if this document has validation error
          const hasError = invalidDocumentIds?.has(doc.id) ?? false;
          const errorMessage = hasError && invalidDocumentIds ? invalidDocumentIds.get(doc.id) : undefined;
          
          return (
          <div
            key={doc.id}
            className={`border rounded-lg p-4 bg-white relative ${
              hasError ? 'border-red-500 border-2 bg-red-50' : 'border-gray-200'
            }`}
          >
            {/* Error banner at top if document is invalid */}
            {hasError && errorMessage && (
              <div className="mb-4 -mt-2 -mx-2 px-4 py-3 bg-red-100 border-b-2 border-red-500 rounded-t-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">Dokumen PDF Bermasalah</p>
                    <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ⚠️ Silakan hapus dan unggah ulang file PDF yang valid
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Header with number and delete button */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">
                {documentType === 'WORK_ORDER'
                  ? 'Work Order'
                  : documentType === 'KONTRAK_KERJA'
                    ? 'Kontrak Kerja'
                    : documentType === 'SIKA' ? documentType + '#' + (index + 1) : documentType
                }
              </span>
              {documents.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDocument(doc.id)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600 shadow hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Hapus dokumen"
                >
                  Hapus
                </button>
              )}
            </div>

            {/* Two column layout: inputs on left, upload on right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column: inputs */}
              <div className="space-y-4">
                {/* Document Subtype - Only for SIKA */}
                {documentType === 'SIKA' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jenis SIKA <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={doc.document_subtype || ''}
                        onChange={(e) =>
                          updateDocument(doc.id, 'document_subtype', e.target.value)
                        }
                        disabled={disabled}
                        className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm
                   bg-white text-gray-900 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                   disabled:bg-gray-50 disabled:cursor-not-allowed
                   appearance-none cursor-pointer
                   hover:border-gray-400 transition-colors duration-200"
                      >
                        <option value="" className="text-gray-500">-- Pilih Jenis SIKA --</option>

                        {[
                          "Pekerjaan Dingin",
                          "Pekerjaan Panas",
                          "Confined Space"
                        ].map((option) => {
                          // Ambil semua nilai yang sudah dipilih oleh dokumen lain
                          const selectedTypes = documents
                            .filter((d) => d.id !== doc.id)
                            .map((d) => d.document_subtype);

                          const isUsed = selectedTypes.includes(option);

                          return (
                            <option
                              key={option}
                              value={option}
                              disabled={isUsed}
                              className={`text-gray-900 ${isUsed ? 'text-gray-400' : ''}`}
                            >
                              {option} {isUsed ? '(Sudah dipilih)' : ''}
                            </option>
                          );
                        })}
                      </select>

                      {/* Custom dropdown arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor Dokumen {documentType === 'WORK_ORDER' ? 'Work Order' : documentType === 'KONTRAK_KERJA' ? 'Kontrak Kerja' : documentType} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={doc.document_number || ''}
                    onChange={(e) =>
                      updateDocument(doc.id, 'document_number', e.target.value)
                    }
                    placeholder={placeholderText(documentType)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Document Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {documentType === 'JSA'
                      ? 'Tanggal Dokumen JSA'
                      : documentType === 'WORK_ORDER'
                        ? 'Tanggal Work Order'
                        : documentType === 'KONTRAK_KERJA'
                          ? 'Tanggal Kontrak Kerja'
                          : 'Tanggal Dokumen'} <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={doc.document_date || ''}
                    onChange={(value) =>
                      updateDocument(doc.id, 'document_date', value)
                    }
                    placeholder={
                      documentType === 'JSA'
                        ? 'Pilih tanggal JSA'
                        : documentType === 'WORK_ORDER'
                          ? 'Pilih tanggal Work Order'
                          : documentType === 'KONTRAK_KERJA'
                            ? 'Pilih tanggal Kontrak Kerja'
                            : 'Pilih tanggal dokumen'
                    }
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Right column: file upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Dokumen {
                    documentType === 'WORK_ORDER' ? 'Work Order' : documentType === 'KONTRAK_KERJA' ? 'Kontrak Kerja' : documentType
                  } (PDF) <span className="text-red-500">*</span>
                </label>
                <EnhancedFileUpload
                  id={`doc-${doc.id}`}
                  name={`document_${documentType.toLowerCase()}_${doc.id}`}
                  value={doc.document_upload}
                  onChange={(url: string) =>
                    updateDocument(doc.id, 'document_upload', url)
                  }
                  uploadType="document"
                  disabled={disabled}
                  description="Upload file PDF saja. Maksimal 8MB"
                />
                {doc.document_upload && (
                  <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Dokumen PDF berhasil diunggah
                  </p>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Add button at the bottom */}
      {documentType === 'SIKA' && documents.length < 3 && (
  <div className="flex justify-end pt-2">
    <Button
      type="button"
      variant="info"
      size="sm"
      onClick={addDocument}
      
    >
      <PlusIcon className="h-4 w-4 mr-1" />
      Tambah {documentType}
    </Button>
  </div>
)}


    </div>
  );
}
