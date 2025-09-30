# Fitur Export Excel untuk Data Submission (Reviewer)

## Overview
Fitur ini memungkinkan reviewer untuk mengekspor data submission ke format Excel (.xlsx) dengan semua informasi lengkap yang diperlukan untuk analisis dan pelaporan.

## Fitur Utama

### 1. Export Komprehensif
- **Data Lengkap**: Mencakup semua informasi submission mulai dari data vendor, pekerja, status review, hingga tracking scan QR
- **Filter Terintegrasi**: Export akan mengikuti filter yang sedang aktif (status review, status final, pencarian)
- **Format Terstruktur**: Data diorganisir dalam kolom-kolom yang mudah dibaca dengan lebar kolom yang optimal

### 2. Kolom Data yang Di-export
- **Informasi Dasar**: No, Tanggal Pengajuan, Nama Vendor, Penanggung Jawab
- **Kontak**: Email Vendor, Telepon, Status Verifikasi Vendor
- **Detail Pekerjaan**: Deskripsi Pekerjaan, Lokasi Kerja, Pelaksanaan, Jam Kerja, Fasilitas Kerja
- **Dokumentasi**: Berdasarkan, Catatan Lain, Nomor & Tanggal SIMJA/SIKA/SIMLOK
- **Pekerja**: Daftar Pekerja, Jumlah Pekerja
- **Review Process**: Status Review, Status Final, Catatan Review, Catatan Final
- **Personnel**: Reviewer, Email Reviewer, Approver, Email Approver
- **Timeline**: Tanggal Review, Tanggal Approval
- **Penandatangan**: Nama & Jabatan Penandatangan
- **Tracking**: Jumlah Scan QR, Terakhir Discan, Lokasi Scan Terakhir

### 3. Fitur Filter
Export dapat di-filter berdasarkan:
- **Status Review**: Filter di halaman utama - Menunggu Review, Memenuhi Syarat, Tidak Memenuhi Syarat
- **Status Final**: Filter di halaman utama - Menunggu Persetujuan, Disetujui, Ditolak
- **Pencarian**: Filter di halaman utama - Berdasarkan nama vendor, deskripsi pekerjaan, atau nama petugas
- **Rentang Tanggal**: Filter dalam modal export
  - **Tanggal Mulai**: Filter data dari tanggal tertentu
  - **Tanggal Akhir**: Filter data sampai tanggal tertentu
  - **Kosong**: Jika kedua field kosong, akan export semua data tanpa filter tanggal
  - **Reset**: Tombol reset untuk menghapus filter tanggal

## Cara Penggunaan

### 1. Akses Halaman Reviewer
```
/reviewer/submissions
```

### 2. Buka Modal Export
- Klik tombol **Export Excel** di header halaman
- Modal filter export akan terbuka dengan berbagai opsi konfigurasi

### 3. Konfigurasi Filter (Opsional)
**Modal Export menyediakan:**
- **DatePicker Rentang Tanggal**: Komponen date picker yang user-friendly dengan kalender visual
- **Auto-include**: Otomatis menggunakan filter search dan status yang aktif di halaman utama
- **Preview Info**: Ringkasan export yang akan dilakukan
- **Reset**: Tombol untuk menghapus filter tanggal

**Fitur DatePicker:**
- Interface kalender yang intuitif
- Format tanggal Indonesia (dd/MM/yyyy)
- Tombol "Hari ini" untuk tanggal cepat
- Keyboard navigation support
- Responsive design

**Jika tanggal dikosongkan**: Akan export semua data sesuai filter halaman utama

### 4. Export Data
- Review informasi export di bagian preview
- Klik tombol **Export Excel** di modal
- File akan didownload otomatis
- Modal akan tertutup setelah export berhasil

### 5. Kelola Filter Tanggal
- **Reset Tanggal**: Menghapus filter tanggal
- **Batal**: Keluar dari modal tanpa export
- **Kompak**: Modal berukuran kecil dan fokus pada date range
- File akan didownload dengan nama format: `Data_Pengajuan_SIMLOK_YYYY-MM-DD.xlsx`
- Jika ada filter aktif, nama file akan menyertakan informasi filter

## API Endpoint

### GET `/api/reviewer/simloks/export`

**Authorization**: Memerlukan role REVIEWER atau SUPER_ADMIN

**Query Parameters**:
- `reviewStatus`: Filter berdasarkan status review
- `finalStatus`: Filter berdasarkan status final  
- `search`: Filter berdasarkan teks pencarian
- `startDate`: Filter tanggal mulai (format ISO)
- `endDate`: Filter tanggal akhir (format ISO)

**Response**: File Excel (.xlsx) dengan header Content-Disposition untuk download

**Contoh Request dengan Filter Tanggal**:
```
GET /api/reviewer/simloks/export?reviewStatus=PENDING_REVIEW&startDate=2025-10-01&endDate=2025-10-31
```

**Contoh Request untuk Export Semua Data**:
```
GET /api/reviewer/simloks/export
```

## Implementasi Teknis

### 1. Dependencies
- **xlsx**: Library untuk generating Excel files
- **Next.js API Routes**: Untuk handling export request
- **Prisma**: Untuk query database dengan relasi lengkap

### 2. Key Files
- `/src/app/api/reviewer/simloks/export/route.ts` - API endpoint
- `/src/components/reviewer/ReviewerSubmissionsManagement.tsx` - Main UI component
- `/src/components/reviewer/ExportFilterModal.tsx` - Export filter modal component

### 3. Database Relations
Query mencakup relasi ke:
- `user` (vendor information)
- `reviewed_by_user` (reviewer information)
- `approved_by_final_user` (approver information) 
- `worker_list` (daftar pekerja)
- `qrScans` (tracking scan data)

### 4. Error Handling
- Unauthorized access (401)
- Insufficient permissions (403)
- Database errors (500)
- Client-side error alerts

## Security & Permissions
- Hanya role REVIEWER dan SUPER_ADMIN yang dapat mengakses
- Data di-filter berdasarkan authorization level
- Tidak ada sensitive information yang di-expose

## Performance Considerations
- Query dioptimasi dengan select specific fields saja
- Column width diatur untuk optimal readability
- File compression enabled pada Excel generation
- Memory efficient untuk dataset besar

## Future Enhancements
- Export format tambahan (CSV, PDF)
- Scheduled export via email
- Advanced filtering options (multiple date ranges, custom fields)
- Export template customization
- Bulk export dengan pagination
- Export preview sebelum download