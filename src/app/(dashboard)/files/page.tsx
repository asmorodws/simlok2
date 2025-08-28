'use client';

import { useState } from 'react';
import FileManager from '@/components/files/FileManager';
import FileUpload from '@/components/form/FileUpload';
import Card from '@/components/ui/Card';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';

export default function FilesPage() {
  const [uploadingCategory, setUploadingCategory] = useState<string>('');

  const handleFileUpload = (category: string) => (url: string) => {
    console.log(`File uploaded to ${category}:`, url);
    // You can add notification here
    setUploadingCategory('');
    // Refresh the file manager (you might need to pass a refresh function)
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manajemen File
          </h1>
          <p className="text-gray-600">
            Kelola file dokumen Anda dengan struktur folder yang terorganisir
          </p>
        </div>

        {/* Quick Upload Section */}
        <Card className="p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <DocumentPlusIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Upload File Baru
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FileUpload
              name="upload_doc_sika"
              label="Upload Dokumen SIKA"
              description="File akan disimpan di folder 'dokumen-sika'"
              onChange={handleFileUpload('sika')}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              maxSize={5}
            />
            
            <FileUpload
              name="upload_doc_simja"
              label="Upload Dokumen SIMJA"
              description="File akan disimpan di folder 'dokumen-simja'"
              onChange={handleFileUpload('simja')}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              maxSize={5}
            />
          </div>
        </Card>

        {/* File Manager */}
        <FileManager />
      </div>
    </div>
  );
}
