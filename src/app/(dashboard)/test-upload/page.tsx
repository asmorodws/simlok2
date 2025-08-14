'use client';

import { useState } from 'react';
import FileUpload from '@/components/form/FileUpload';
import Card from '@/components/ui/Card';

export default function UploadTestPage() {
  const [uploadedFiles, setUploadedFiles] = useState({
    doc1: '',
    doc2: '',
    image1: ''
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Test Upload File</h1>
        
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Dokumen PDF/Word</h2>
            <FileUpload
              label="Upload Dokumen"
              description="Upload file PDF atau Word maksimal 5MB"
              value={uploadedFiles.doc1}
              onChange={(url) => setUploadedFiles(prev => ({ ...prev, doc1: url }))}
              accept=".pdf,.doc,.docx"
              maxSize={5}
              required
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Gambar</h2>
            <FileUpload
              label="Upload Gambar"
              description="Upload gambar JPG, PNG maksimal 3MB"
              value={uploadedFiles.image1}
              onChange={(url) => setUploadedFiles(prev => ({ ...prev, image1: url }))}
              accept=".jpg,.jpeg,.png,.gif"
              maxSize={3}
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Semua Format</h2>
            <FileUpload
              label="Upload File Apapun"
              description="Upload file PDF, Word, atau gambar maksimal 5MB"
              value={uploadedFiles.doc2}
              onChange={(url) => setUploadedFiles(prev => ({ ...prev, doc2: url }))}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              maxSize={5}
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Hasil Upload</h2>
            <div className="space-y-2">
              <div>
                <strong>Dokumen 1:</strong> {uploadedFiles.doc1 || 'Belum upload'}
              </div>
              <div>
                <strong>Gambar:</strong> {uploadedFiles.image1 || 'Belum upload'}
              </div>
              <div>
                <strong>Dokumen 2:</strong> {uploadedFiles.doc2 || 'Belum upload'}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
