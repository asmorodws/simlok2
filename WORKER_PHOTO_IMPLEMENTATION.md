# Worker Photo Storage Implementation

## Ringkasan Perubahan

### 1. FileManager Enhancement
- **File:** `src/lib/fileManager.ts`
- **Perubahan:**
  - Menambah dukungan kategori `worker-photo` yang disimpan di folder `foto-pekerja`
  - Menambah method `saveWorkerPhoto()` khusus untuk foto pekerja dengan naming convention nama pekerja
  - Update semua interface dan type definitions untuk mendukung kategori baru

### 2. PDF Template Optimization
- **File:** `src/utils/pdf/simlokTemplate.ts`
- **Perubahan:**
  - Menghapus logic fallback path yang berlebihan
  - Menggunakan single path resolution berdasarkan API structure
  - Menambah mapping untuk kategori `worker-photo` → `foto-pekerja`

### 3. API Endpoints
- **File Baru:** `src/app/api/upload/worker-photo/route.ts`
  - Endpoint khusus untuk upload foto pekerja
  - Validasi khusus untuk file gambar saja
  - Menggunakan nama pekerja sebagai basis filename

- **File Updated:** `src/app/api/files/[userId]/[category]/[filename]/route.ts`
  - Menambah support untuk serve files dari kategori `worker-photo`

## Struktur Folder Storage

```
public/uploads/
└── {userId}/
    ├── dokumen-sika/        # SIKA documents
    ├── dokumen-simja/       # SIMJA documents  
    ├── id-card/            # ID card photos
    ├── lainnya/            # Other documents
    └── foto-pekerja/       # Worker photos (NEW)
        ├── John_Doe_1642123456789.jpg
        ├── Jane_Smith_1642123456790.png
        └── ...
```

## Filename Convention

### Worker Photos
- **Format:** `{CleanWorkerName}_{Timestamp}.{extension}`
- **Contoh:** 
  - Input: "John Doe" → Output: "John_Doe_1642123456789.jpg"
  - Input: "Siti Nurhaliza" → Output: "Siti_Nurhaliza_1642123456790.png"

### Regular Files
- **Format:** `{CategoryPrefix}_{Timestamp}_{RandomString}_{CleanOriginalName}.{extension}`
- **Contoh:** "SIKA_1642123456789_a1b2_document.pdf"

## API Usage

### Upload Worker Photo
```typescript
// POST /api/upload/worker-photo
const formData = new FormData();
formData.append('file', photoFile);
formData.append('workerName', 'John Doe');

const response = await fetch('/api/upload/worker-photo', {
  method: 'POST',
  body: formData
});

// Response:
{
  "success": true,
  "url": "/api/files/user123/worker-photo/John_Doe_1642123456789.jpg",
  "filename": "John_Doe_1642123456789.jpg",
  "workerName": "John Doe",
  "category": "worker-photo"
}
```

### Access Worker Photo
```typescript
// GET /api/files/{userId}/worker-photo/{filename}
const photoUrl = "/api/files/user123/worker-photo/John_Doe_1642123456789.jpg";
```

## PDF Integration

Sekarang PDF generator akan:
1. ✅ Menggunakan single path resolution (tidak ada multiple fallback)
2. ✅ Mendukung kategori `worker-photo` dengan mapping ke folder `foto-pekerja`
3. ✅ Menampilkan foto pekerja pada halaman kedua PDF SIMLOK

## Frontend Integration

Contoh penggunaan komponen tersedia di:
- `examples/worker-photo-upload.tsx`

## Migration Notes

Untuk project yang sudah ada:
1. Foto pekerja lama mungkin tersimpan di kategori `other` atau folder lain
2. Gunakan method `fileManager.migrateExistingFiles()` jika diperlukan
3. Atau manual move files ke folder `foto-pekerja` dengan naming convention baru

## Benefits

1. **Organized Storage:** Foto pekerja tersimpan terpisah di folder khusus
2. **Meaningful Filenames:** Filename menggunakan nama pekerja, mudah diidentifikasi
3. **Better Performance:** Single path resolution menghilangkan overhead pencarian
4. **Type Safety:** Full TypeScript support untuk kategori baru
5. **API Consistency:** Endpoint khusus dengan validasi sesuai kebutuhan

## Testing

```bash
# Test upload foto pekerja
curl -X POST /api/upload/worker-photo \
  -F "file=@john_photo.jpg" \
  -F "workerName=John Doe"

# Test akses foto
curl /api/files/user123/worker-photo/John_Doe_1642123456789.jpg
```
