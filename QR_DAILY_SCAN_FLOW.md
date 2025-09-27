# Implementasi Flow QR Scanning Harian untuk Verifier

## Overview
Sistem scanning QR code telah diperbarui untuk menerapkan aturan scanning harian yang mencegah duplikasi scan pada hari yang sama dan memberikan informasi yang jelas kepada verifikator tentang status scan.

## Aturan Scanning

### 1. **Satu Scan Per Verifikator Per Hari**
- Setiap verifikator hanya dapat memindai SIMLOK yang sama **sekali dalam satu hari**
- Jika verifikator yang sama mencoba scan lagi di hari yang sama, akan muncul pesan:
  ```
  "Anda sudah melakukan scan untuk SIMLOK ini hari ini pada [waktu]. 
  Verifikator yang sama tidak dapat scan SIMLOK yang sama di hari yang sama."
  ```

### 2. **Verifikator Berbeda Dapat Scan SIMLOK yang Sama**
- **PERUBAHAN BARU**: Verifikator yang berbeda DIPERBOLEHKAN memindai SIMLOK yang sama pada hari yang sama
- Multiple verifikator dapat scan satu SIMLOK untuk kebutuhan verifikasi berbeda
- Hanya verifikator yang sama yang tidak boleh scan ulang di hari yang sama

### 3. **Scan Dapat Dilakukan Setiap Hari**
- Verifikator dapat memindai SIMLOK yang sama di hari yang berbeda
- Tidak ada batasan total scan sepanjang periode implementasi
- Setiap scan dicatat dengan timestamp lengkap untuk audit trail

## Implementasi Teknis

### API Endpoint: `/api/qr/verify`
- **Method**: POST
- **Authentication**: VERIFIER, ADMIN roles only
- **Validation**: 
  - QR code integrity check
  - Date range validation (implementation period)
  - Daily duplicate scan prevention

### Database Logic
```sql
-- Check ONLY for same verifier scan today (NEW RULE)
SELECT * FROM QrScan 
WHERE submission_id = ? 
  AND scanned_by = ? 
  AND scanned_at BETWEEN startOfDay AND endOfDay

-- Note: No longer checking for other verifier scans on same day
-- Different verifiers are now allowed to scan same SIMLOK same day
```

### Error Handling
1. **`duplicate_scan_same_day`**: Same verifier, same day (PREVENTED)
2. **Different verifier same day**: ALLOWED (no longer generates error)
3. **Race condition protection**: Unique constraint violations

## User Experience

### Success Flow
1. Verifikator membuka scanner QR
2. Scan QR code SIMLOK yang valid
3. Sistem menampilkan detail submission
4. Scan tercatat dalam database dengan timestamp

### Error Flow - Duplikasi Hari Ini
1. Verifikator scan QR code yang sudah discan hari ini
2. Sistem menampilkan pesan error yang informatif
3. Detail scan sebelumnya ditampilkan (verifikator, waktu)
4. Verifikator dapat menutup modal dan mencoba SIMLOK lain

### Success Flow - Scan oleh Verifikator Berbeda
1. Verifikator scan QR code yang sudah discan verifikator lain hari ini
2. Sistem MENGIZINKAN scan karena verifikator berbeda
3. Scan tercatat sebagai verifikasi tambahan dari verifikator lain
4. Mendukung multiple verifikasi untuk kualitas yang lebih baik

## Benefits

### 1. **Koordinasi Tim**
- Verifikator tahu siapa yang sudah melakukan scan
- Mencegah duplikasi effort 
- Meningkatkan efisiensi kerja tim

### 2. **Audit Trail**
- Setiap scan tercatat lengkap dengan timestamp
- Mudah tracking siapa scan kapan
- Compliance untuk audit internal

### 3. **Fleksibilitas**
- Tetap bisa scan setiap hari untuk monitoring berkelanjutan
- Tidak membatasi total scan dalam periode implementasi
- Mendukung workflow monitoring harian

### 4. **User Experience**
- Pesan error yang jelas dan informatif
- Informasi scan sebelumnya untuk konteks
- UI yang konsisten dengan error handling

## Testing Scenarios

### Scenario 1: Normal Scan
1. Login sebagai verifier A
2. Scan QR code SIMLOK X (pertama kali hari ini)
3. ✅ **Expected**: Scan berhasil, data submission ditampilkan

### Scenario 2: Duplicate Same User
1. Login sebagai verifier A  
2. Scan QR code SIMLOK X (kedua kali di hari yang sama)
3. ❌ **Expected**: Error "Sudah melakukan scan hari ini"

### Scenario 3: Different User Same Day
1. Login sebagai verifier B
2. Scan QR code SIMLOK X (sudah discan verifier A hari ini)
3. ✅ **Expected**: Scan berhasil - verifikator berbeda DIPERBOLEHKAN scan SIMLOK yang sama

### Scenario 4: Next Day Scan
1. Tunggu hingga hari berikutnya
2. Login sebagai verifier A atau B
3. Scan QR code SIMLOK X
4. ✅ **Expected**: Scan berhasil (hari baru = reset)

---

**Implementation Date**: September 28, 2025
**Developer**: Assistant AI  
**Version**: 2.0.0 - Daily Scan Flow
**Previous Version**: 1.0.0 - Basic QR Scanning