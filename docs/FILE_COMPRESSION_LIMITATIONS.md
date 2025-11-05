# File Compression Limitations & Solutions

**Created**: November 5, 2025  
**Issue**: File upload compression tidak efektif - file 2.7MB tetap 2.7MB di server

---

## 🔍 Root Cause Analysis

### PDF Compression Reality

**FAKTA**: `pdf-lib` library **TIDAK** mengkompresi konten internal PDF seperti:
- ❌ Images embedded dalam PDF (90% dari ukuran file)
- ❌ Fonts embedded
- ❌ Vector graphics
- ❌ Stream objects

**Yang dikompres pdf-lib**:
- ✅ Metadata (title, author, etc.) - **~1-5% saving**
- ✅ Object structure optimization - **~5-15% saving**
- ✅ Duplicate object removal - **~0-10% saving**

**Total realistic compression: 10-30% untuk PDF yang tidak teroptimasi**

### DOCX Compression Reality

**FAKTA**: DOCX sudah dalam format ZIP (compressed)
- GZIP compression pada DOCX memberikan **minimal benefit** (~0-5%)
- Malah bisa **membuat file lebih besar** karena double compression overhead

---

## ✅ Real Solutions

### Solution 1: Client-Side Compression (RECOMMENDED) ⭐

**Approach**: Compress BEFORE upload menggunakan browser libraries

#### Implementasi:

```typescript
// Install: npm install browser-image-compression pdf-lib-browser

// For PDF compression (client-side)
import { compress } from 'browser-pdf-compression';

async function compressPDFBeforeUpload(file: File): Promise<File> {
  const options = {
    quality: 0.7,           // 70% quality
    maxSizeMB: 1,          // Target max 1MB
    maxWidthOrHeight: 1920, // Max image dimension
    useWebWorker: true,
  };
  
  const compressedFile = await compress(file, options);
  return compressedFile;
}

// For Images (client-side)
import imageCompression from 'browser-image-compression';

async function compressImageBeforeUpload(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,        // Max 500KB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg', // Convert to JPEG
  };
  
  return await imageCompression(file, options);
}
```

**Benefits**:
- ✅ **50-70% compression** untuk PDF dengan images
- ✅ **60-80% compression** untuk photos
- ✅ Mengurangi bandwidth upload
- ✅ Faster uploads
- ✅ Less server storage

---

### Solution 2: External PDF Compression Service

**Approach**: Gunakan Ghostscript atau commercial API

#### Option 2A: Ghostscript (Free, Server-side)

```bash
# Install Ghostscript
sudo apt-get install ghostscript

# Compress PDF command
gs -sDEVICE=pdfwrite \
   -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=output.pdf \
   input.pdf
```

**Implementation**:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function compressPDFWithGhostscript(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;
  
  await execAsync(command);
}
```

**Compression levels**:
- `/screen` - Lowest quality, smallest size (72 DPI)
- `/ebook` - Medium quality, medium size (150 DPI) ⭐ RECOMMENDED
- `/printer` - High quality (300 DPI)
- `/prepress` - Highest quality (300 DPI, color preserved)

**Benefits**:
- ✅ **50-80% compression** rata-rata
- ✅ Handles images, fonts, everything
- ✅ Industry standard

**Drawbacks**:
- ❌ Requires system dependency
- ❌ Slower (CPU intensive)
- ❌ Need to manage temp files

---

#### Option 2B: Commercial API (Smallpdf, Adobe, etc.)

```typescript
// Example with iLovePDF API
import iLovePDFApi from '@ilovepdf/ilovepdf-nodejs';

async function compressWithAPI(buffer: Buffer): Promise<Buffer> {
  const api = new iLovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY);
  const task = api.newTask('compress');
  
  await task.start();
  await task.addFile(buffer);
  await task.process({ compression_level: 'recommended' });
  
  const compressedBuffer = await task.download();
  return compressedBuffer;
}
```

**Benefits**:
- ✅ Best compression (70-90%)
- ✅ No server dependencies
- ✅ Fast processing

**Drawbacks**:
- ❌ Cost (pay per file)
- ❌ External dependency
- ❌ Privacy concerns

---

### Solution 3: Strict Size Limits + User Education

**Approach**: Enforce limits dan guide user untuk compress sebelum upload

```typescript
// Update max file size
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max (dari 8MB)

// Add helper text di UI
<div className="text-sm text-gray-600 mt-2">
  <p>💡 Tips mengurangi ukuran file:</p>
  <ul className="list-disc ml-5 mt-1">
    <li>PDF: Gunakan "Save as Reduced Size" di Adobe Reader</li>
    <li>Gambar: Compress di <a href="https://tinypng.com">TinyPNG</a> atau <a href="https://compressor.io">Compressor.io</a></li>
    <li>DOC/DOCX: Compress gambar di dalam dokumen (Picture Tools → Compress)</li>
  </ul>
</div>
```

---

### Solution 4: Hybrid Approach (BEST PRACTICE) ⭐⭐⭐

**Combine multiple strategies**:

```typescript
// 1. Client-side compression (primary)
async function handleFileUpload(file: File) {
  let compressedFile = file;
  
  // Compress PDF client-side
  if (file.type === 'application/pdf') {
    compressedFile = await compressPDFClient(file);
  }
  
  // Compress images client-side
  if (file.type.startsWith('image/')) {
    compressedFile = await compressImageClient(file);
  }
  
  // Upload compressed file
  await uploadFile(compressedFile);
}

// 2. Server-side validation + optimization
export async function POST(request: NextRequest) {
  // ... auth checks ...
  
  let buffer = Buffer.from(await file.arrayBuffer());
  
  // Server-side optimization as fallback
  if (file.type === 'application/pdf') {
    const result = await PDFCompressor.compressPDF(buffer);
    if (result.compressionApplied) {
      buffer = result.buffer;
    }
  }
  
  // Save optimized file
  await fileManager.saveFile(buffer, file.name, userId);
}
```

---

## 📊 Compression Comparison

| Method | PDF (with images) | Images | DOCX | Implementation |
|--------|------------------|---------|------|----------------|
| **pdf-lib** | 10-30% | N/A | N/A | ✅ Currently implemented |
| **Client-side** | 50-70% | 60-80% | N/A | ⭐ RECOMMENDED |
| **Ghostscript** | 50-80% | N/A | N/A | Requires system dependency |
| **Commercial API** | 70-90% | 70-90% | 50-70% | Paid service |
| **GZIP on DOCX** | N/A | N/A | 0-5% | ❌ Ineffective |

---

## 🎯 Recommended Action Plan

### Immediate (This Sprint)
1. ✅ **Update documentation** tentang limitation
2. ✅ **Add client-side compression** untuk images
3. ✅ **Lower max file size** dari 8MB → 2MB
4. ✅ **Add user guidance** di UI

### Short-term (Next Sprint)
1. **Implement Ghostscript** untuk server-side PDF compression
2. **Add compression progress indicator** di UI
3. **Implement file preview** sebelum upload

### Long-term (Future)
1. Evaluate **commercial API** untuk production
2. Implement **background job processing** untuk compression
3. Add **CDN** untuk file serving

---

## 🔧 Current Implementation Status

### What's Working
- ✅ PDF structure optimization (10-30% for unoptimized PDFs)
- ✅ Metadata removal
- ✅ File validation
- ✅ Rate limiting

### What's NOT Working
- ❌ PDF image compression (pdf-lib limitation)
- ❌ DOCX compression (already compressed format)
- ❌ Image compression (not implemented)

### What's Needed
- 🔲 Client-side compression library
- 🔲 Ghostscript integration OR commercial API
- 🔲 Better user guidance
- 🔲 Compression progress feedback

---

## 💡 Developer Notes

**Why client-side compression is better**:
1. **Bandwidth**: User uploads smaller files
2. **Speed**: Faster uploads, better UX
3. **Server Load**: Less processing on server
4. **Storage**: Smaller files from the start
5. **User Control**: User sees compression happening

**Why server-side is still needed**:
1. **Fallback**: Not all clients support it
2. **Security**: Validate file integrity
3. **Consistency**: Ensure all files are optimized
4. **Legacy**: Handle files uploaded via API/mobile

---

## 📚 References

- [pdf-lib documentation](https://pdf-lib.js.org/)
- [Ghostscript PDF optimization](https://www.ghostscript.com/doc/current/VectorDevices.htm)
- [Browser Image Compression](https://www.npmjs.com/package/browser-image-compression)
- [File compression best practices](https://web.dev/compress-images/)
