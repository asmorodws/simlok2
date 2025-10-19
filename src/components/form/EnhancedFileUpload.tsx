"use client";

import { useState, useRef } from "react";
import {
  DocumentIcon,
  CloudArrowUpIcon,
  PhotoIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ImageCompressor } from "@/utils/image-compression";
import { useToast } from "@/hooks/useToast";

interface EnhancedFileUploadProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onFileChange?: (file: File | null) => void;
  uploadType: "worker-photo" | "document" | "other";
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
  workerName?: string; // khusus foto pekerja
  maxFileNameLength?: number; // untuk custom panjang nama file
}

export default function EnhancedFileUpload({
  id,
  name,
  value,
  onChange,
  onFileChange,
  uploadType,
  multiple = false,
  required = false,
  disabled = false,
  className = "",
  label,
  description,
  workerName,
  maxFileNameLength = 30, // default 30 karakter
}: EnhancedFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null); // Local preview before upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();
  const toastShownRef = useRef(false); // Prevent double toast

  // --- Helpers UI ---
  const getAcceptTypes = () => {
    switch (uploadType) {
      case "worker-photo":
        return ".jpg,.jpeg,.png,.webp";
      case "document":
        return ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp";
      default:
        return ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp";
    }
  };

  const text = (() => {
    if (uploadType === "worker-photo") {
      return {
        title: "Unggah Foto Pekerja",
        subtitle: "Tarik & letakkan atau klik untuk memilih",
        formats: "JPG, JPEG, PNG, WebP — maks 10MB",
      };
    }
    return {
      title: "Unggah Dokumen",
      subtitle: "Tarik & letakkan atau klik untuk memilih",
      formats: "PDF, DOC, DOCX, JPG, PNG, WebP — maks 8MB",
    };
  })();

  const fileNameFromUrl = (url: string): string => {
    if (!url) return "";
    try {
      const decoded = decodeURIComponent(url);
      const last = decoded.split("?")[0]?.split("/").pop() ?? "";
      return last;
    } catch {
      const last = url.split("?")[0]?.split("/").pop() ?? "";
      return last;
    }
  };

  const truncateFileName = (fileName: string, maxLength: number = 30): string => {
    if (!fileName || fileName.length <= maxLength) return fileName;
    
    const ext = fileName.split('.').pop() || '';
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    
    if (nameWithoutExt.length + ext.length + 1 <= maxLength) {
      return fileName;
    }
    
    const charsToShow = maxLength - ext.length - 4; // -4 untuk "..." dan "."
    const truncated = nameWithoutExt.substring(0, charsToShow);
    
    return ext ? `${truncated}...${ext}` : `${truncated}...`;
  };

  // --- Validasi & Upload ---
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    switch (uploadType) {
      case "worker-photo":
        return ImageCompressor.validateWorkerPhoto(file);
      case "document":
        return ImageCompressor.validateDocumentFile(file);
      default:
        return { isValid: false, error: "Tipe upload tidak valid" };
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    let fileToUpload = file;

    if (uploadType === "worker-photo") {
      try {
        const compressionResult = await ImageCompressor.compressWorkerPhoto(file, {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.85,
          maxSizeKB: 500,
        });
        fileToUpload = compressionResult.file;
      } catch (e) {
        // Kompresi gagal → pakai file asli, tetap lanjut upload
        console.error("Compression error:", e);
      }
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);
    if (uploadType === "worker-photo" && workerName) {
      formData.append("workerName", workerName);
    }
    if (name) {
      formData.append("fieldName", name);
    }

    const uploadEndpoint =
      uploadType === "worker-photo" ? "/api/upload/worker-photo" : "/api/upload";

    const res = await fetch(uploadEndpoint, { method: "POST", body: formData });
    if (!res.ok) {
      let message = "Upload gagal";
      try {
        const data = await res.json();
        message = data?.error || message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
    const data = await res.json();
    return data.url as string;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return; // guard: File | undefined

    setError(null);
    toastShownRef.current = false; // Reset toast flag

    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error || "File tidak valid");
      if (!toastShownRef.current) {
        showError("Validasi Gagal", validation.error || "File tidak valid");
        toastShownRef.current = true;
      }
      return;
    }

    // Create local preview for images immediately
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLocalPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Progress sederhana agar UX terasa responsif
      const tick = setInterval(() => {
        setUploadProgress((p) => (p < 90 ? p + 8 : p));
      }, 120);

      const url = await uploadFile(file);

      clearInterval(tick);
      setUploadProgress(100);

      onChange?.(url);
      onFileChange?.(file);
      
      // Clear local preview once uploaded
      setLocalPreview(null);
      
      // Show success toast only once
      if (!toastShownRef.current) {
        showSuccess("Berhasil", "File berhasil diunggah");
        toastShownRef.current = true;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal mengunggah file";
      setError(msg);
      setLocalPreview(null); // Clear preview on error
      
      // Show error toast only once
      if (!toastShownRef.current) {
        showError("Gagal", msg);
        toastShownRef.current = true;
      }
    } finally {
      setTimeout(() => setUploadProgress(0), 800);
      setUploading(false);
    }
  };

  // --- Drag & Drop ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleRemove = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange?.("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError(null);
    setLocalPreview(null); // Clear local preview
    toastShownRef.current = false; // Reset toast flag
  };

  const handleReplace = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    fileInputRef.current?.click();
  };

  // --- Render ---
  const fileName = fileNameFromUrl(value);
  const hasFile = Boolean(value) || Boolean(localPreview);
  const displayUrl = localPreview || value; // Use local preview if available, otherwise server URL
  const isImage = uploadType === "worker-photo";
  const isPreviewMode = Boolean(localPreview); // Check if showing local preview

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        className={[
          "relative group rounded-xl border-2 border-dashed p-4 transition",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
          dragActive
            ? "border-blue-500 bg-blue-50"
            : error
            ? "border-red-300 bg-red-50"
            : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
        ].join(" ")}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          id={id}
          name={name}
          type="file"
          className="hidden"
          accept={getAcceptTypes()}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {/* ================== STATE: UPLOADING ================== */}
        {uploading ? (
          <div className="text-center min-h-[140px] flex flex-col items-center justify-center">
            <CloudArrowUpIcon className="h-10 w-10 text-blue-500 animate-bounce" />
            <p className="mt-3 text-sm font-medium text-gray-900">
              Mengunggah{uploadType === "worker-photo" ? " & mengompres" : ""}…
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">{uploadProgress}%</div>
          </div>
        ) : /* ================ STATE: HAS FILE ================ */ hasFile ? (
          isImage ? (
            /* FOTO → preview rapih & tidak melebihi komponen */
            <div className="text-center min-h-[140px] flex flex-col items-center justify-center">
              <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border bg-gray-100">
                <img
                  src={displayUrl}
                  alt={workerName ? `Foto ${workerName}` : "Foto pekerja"}
                  className="w-full h-auto object-contain max-h-[200px]"
                />
                
                {/* Preview badge if showing local preview */}
                {isPreviewMode && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow">
                    Preview
                  </div>
                )}
                
                {/* Overlay hover */}
                <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
                  <div className="pointer-events-auto flex gap-2">
                    <button
                      type="button"
                      onClick={handleReplace}
                      className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-white"
                    >
                      <PencilSquareIcon className="h-3.5 w-3.5" />
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-xs font-medium text-red-600 shadow hover:bg-white"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* DOKUMEN → preview gambar atau PDF icon */
            <div className="text-center min-h-[140px] flex flex-col items-center justify-center">
              {/* Check if document is image OR has local preview */}
              {(isPreviewMode || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)) ? (
                /* Image preview for document */
                <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border bg-gray-100">
                  <img
                    src={displayUrl}
                    alt="Preview dokumen"
                    className="w-full h-auto object-contain max-h-[200px]"
                  />
                  
                  {/* Preview badge if showing local preview */}
                  {isPreviewMode && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow">
                      Preview
                    </div>
                  )}
                  
                  {/* File name badge */}
                  {!isPreviewMode && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                      <div
                        className="text-center text-xs font-medium text-white truncate"
                        title={fileName}
                      >
                        {truncateFileName(fileName, maxFileNameLength)}
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay hover */}
                  <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
                    <div className="pointer-events-auto flex gap-2">
                      <button
                        type="button"
                        onClick={handleReplace}
                        className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-white"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={handleRemove}
                        className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-xs font-medium text-red-600 shadow hover:bg-white"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* PDF/DOC icon card */
                <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border bg-gradient-to-br from-blue-50 to-gray-50 py-6 px-4">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                      <DocumentIcon className="h-7 w-7 text-blue-500" />
                    </div>
                    <div className="mt-3 w-full">
                      <div
                        className="text-center text-sm font-medium text-gray-900"
                        title={fileName}
                      >
                        {truncateFileName(fileName, maxFileNameLength) || "file-terupload"}
                      </div>
                      <div className="mt-1 text-center text-xs text-gray-500">
                        Dokumen {(/\.pdf$/i.test(fileName)) ? 'PDF' : (/\.(doc|docx)$/i.test(fileName)) ? 'DOC' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Overlay hover */}
                  <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
                    <div className="pointer-events-auto flex gap-2">
                      <button
                        type="button"
                        onClick={handleReplace}
                        className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-white"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={handleRemove}
                        className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-xs font-medium text-red-600 shadow hover:bg-white"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* ================ STATE: EMPTY ================ */
          <div className="text-center min-h-[140px] flex flex-col items-center justify-center">
            {uploadType === "worker-photo" ? (
              <PhotoIcon className="h-10 w-10 text-blue-500" />
            ) : (
              <DocumentIcon className="h-10 w-10 text-blue-500" />
            )}
            <p className="mt-3 text-sm font-medium text-gray-900">{text.title}</p>
            <p className="mt-1 text-xs text-gray-600">{text.subtitle}</p>
            <p className="mt-1 text-xs text-gray-400">{text.formats}</p>
          </div>
        )}
      </div>

      {/* Bantuan & Error */}
      {description && !error && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
