# Implementasi Scan Location pada QR Scan

## Overview
Fitur scan location telah ditambahkan ke sistem QR scanning untuk melacak lokasi dimana verifikator melakukan scan barcode/QR code. Lokasi diambil dari alamat verifikator yang tersimpan di database.

## Perubahan Database

### 1. **Schema Prisma** 
```prisma
model QrScan {
  id            String     @id @default(cuid())
  submission_id String
  scanned_by    String
  scanned_at    DateTime   @default(now())
  scanner_name  String?    // Optional: name of the person who scanned
  scan_location String?    // NEW: Location where the scan was performed
  notes         String?    // Optional: additional notes about the scan
  // ... other fields
}
```

### 2. **Migration**
- **File**: `prisma/migrations/20250927182942_add_scan_location_to_qr_scan/migration.sql`
- **Query**: `ALTER TABLE QrScan ADD COLUMN scan_location VARCHAR(191) NULL;`

## Implementasi Backend

### 1. **API QR Verify** (`/api/qr/verify/route.ts`)
```typescript
// Mengambil alamat user dari database
const userExists = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { 
    id: true, 
    email: true, 
    role: true, 
    officer_name: true, 
    address: true  // NEW: Include address
  }
});

// Menyimpan scan_location dari alamat verifikator
const scanRecord = await prisma.qrScan.create({
  data: {
    submission_id: qrPayload.id,
    scanned_by: session.user.id,
    scanner_name: userExists.officer_name || session.user.officer_name,
    scan_location: userExists.address || 'Lokasi tidak tersedia',  // NEW
    notes: scanNotes || `Scanned via ${scanner_type || 'scanner'} at: ${scanLocation || 'Unknown location'}`,
  },
});
```

### 2. **API Response**
Semua endpoint yang mengembalikan data `QrScan` sekarang otomatis menyertakan `scan_location`:
- `/api/qr/verify` (GET) - Scan history
- `/api/submissions/[id]/scans` - Scan history per submission

## Implementasi Frontend

### 1. **ScanHistory Component**
**Location**: `src/components/scanner/ScanHistory.tsx`

#### Interface Update:
```typescript
interface ScanHistoryItem {
  id: string;
  scanned_at: string;
  scanner_name?: string;
  scan_location?: string;  // NEW
  notes?: string;
  // ... other fields
}
```

#### Display in List View:
```tsx
{/* Scan Location */}
{scan.scan_location && (
  <div className="flex items-center text-sm">
    <MapPinIcon className="h-4 w-4 text-orange-400 mr-2" />
    <div>
      <span className="text-gray-600">Lokasi Scan:</span>
      <span className="ml-1 font-medium text-orange-600">{scan.scan_location}</span>
    </div>
  </div>
)}
```

#### Display in Detail Modal:
```tsx
{/* Scan Location */}
{selectedScan.scan_location && (
  <div className="pt-4 border-t border-gray-200">
    <div className="flex items-center">
      <MapPinIcon className="h-5 w-5 text-orange-500 mr-2" />
      <span className="block font-medium text-gray-600 mb-2">Scan Location</span>
    </div>
    <div className="bg-orange-50 p-3 rounded-md text-sm text-orange-700 border-l-4 border-orange-200">
      {selectedScan.scan_location}
    </div>
  </div>
)}
```

## User Experience

### 1. **Data Source**
- **Sumber**: Alamat verifikator dari field `User.address`
- **Fallback**: "Lokasi tidak tersedia" jika alamat kosong
- **Format**: Teks bebas sesuai input verifikator saat registrasi

### 2. **Display**
- **Icon**: MapPinIcon (Heroicons) dengan warna orange
- **List View**: Tampil sebagai badge dengan icon di bawah informasi submission
- **Detail Modal**: Section terpisah dengan background orange dan border kiri
- **Conditional**: Hanya tampil jika `scan_location` tidak kosong

### 3. **Visual Design**
- **Color Scheme**: Orange (bg-orange-50, text-orange-600/700, border-orange-200)
- **Icon**: MapPinIcon dari Heroicons
- **Layout**: Konsisten dengan elemen UI lainnya (Notes, dll)

## Benefits

### 1. **Audit Trail**
- Melacak lokasi fisik dimana scan dilakukan
- Membantu verifikasi bahwa scan dilakukan di lokasi yang tepat
- Audit compliance untuk keperluan pelaporan

### 2. **Koordinasi Tim**
- Team dapat mengetahui verifikator mana yang bertugas di area tertentu
- Membantu planning dan scheduling verifikator
- Menghindari duplikasi coverage area

### 3. **Quality Assurance**
- Memastikan verifikator berada di lokasi yang sesuai
- Cross-reference dengan lokasi proyek SIMLOK
- Deteksi anomali jika scan dilakukan dari lokasi yang tidak wajar

## Technical Notes

### 1. **Performance**
- Kolom `scan_location` tidak diindex karena digunakan untuk display saja
- Tidak mempengaruhi query performance yang ada
- Backward compatible dengan scan records yang sudah ada

### 2. **Data Privacy**
- Menggunakan alamat dari user profile (data yang sudah tersedia)
- Tidak menggunakan GPS/geolocation untuk privacy
- User dapat update alamat di profile jika perlu

### 3. **Fallback Handling**
- Graceful degradation jika address user kosong
- UI component tidak crash jika scan_location null/undefined
- Conditional rendering untuk menghindari empty sections

---

**Implementation Date**: September 28, 2025  
**Developer**: Assistant AI  
**Version**: 3.0.0 - Scan Location Tracking  
**Previous Version**: 2.0.0 - Daily Scan Flow  