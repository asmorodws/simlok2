'use client';

import { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  PhotoIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import DocumentPreviewModal from '@/components/common/DocumentPreviewModal';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';

interface FileInfo {
  originalName: string;
  newName: string;
  path: string;
  url: string;
  size: number;
  type: string;
  category: 'sika' | 'simja' | 'id_card' | 'other';
}

interface FilesByCategory {
  sika: FileInfo[];
  simja: FileInfo[];
  id_card: FileInfo[];
  other: FileInfo[];
}

export default function FileManager() {
  const [files, setFiles] = useState<FilesByCategory>({
    sika: [],
    simja: [],
    id_card: [],
    other: []
  });
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [migrating, setMigrating] = useState(false);

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({
    isOpen: false,
    fileUrl: '',
    fileName: ''
  });

  const categoryNames = {
    sika: 'Dokumen SIKA',
    simja: 'Dokumen SIMJA', 
    id_card: 'ID Card',
    other: 'Lainnya'
  };

  const handleClosePreview = () => {
    setPreviewModal({
      isOpen: false,
      fileUrl: '',
      fileName: ''
    });
  };

  const categoryIcons = {
    sika: <DocumentIcon className="h-6 w-6 text-blue-500" />,
    simja: <DocumentIcon className="h-6 w-6 text-green-500" />,
    id_card: <PhotoIcon className="h-6 w-6 text-purple-500" />,
    other: <FolderIcon className="h-6 w-6 text-gray-500" />
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/files/manage');
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (oldFileName: string, category: string) => {
    if (!newName.trim()) return;

    try {
      const response = await fetch('/api/files/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          oldFileName,
          newName: newName.trim(),
          category
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadFiles(); // Reload files
        setRenaming(null);
        setNewName('');
      } else {
        alert(data.error || 'Failed to rename file');
      }
    } catch (error) {
      console.error('Error renaming file:', error);
      alert('Error renaming file');
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/files/manage?fileName=${encodeURIComponent(fileName)}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await loadFiles(); // Reload files
      } else {
        alert(data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file');
    }
  };

  const handleMigrate = async () => {
    if (!confirm('This will organize your existing files into folders. Continue?')) return;

    try {
      setMigrating(true);
      const response = await fetch('/api/files/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Migration completed! ${data.migrated} files moved.${data.errors.length > 0 ? ` ${data.errors.length} errors occurred.` : ''}`);
        await loadFiles(); // Reload files
      } else {
        alert(data.error || 'Migration failed');
      }
    } catch (error) {
      console.error('Error migrating files:', error);
      alert('Error migrating files');
    } finally {
      setMigrating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <PhotoIcon className="h-5 w-5 text-blue-500" />;
    }
    return <DocumentIcon className="h-5 w-5 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading files...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">File Manager</h2>
        <Button
          onClick={handleMigrate}
          disabled={migrating}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <ArrowPathIcon className={`h-4 w-4 ${migrating ? 'animate-spin' : ''}`} />
          <span>{migrating ? 'Migrating...' : 'Organize Files'}</span>
        </Button>
      </div>

      {Object.entries(files).map(([category, categoryFiles]) => (
        <Card key={category} className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            {categoryIcons[category as keyof typeof categoryIcons]}
            <h3 className="text-lg font-semibold text-gray-900">
              {categoryNames[category as keyof typeof categoryNames]}
            </h3>
            <span className="text-sm text-gray-500">
              ({categoryFiles.length} files)
            </span>
          </div>

          {categoryFiles.length === 0 ? (
            <p className="text-gray-500 italic">No files in this category</p>
          ) : (
            <div className="space-y-2">
              {categoryFiles.map((file: FileInfo) => (
                <div
                  key={file.newName}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.type)}
                    <div>
                      {renaming === file.newName ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="New name"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRename(file.newName, category)}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setRenaming(null);
                              setNewName('');
                            }}
                            className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-gray-900">
                            {file.originalName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • {file.newName}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPreviewModal({
                        isOpen: true,
                        fileUrl: file.url,
                        fileName: file.originalName
                      })}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                      title="Preview"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setRenaming(file.newName);
                        setNewName(file.originalName.replace(/\.[^/.]+$/, '')); // Remove extension
                      }}
                      className="p-2 text-gray-400 hover:text-yellow-600 rounded-full hover:bg-yellow-50"
                      title="Rename"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(file.newName)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={handleClosePreview}
        fileUrl={previewModal.fileUrl}
        fileName={previewModal.fileName}
      />
    </div>
  );
}
