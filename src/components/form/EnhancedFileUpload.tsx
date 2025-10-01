"use client";

import { useState, useRef } from "react";
import {
  DocumentIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  PhotoIcon,
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
}: EnhancedFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();

  // --- Helpers UI ---
  const getAcceptTypes = () => {
    switch (uploadType) {
      case "worker-photo":
        return ".jpg,.jpeg,.png";
      case "document":
        return ".pdf,.doc,.docx,.jpg,.jpeg,.png";
      default:
        return ".pdf,.doc,.docx,.jpg,.jpeg,.png";
    }
  };

  const getIcon = () =>
    uploadType === "worker-photo" ? (
      <PhotoIcon className="mx-auto h-10 w-10 text-blue-500" />
    ) : (
      <DocumentIcon className="mx-auto h-10 w-10 text-blue-500" />
    );

  const getText = () => {
    if (uploadType === "worker-photo") {
      return {
        title: "Unggah Foto Pekerja",
        subtitle: "Tarik & letakkan atau klik untuk memilih",
        formats: "JPG, JPEG, PNG — maks 10MB (dikompres otomatis)",
      };
    }
    return {
      title: "Unggah Dokumen",
      subtitle: "Tarik & letakkan atau klik untuk memilih",
      formats: "PDF, DOC, DOCX, JPG, PNG — maks 8MB",
    };
  };

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
    if (!file) return; // guard TS: File | undefined

    setError(null);

    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error || "File tidak valid");
      return;
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
      showSuccess("Berhasil", "File berhasil diunggah");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal mengunggah file";
      setError(msg);
      showError("Gagal", msg);
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

  const handleRemove = () => {
    onChange?.("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError(null);
  };

  // --- Render ---
  const text = getText();
  const fileName = fileNameFromUrl(value);

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
          "relative rounded-xl border-2 border-dashed p-6 transition",
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

        {/* Konten */}
        {uploading ? (
          <div className="text-center">
            <CloudArrowUpIcon className="mx-auto h-10 w-10 text-blue-500 animate-bounce" />
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
        ) : value ? (
          <div className="flex flex-col items-center text-center">
            {getIcon()}
            <div className="mt-3 max-w-full">
              {/* Nama file dengan ellipsis */}
              <div
                className="mx-auto max-w-[280px] truncate text-sm font-medium text-gray-900 sm:max-w-[360px]"
                title={fileName}
                aria-label={`File terunggah: ${fileName}`}
              >
                {fileName || "file-terunggah"}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                >
                  <XMarkIcon className="mr-1 h-3 w-3" />
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center rounded-md border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
                >
                  Ganti File
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {getIcon()}
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
