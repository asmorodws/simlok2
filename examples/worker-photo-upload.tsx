import React, { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { useToast } from '@/hooks/useToast';

// Mock components for example purposes
const Button = ({ children, onClick, disabled, className }: any) => (
  <button onClick={onClick} disabled={disabled} className={className}>
    {children}
  </button>
);

const Input = ({ id, type, accept, onChange, disabled }: any) => (
  <input id={id} type={type} accept={accept} onChange={onChange} disabled={disabled} />
);

const Label = ({ htmlFor, children }: any) => (
  <label htmlFor={htmlFor}>{children}</label>
);

// Mock toast hook
const useToast = () => ({
  showToast: (type: string, message: string) => {
    console.log(`${type.toUpperCase()}: ${message}`);
  }
});

interface WorkerPhotoUploadProps {
  workerName: string;
  onUploadSuccess?: (fileInfo: any) => void;
}

export function WorkerPhotoUpload({ workerName, onUploadSuccess }: WorkerPhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !workerName) {
      showToast('error', 'File dan nama pekerja diperlukan');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workerName', workerName);

      const response = await fetch('/api/upload/worker-photo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        showToast('success', `Foto ${workerName} berhasil diupload`);
        onUploadSuccess?.(result);
        
        // Reset form
        setFile(null);
        setPreview(null);
        const input = document.getElementById('worker-photo-input') as HTMLInputElement;
        if (input) input.value = '';
      } else {
        showToast('error', result.error || 'Upload gagal');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('error', 'Terjadi kesalahan saat upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="worker-photo-input">
          Foto {workerName}
        </Label>
        <Input
          id="worker-photo-input"
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <p className="text-sm text-gray-500 mt-1">
          Format: JPG, JPEG, PNG (maksimal 5MB)
        </p>
      </div>

      {preview && (
        <div className="border rounded-lg p-4">
          <Label>Preview:</Label>
          <img
            src={preview}
            alt={`Preview foto ${workerName}`}
            className="mt-2 max-w-xs max-h-48 object-cover rounded border"
          />
        </div>
      )}

      <Button 
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full"
      >
        {uploading ? 'Mengupload...' : `Upload Foto ${workerName}`}
      </Button>
    </div>
  );
}

// Example usage in a form
export function WorkerFormExample() {
  const [workers, setWorkers] = useState([
    { id: 1, name: 'John Doe', photo: null },
    { id: 2, name: 'Jane Smith', photo: null },
  ]);

  const handlePhotoUpload = (workerId: number, fileInfo: any) => {
    setWorkers(prev => prev.map(worker => 
      worker.id === workerId 
        ? { ...worker, photo: fileInfo.url }
        : worker
    ));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Upload Foto Pekerja</h2>
      
      {workers.map((worker) => (
        <div key={worker.id} className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">{worker.name}</h3>
          
          {worker.photo ? (
            <div className="space-y-2">
              <p className="text-green-600">✓ Foto sudah diupload</p>
              <img 
                src={worker.photo} 
                alt={`Foto ${worker.name}`}
                className="w-32 h-32 object-cover rounded border"
              />
            </div>
          ) : (
            <WorkerPhotoUpload
              workerName={worker.name}
              onUploadSuccess={(fileInfo) => handlePhotoUpload(worker.id, fileInfo)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
