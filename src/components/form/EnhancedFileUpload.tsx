"use client";

import { useState, useRef } from "react";
import {
  DocumentIcon,
  XMarkIcon,
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
        formats: "JPG, JPEG, PNG, WebP — maks 10MB (dikompres otomatis)",
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

  const handleRemove = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange?.("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError(null);
  };

  const handleReplace = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    fileInputRef.current?.click();
  };

  // --- Render ---
  const fileName = fileNameFromUrl(value);
  const hasFile = Boolean(value);
  const isImage = uploadType === "worker-photo";

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
        ) : /* ================ STATE: HAS FILE ================ */ hasFile ? (
          isImage ? (
            /* FOTO → preview rapih & tidak melebihi komponen */
            <div
              className="relative mx-auto flex max-w-full flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full max-w-[360px] overflow-hidden rounded-lg border bg-white">
                {/* Kotak rasio agar tinggi terkontrol (4:3). Gambar absolute agar tidak overflow */}
                <div className="relative w-full aspect-[4/3]">
                  <img
                    src={value}
                    alt={workerName ? `Foto ${workerName}` : "Foto pekerja"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>

                {/* Overlay hover (tetap di dalam kontainer, tidak melebihi) */}
                <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
                  <div className="pointer-events-auto flex gap-2">
                    <button
                      type="button"
                      onClick={handleReplace}
                      className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow hover:bg-white"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-2 text-sm font-medium text-red-600 shadow hover:bg-white"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>

              {/* filename + helper */}
              <div className="text-center">
                <div
                  className="mx-auto max-w-[280px] truncate text-sm font-medium text-gray-900 sm:max-w-[360px]"
                  title={fileName}
                >
                  {fileName || "foto-terunggah"}
                </div>
                {workerName && (
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    Untuk: <span className="font-medium">{workerName}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* DOKUMEN → kartu file */
            <div
              className="relative mx-auto flex max-w-full flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex w-full max-w-[420px] items-center gap-3 rounded-lg border bg-white p-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-gray-50">
                  <DocumentIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-sm font-medium text-gray-900"
                    title={fileName}
                  >
                    {fileName || "file-terunggah"}
                  </div>
                  <div className="truncate text-xs text-gray-500">{value}</div>
                </div>

                {/* Overlay hover */}
                <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                  <div className="pointer-events-auto flex gap-2">
                    <button
                      type="button"
                      onClick={handleReplace}
                      className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow hover:bg-white"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-2 text-sm font-medium text-red-600 shadow hover:bg-white"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          /* ================ STATE: EMPTY ================ */
          <div className="text-center">
            {uploadType === "worker-photo" ? (
              <PhotoIcon className="mx-auto h-10 w-10 text-blue-500" />
            ) : (
              <DocumentIcon className="mx-auto h-10 w-10 text-blue-500" />
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
