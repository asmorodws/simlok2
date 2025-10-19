# 📦 File Compression System

Sistem kompresi file otomatis untuk aplikasi SIMLOK yang menghemat bandwidth dan storage.

## 🚀 Quick Start

### Basic Usage

```typescript
import { FileCompressor } from '@/utils/file-compressor';

// Compress any file
const result = await FileCompressor.compressFile(file);
console.log(`Saved ${result.compressionRatio}%`);
```

### Common Use Cases

**1. Foto Pekerja (Worker Photo)**
```typescript
const result = await FileCompressor.compressWorkerPhoto(file);
// Output: 800x1000px, quality 85%, max 500KB
```

**2. Dokumen HSSE/SIKA/SIMJA**
```typescript
const result = await FileCompressor.compressDocument(file);
// Output: 2480x3508px (A4), quality 90%, max 1500KB
```

**3. Multiple Files**
```typescript
const results = await FileCompressor.compressMultiple([file1, file2, file3]);
```

### React Component

```tsx
import FileUploadWithCompression from '@/components/common/FileUploadWithCompression';

<FileUploadWithCompression
  onFileSelected={(file) => handleUpload(file)}
  compressionMode="worker-photo"
  showCompressionStats={true}
/>
```

### React Hook

```tsx
import { useFileCompression } from '@/utils/file-compressor';

const { compressFile, isCompressing, progress } = useFileCompression();

const handleFile = async (e) => {
  const result = await compressFile(e.target.files[0]);
  await uploadToServer(result.file);
};
```

## ⚙️ Configuration

```typescript
interface FileCompressionOptions {
  maxWidth?: number;          // Default: 1920px
  maxHeight?: number;         // Default: 1080px
  quality?: number;           // Default: 0.85 (85%)
  outputFormat?: 'jpeg' | 'png' | 'webp';
  maxSizeKB?: number;         // Default: 800KB
  skipIfSmall?: boolean;      // Default: true
  skipThresholdKB?: number;   // Default: 100KB
}
```

## 📊 Compression Results

```typescript
interface FileCompressionResult {
  file: File;                 // Compressed file
  originalSize: number;       // Original size in bytes
  compressedSize: number;     // Compressed size in bytes
  compressionRatio: number;   // Percentage saved (0-100)
  compressionApplied: boolean;
  format: string;
  width?: number;
  height?: number;
  duration?: number;          // Processing time in ms
}
```

## 🎯 Compression Modes

| Mode | Target | Max Size | Quality | Use Case |
|------|--------|----------|---------|----------|
| `worker-photo` | 800x1000 | 500KB | 85% | ID photos |
| `document` | 2480x3508 | 1500KB | 90% | Scanned docs |
| `auto` | 1920x1080 | 800KB | 85% | General files |
| `none` | Original | - | 100% | Skip compression |

## 📈 Performance

- **Average compression ratio**: 60-85% size reduction
- **Processing time**: 100-500ms per image
- **Client-side processing**: No server load
- **Automatic quality adjustment**: Ensures target size

## 💡 Tips

1. **Always compress before upload** - Save bandwidth
2. **Show progress for large files** - Better UX
3. **Handle errors gracefully** - Fallback to original
4. **Skip small files** - Already optimized (< 100KB)

## 📚 Documentation

See [FILE_COMPRESSION_GUIDE.md](./FILE_COMPRESSION_GUIDE.md) for complete documentation.

## 🔧 Integration Examples

See [src/examples/file-compression-examples.tsx](./src/examples/file-compression-examples.tsx) for real-world examples.

---

**Created**: October 2025  
**Status**: ✅ Production Ready
