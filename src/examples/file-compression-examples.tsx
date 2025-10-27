/**
 * Example Implementation: Integrating File Compression
 * into existing upload forms
 */

// ============================================
// EXAMPLE 1: Simple File Input with Compression
// ============================================

import { FileCompressor } from '@/utils/file-compressor';
import { useState } from 'react';

export function SimpleUploadExample() {
  const [_file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsCompressing(true);
    
    try {
      // Compress file automatically
      const result = await FileCompressor.compressFile(selectedFile, {
        maxSizeKB: 500,
        quality: 0.85
      });

      // Show compression stats
      const stats = FileCompressor.getCompressionStats(result);
      setCompressionStats(stats);

      // Use compressed file
      setFile(result.file);
      
    } catch (error) {
      console.error('Compression failed:', error);
      // Fallback to original file
      setFile(selectedFile);
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={handleFileChange}
        disabled={isCompressing}
        accept="image/*"
      />
      {isCompressing && <p>Mengompres file...</p>}
      {compressionStats && <p className="text-sm text-green-600">{compressionStats}</p>}
    </div>
  );
}

// ============================================
// EXAMPLE 2: Worker Photo Upload with Validation
// ============================================

export function WorkerPhotoUpload({ onPhotoChange }: { onPhotoChange: (file: File) => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setIsProcessing(true);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File harus berupa gambar');
      }

      // Validate file size (max 8MB before compression)
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('Ukuran file maksimal 8MB');
      }

      // Compress worker photo with optimized settings
      const result = await FileCompressor.compressWorkerPhoto(file);

      // Show success message
      if (result.compressionApplied) {
        setSuccess(`✓ Foto dikompres dari ${FileCompressor.formatBytes(result.originalSize)} menjadi ${FileCompressor.formatBytes(result.compressedSize)} (hemat ${result.compressionRatio}%)`);
      }

      // Send compressed file to parent
      onPhotoChange(result.file);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses foto');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Foto Pekerja
      </label>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handlePhotoChange}
        disabled={isProcessing}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {isProcessing && (
        <p className="text-sm text-blue-600">⏳ Memproses foto...</p>
      )}
      {success && (
        <p className="text-sm text-green-600">{success}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 3: HSSE Document Upload with Preview
// ============================================

export function HsseDocumentUpload({ onDocumentChange }: { onDocumentChange: (file: File) => void }) {
  const [preview, setPreview] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    original: string;
    compressed: string;
    ratio: number;
  } | null>(null);

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Compress document (supports images and PDFs)
      const result = await FileCompressor.compressDocument(file);

      // Set compression info
      if (result.compressionApplied) {
        setCompressionInfo({
          original: FileCompressor.formatBytes(result.originalSize),
          compressed: FileCompressor.formatBytes(result.compressedSize),
          ratio: result.compressionRatio
        });
      }

      // Generate preview for images
      if (result.file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(result.file);
      }

      // Send to parent
      onDocumentChange(result.file);

    } catch (error) {
      console.error('Failed to process document:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Dokumen HSSE Pass
      </label>
      
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={handleDocumentChange}
        disabled={isProcessing}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
      />

      {isProcessing && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">Memproses dokumen...</p>
        </div>
      )}

      {compressionInfo && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-semibold">✓ Dokumen berhasil dikompres</p>
          <div className="text-xs text-green-700 mt-1 space-y-1">
            <div>Ukuran awal: {compressionInfo.original}</div>
            <div>Ukuran akhir: {compressionInfo.compressed}</div>
            <div className="font-semibold">Penghematan: {compressionInfo.ratio}%</div>
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">Preview:</p>
          <img 
            src={preview} 
            alt="Document preview" 
            className="max-w-xs border border-gray-300 rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 4: Multiple Files Upload (Batch)
// ============================================

export function MultipleFilesUpload({ onFilesChange }: { onFilesChange: (files: File[]) => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{
    name: string;
    original: number;
    compressed: number;
    ratio: number;
  }>>([]);

  const handleMultipleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const compressedFiles: File[] = [];
    const fileResults: typeof results = [];

    for (let i = 0; i < files.length; i++) {
      const currentFile = files[i];
      if (!currentFile) continue;
      
      try {
        const result = await FileCompressor.compressFile(currentFile);
        
        compressedFiles.push(result.file);
        fileResults.push({
          name: currentFile.name,
          original: result.originalSize,
          compressed: result.compressedSize,
          ratio: result.compressionRatio
        });

        setProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (error) {
        console.error(`Failed to compress ${currentFile.name}:`, error);
        compressedFiles.push(currentFile); // Use original on error
      }
    }

    setResults(fileResults);
    onFilesChange(compressedFiles);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Upload Multiple Files
      </label>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleMultipleFiles}
        disabled={isProcessing}
        className="block w-full text-sm"
      />

      {isProcessing && (
        <div className="space-y-2">
          <p className="text-sm text-blue-600">Memproses {progress}%...</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-green-700">Hasil Kompresi:</p>
          <div className="space-y-1">
            {results.map((result, idx) => (
              <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div className="font-medium">{result.name}</div>
                <div>
                  {FileCompressor.formatBytes(result.original)} → {FileCompressor.formatBytes(result.compressed)}
                  {result.ratio > 0 && <span className="text-green-600 ml-1">(hemat {result.ratio}%)</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 5: Using React Hook
// ============================================

import { useFileCompression } from '@/utils/file-compressor';

export function HookBasedUpload() {
  const { compressFile, isCompressing, progress } = useFileCompression();
  const [_file, setFile] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const result = await compressFile(selectedFile, {
      maxSizeKB: 600,
      quality: 0.85
    });

    setFile(result.file);
    console.log('Compression stats:', result);
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={handleFileChange}
        disabled={isCompressing}
      />
      {isCompressing && (
        <div className="mt-2">
          <p>Compressing... {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 6: Integration with FormData
// ============================================

export function FormWithCompression() {
  const [formData, setFormData] = useState({
    name: '',
    photo: null as File | null,
    document: null as File | null
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress photo
    const result = await FileCompressor.compressWorkerPhoto(file);
    setFormData(prev => ({ ...prev, photo: result.file }));
  };

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress document
    const result = await FileCompressor.compressDocument(file);
    setFormData(prev => ({ ...prev, document: result.file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create FormData with compressed files
    const data = new FormData();
    data.append('name', formData.name);
    if (formData.photo) data.append('photo', formData.photo);
    if (formData.document) data.append('document', formData.document);

    // Upload to server
    await fetch('/api/upload', {
      method: 'POST',
      body: data
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Name"
      />
      
      <div>
        <label>Photo:</label>
        <input type="file" onChange={handlePhotoChange} accept="image/*" />
      </div>

      <div>
        <label>Document:</label>
        <input type="file" onChange={handleDocumentChange} accept="image/*,.pdf" />
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
