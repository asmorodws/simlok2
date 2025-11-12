"use client";

import { useState, useRef } from "react";
import {
  DocumentIcon,
  CloudArrowUpIcon,
  PhotoIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { ImageCompressor } from "@/utils/image-compression";
import { useToast } from "@/hooks/useToast";
import {
  validateWorkerPhoto,
  validateHSSEWorkerDocument,
  validatePDFDocument,
  validateDocument,
} from "@/utils/fileValidation";

interface EnhancedFileUploadProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onFileChange?: (file: File | null) => void;
  uploadType: "worker-photo" | "document" | "hsse-worker" | "other";
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
  const [warnings, setWarnings] = useState<string[]>([]);
  const [localPreview, setLocalPreview] = useState<string | null>(null); // Local preview before upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError, showWarning } = useToast();
  const toastShownRef = useRef(false); // Prevent double toast
  const abortControllerRef = useRef<AbortController | null>(null); // Cancel ongoing uploads
  const uploadTokenRef = useRef<number>(0); // Track current upload attempt

  // --- Helpers UI ---
  const getAcceptTypes = () => {
    switch (uploadType) {
      case "worker-photo":
        return ".jpg,.jpeg,.png,";
      case "document":
        return ".pdf"; // Only PDF for support documents
      case "hsse-worker":
        return ".jpg,.jpeg,.png"; // Only images for HSSE worker (wajib foto)
      default:
        return ".pdf";
    }
  };

  const text = (() => {
    if (uploadType === "worker-photo") {
      return {
        title: "Unggah Foto Pekerja",
        subtitle: "Tarik & letakkan atau klik untuk memilih",
        formats: "JPG, JPEG, PNG — maks 8MB",
      };
    }
    if (uploadType === "hsse-worker") {
      return {
        title: "Unggah HSSE Pass",
        subtitle: "Tarik & letakkan atau klik untuk memilih",
        formats: "JPG, JPEG, PNG — maks 8MB (Wajib Foto)",
      };
    }
    return {
      title: "Unggah Dokumen PDF",
      subtitle: "Tarik & letakkan atau klik untuk memilih",
      formats: "PDF — maks 8MB",
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
  const validateFile = async (file: File): Promise<{ isValid: boolean; error?: string; warnings?: string[] }> => {
    console.log(`[EnhancedFileUpload.validateFile] Validating file: ${file.name}, uploadType: ${uploadType}`);
    
    try {
      let validationResult;
      
      switch (uploadType) {
        case "worker-photo":
          console.log(`[EnhancedFileUpload.validateFile] Using validateWorkerPhoto`);
          validationResult = await validateWorkerPhoto(file);
          break;
        case "document":
          console.log(`[EnhancedFileUpload.validateFile] Using validatePDFDocument`);
          validationResult = await validatePDFDocument(file);
          break;
        case "hsse-worker":
          console.log(`[EnhancedFileUpload.validateFile] Using validateHSSEWorkerDocument`);
          validationResult = await validateHSSEWorkerDocument(file);
          break;
        case "other":
          console.log(`[EnhancedFileUpload.validateFile] Using validateDocument`);
          validationResult = await validateDocument(file);
          break;
        default:
          console.error(`[EnhancedFileUpload.validateFile] ❌ Invalid uploadType: ${uploadType}`);
          return { isValid: false, error: "Tipe upload tidak valid" };
      }
      
      console.log(`[EnhancedFileUpload.validateFile] Validation completed:`, validationResult);
      
      // Build result with conditional properties to satisfy exactOptionalPropertyTypes
      const result: { isValid: boolean; error?: string; warnings?: string[] } = {
        isValid: validationResult.isValid,
      };
      
      if (validationResult.error) {
        result.error = validationResult.error;
      }
      
      if (validationResult.warnings) {
        result.warnings = validationResult.warnings;
      }
      
      return result;
    } catch (error) {
      console.error('[EnhancedFileUpload.validateFile] ❌ Validation threw exception:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Gagal memvalidasi file',
      };
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    let fileToUpload = file;

    // Compress images for worker photos and HSSE worker images
    if (uploadType === "worker-photo" || (uploadType === "hsse-worker" && file.type.startsWith('image/'))) {
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

    // Create new AbortController for this upload
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const res = await fetch(uploadEndpoint, { 
      method: "POST", 
      body: formData,
      signal: controller.signal // Allow cancellation
    });
    
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

    console.log(`[EnhancedFileUpload] File selected: ${file.name} (${file.size} bytes, type: ${file.type})`);

    // CRITICAL: Cancel any ongoing upload before starting new one
    if (abortControllerRef.current) {
      console.log('[EnhancedFileUpload] 🛑 Aborting previous upload');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Generate new upload token to track this specific upload attempt
    uploadTokenRef.current += 1;
    const currentToken = uploadTokenRef.current;
    console.log(`[EnhancedFileUpload] Starting upload with token: ${currentToken}`);

    setError(null);
    setWarnings([]);
    toastShownRef.current = false; // Reset toast flag

    // Comprehensive validation
    console.log(`[EnhancedFileUpload] Starting validation for uploadType: ${uploadType}`);
    const validation = await validateFile(file);
    console.log(`[EnhancedFileUpload] Validation result:`, validation);
    
    // Check if this upload was cancelled during validation
    if (currentToken !== uploadTokenRef.current) {
      console.log(`[EnhancedFileUpload] ⚠️ Upload cancelled during validation (token mismatch: ${currentToken} vs ${uploadTokenRef.current})`);
      return;
    }
    
    if (!validation.isValid) {
      console.error(`[EnhancedFileUpload] ❌ VALIDATION FAILED - File rejected:`, validation.error);
      setError(validation.error || "File tidak valid");
      if (!toastShownRef.current) {
        showError("Validasi Gagal", validation.error || "File tidak valid");
        toastShownRef.current = true;
      }
      return; // CRITICAL: Stop here, DO NOT upload
    }
    
    console.log(`[EnhancedFileUpload] ✅ Validation passed, proceeding to upload...`);
    
    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      setWarnings(validation.warnings);
      validation.warnings.forEach(warning => {
        showWarning("Perhatian", warning);
      });
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
      
      // Check if this upload was cancelled during upload
      if (currentToken !== uploadTokenRef.current) {
        console.log(`[EnhancedFileUpload] ⚠️ Upload cancelled after completion (token mismatch: ${currentToken} vs ${uploadTokenRef.current})`);
        return;
      }
      
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
      // Check if this was an abort (user cancelled)
      if (e instanceof Error && e.name === 'AbortError') {
        console.log('[EnhancedFileUpload] Upload aborted by user');
        return; // Silent abort, don't show error
      }
      
      // Check if this upload was cancelled
      if (currentToken !== uploadTokenRef.current) {
        console.log(`[EnhancedFileUpload] ⚠️ Upload error ignored (token mismatch: ${currentToken} vs ${uploadTokenRef.current})`);
        return;
      }
      
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
    
    // Cancel any ongoing upload
    if (abortControllerRef.current) {
      console.log('[EnhancedFileUpload] 🛑 Aborting upload (remove)');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Increment token to invalidate any pending callbacks
    uploadTokenRef.current += 1;
    
    onChange?.("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError(null);
    setWarnings([]); // Clear warnings
    setLocalPreview(null); // Clear local preview
    toastShownRef.current = false; // Reset toast flag
  };

  const handleReplace = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Cancel any ongoing upload before replacing
    if (abortControllerRef.current) {
      console.log('[EnhancedFileUpload] 🛑 Aborting upload (replace)');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Increment token to invalidate any pending callbacks
    uploadTokenRef.current += 1;
    
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
              Mengunggah{uploadType === "worker-photo" || (uploadType === "hsse-worker" && localPreview) ? " & mengompres" : ""}…
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
            ) : uploadType === "hsse-worker" ? (
              <div className="flex items-center gap-2">
                <PhotoIcon className="h-10 w-10 text-blue-500" />

              </div>
            ) : (
              <DocumentIcon className="h-10 w-10 text-blue-500" />
            )}
            <p className="mt-3 text-sm font-medium text-gray-900">{text.title}</p>
            <p className="mt-1 text-xs text-gray-600">{text.subtitle}</p>
            <p className="mt-1 text-xs text-gray-400">{text.formats}</p>
          </div>
        )}
      </div>

      {/* Warning Messages */}
      {warnings.length > 0 && !error && (
        <div className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-yellow-800">Perhatian:</p>
              <ul className="mt-1.5 space-y-1 text-xs text-yellow-700">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span className="flex-1">{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bantuan & Error */}
      {description && !error && warnings.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
