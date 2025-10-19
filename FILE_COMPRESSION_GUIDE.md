# File Compression Guide - SIMLOK

Dokumentasi lengkap untuk sistem kompresi file otomatis di aplikasi SIMLOK.

## 📋 Overview

Sistem ini mengompres file secara otomatis sebelum upload ke server untuk:
- ✅ Menghemat bandwidth
- ✅ Mempercepat upload
- ✅ Mengurangi storage server
- ✅ Meningkatkan performa aplikasi

## 🎯 Fitur Utama

### 1. **Kompresi Gambar**
- Format: JPEG, PNG, WebP
- Auto-konversi PNG → JPEG jika tidak ada transparansi
- Penyesuaian kualitas otomatis
- Maintain aspect ratio
- High-quality image smoothing

### 2. **Kompresi Dokumen**
- Support gambar dokumen (scan SIKA, SIMJA, HSSE)
- Kualitas tinggi untuk readability
- Ukuran optimal untuk penyimpanan

### 3. **Smart Compression**
- Skip file yang sudah kecil (< 100KB default)
- Iterative quality adjustment
- Target size compliance
- Metadata preservation (opsional)

## 📦 Installation

Tidak perlu instalasi tambahan! Semua dependencies sudah termasuk dalam Next.js.

## 🚀 Cara Penggunaan

### Metode 1: Menggunakan FileCompressor Class (Recommended)

```typescript
import { FileCompressor } from '@/utils/file-compressor';

// Kompres file apapun (auto-detect type)
const result = await FileCompressor.compressFile(file, {
  maxSizeKB: 500,
  quality: 0.85
});

console.log('Original:', result.originalSize);
console.log('Compressed:', result.compressedSize);
console.log('Saved:', result.compressionRatio + '%');

// Gunakan file yang sudah dikompres
const compressedFile = result.file;
```

### Metode 2: Menggunakan Komponen FileUploadWithCompression

```tsx
import FileUploadWithCompression from '@/components/common/FileUploadWithCompression';

function MyComponent() {
  const handleFileSelected = async (file: File, result) => {
    console.log('File compressed:', result);
    // Upload file ke server
    await uploadToServer(file);
  };

  return (
    <FileUploadWithCompression
      onFileSelected={handleFileSelected}
      compressionMode="worker-photo"
      maxSizeKB={500}
      showCompressionStats={true}
    />
  );
}
```

### Metode 3: Menggunakan React Hook

```tsx
import { useFileCompression } from '@/utils/file-compressor';

function MyForm() {
  const { compressFile, isCompressing, progress } = useFileCompression();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const result = await compressFile(file, { maxSizeKB: 500 });
    
    // Upload compressed file
    await uploadFile(result.file);
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={isCompressing} />
      {isCompressing && <p>Compressing: {progress}%</p>}
    </div>
  );
}
```

## 📸 Use Cases Spesifik

### 1. Foto Pekerja
```typescript
const result = await FileCompressor.compressWorkerPhoto(file, {
  maxWidth: 800,
  maxHeight: 1000,
  quality: 0.85,
  maxSizeKB: 500
});
```

**Default Settings:**
- Max dimension: 800x1000px
- Quality: 85%
- Max size: 500KB
- Format: JPEG

### 2. Dokumen HSSE/SIKA/SIMJA
```typescript
const result = await FileCompressor.compressDocument(file, {
  maxWidth: 2480,  // A4 @ 300 DPI
  maxHeight: 3508,
  quality: 0.90,   // Higher quality for readability
  maxSizeKB: 1500
});
```

**Default Settings:**
- Max dimension: 2480x3508px (A4 size)
- Quality: 90% (higher for document clarity)
- Max size: 1500KB
- Format: JPEG

### 3. Batch Compression
```typescript
const files = [file1, file2, file3];
const results = await FileCompressor.compressMultiple(files, {
  maxSizeKB: 800
});

results.forEach((result, index) => {
  console.log(`File ${index + 1}:`, FileCompressor.getCompressionStats(result));
});
```

## ⚙️ Configuration Options

### FileCompressionOptions

```typescript
interface FileCompressionOptions {
  // Image options
  maxWidth?: number;          // Default: 1920
  maxHeight?: number;         // Default: 1080
  quality?: number;           // Default: 0.85 (85%)
  outputFormat?: 'jpeg' | 'png' | 'webp'; // Default: 'jpeg'
  
  // Universal options
  maxSizeKB?: number;         // Default: 800
  preserveMetadata?: boolean; // Default: false
  
  // PDF options
  compressPDF?: boolean;      // Default: true
  
  // Behavior
  skipIfSmall?: boolean;      // Default: true
  skipThresholdKB?: number;   // Default: 100
}
```

## 🎨 Compression Modes

| Mode | Use Case | Max Size | Quality |
|------|----------|----------|---------|
| `auto` | General files | 800KB | 85% |
| `worker-photo` | Passport photos | 500KB | 85% |
| `document` | Scanned documents | 1500KB | 90% |
| `none` | Skip compression | - | 100% |

## 📊 Compression Stats

```typescript
const stats = FileCompressor.getCompressionStats(result);
// Output: "2.5 MB → 450 KB (hemat 82%)"

// Manual formatting
console.log('Original:', FileCompressor.formatBytes(result.originalSize));
console.log('Compressed:', FileCompressor.formatBytes(result.compressedSize));
console.log('Ratio:', result.compressionRatio + '%');
```

## 🔧 Integration dengan Form Upload

### Example: Vendor Submission Form

```tsx
import { FileCompressor } from '@/utils/file-compressor';

function SubmissionForm() {
  const [workerPhoto, setWorkerPhoto] = useState<File | null>(null);
  const [hsseDocument, setHsseDocument] = useState<File | null>(null);

  const handleWorkerPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress foto pekerja
      const result = await FileCompressor.compressWorkerPhoto(file);
      
      if (result.compressionRatio > 0) {
        showToast(`File dikompres ${result.compressionRatio}%`, 'success');
      }
      
      setWorkerPhoto(result.file);
    } catch (error) {
      showToast('Gagal mengompres foto', 'error');
    }
  };

  const handleHsseDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress dokumen HSSE
      const result = await FileCompressor.compressDocument(file);
      setHsseDocument(result.file);
    } catch (error) {
      showToast('Gagal mengompres dokumen', 'error');
    }
  };

  return (
    <form>
      <div>
        <label>Foto Pekerja</label>
        <input type="file" accept="image/*" onChange={handleWorkerPhotoChange} />
      </div>
      
      <div>
        <label>Dokumen HSSE</label>
        <input type="file" accept="image/*,.pdf" onChange={handleHsseDocumentChange} />
      </div>
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

## 🎯 Best Practices

### 1. **Compress Before Upload**
```typescript
// ✅ GOOD - Compress dulu sebelum upload
const compressed = await FileCompressor.compressFile(file);
await uploadToServer(compressed.file);

// ❌ BAD - Upload file original
await uploadToServer(file);
```

### 2. **Show Progress to User**
```typescript
const { compressFile, isCompressing, progress } = useFileCompression();

return (
  <div>
    <input onChange={handleFile} disabled={isCompressing} />
    {isCompressing && (
      <div className="progress-bar">
        <div style={{ width: `${progress}%` }} />
      </div>
    )}
  </div>
);
```

### 3. **Handle Errors Gracefully**
```typescript
try {
  const result = await FileCompressor.compressFile(file);
  await uploadFile(result.file);
} catch (error) {
  console.error('Compression failed:', error);
  // Fallback: upload original file
  await uploadFile(file);
}
```

### 4. **Show Compression Stats**
```typescript
const result = await FileCompressor.compressFile(file);

if (result.compressionApplied && result.compressionRatio > 10) {
  showSuccessToast(
    `File berhasil dikompres! Hemat ${result.compressionRatio}% storage`
  );
}
```

## 🔍 Troubleshooting

### Problem: File terlalu besar setelah kompresi
**Solution:** Turunkan `maxSizeKB` atau `quality`
```typescript
const result = await FileCompressor.compressFile(file, {
  maxSizeKB: 300,  // Lower target size
  quality: 0.75    // Lower quality
});
```

### Problem: Kualitas gambar terlalu rendah
**Solution:** Naikkan `quality` dan `maxSizeKB`
```typescript
const result = await FileCompressor.compressFile(file, {
  quality: 0.92,   // Higher quality
  maxSizeKB: 1000  // Allow larger size
});
```

### Problem: PNG dengan transparansi jadi JPEG
**Solution:** Set `preserveMetadata` atau force format PNG
```typescript
const result = await FileCompressor.compressFile(file, {
  outputFormat: 'png',
  preserveMetadata: true
});
```

### Problem: Kompresi terlalu lama
**Solution:** Set `maxWidth` dan `maxHeight` lebih kecil
```typescript
const result = await FileCompressor.compressFile(file, {
  maxWidth: 1280,
  maxHeight: 720
});
```

## 📈 Performance Tips

1. **Compress on Client-Side** - Hemat bandwidth dan server CPU
2. **Use WebP for Modern Browsers** - Better compression ratio
3. **Batch Compress Async** - Don't block UI
4. **Show Progress** - Better UX for large files
5. **Skip Small Files** - No need to compress < 100KB

## 🧪 Testing

```typescript
// Test compression
import { FileCompressor } from '@/utils/file-compressor';

describe('FileCompressor', () => {
  it('should compress image file', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = await FileCompressor.compressFile(mockFile);
    
    expect(result.compressedSize).toBeLessThan(result.originalSize);
    expect(result.compressionRatio).toBeGreaterThan(0);
  });
});
```

## 📚 Additional Resources

- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Image Compression Best Practices](https://web.dev/compress-images/)
- [WebP Format Guide](https://developers.google.com/speed/webp)

## 🆘 Support

Jika mengalami masalah:
1. Check console untuk error messages
2. Verify file type dan size
3. Test dengan file sample
4. Check browser compatibility

---

**Last Updated:** October 2025  
**Version:** 1.0.0
