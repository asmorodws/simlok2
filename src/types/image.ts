/**
 * Image compression related types and interfaces
 */

export interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxSizeKB?: number;
  outputFormat?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}