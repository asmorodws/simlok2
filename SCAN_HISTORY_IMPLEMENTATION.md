# Scan History Feature

## Overview
Halaman Scan History memungkinkan **Reviewer** dan **Approver** untuk memantau aktivitas scan QR code yang dilakukan oleh **Verifikator**. Fitur ini memberikan transparansi dan monitoring pada proses verifikasi submission.

## Features

### 1. **Sidebar Navigation**
- Menu "Scan History" ditambahkan ke sidebar untuk role REVIEWER dan APPROVER
- Menggunakan QrCodeIcon untuk visualisasi yang jelas
- Navigasi langsung ke halaman scan history

### 2. **Filtering System**
- **Date Range Filter**: Filter berdasarkan tanggal dari dan sampai
- **Verifier Filter**: Cari berdasarkan nama verifikator
- **Submission Filter**: Cari berdasarkan nomor SIMLOK
- **Reset Function**: Reset semua filter dengan satu klik

### 3. **Data Display**
- **Submission Info**: Nomor SIMLOK, company name, project name
- **Verifier Info**: Nama, email, dan role verifikator
- **Scan Time**: Waktu scan dengan format relative time (e.g., "2 jam yang lalu")
- **Status Tracking**: Review status dan final approval status
- **Pagination**: Navigasi halaman untuk data yang banyak

### 4. **Detail Modal**
- Modal detail untuk setiap scan record
- Informasi lengkap submission dan verifikator
- Scan details termasuk timestamp dan notes (jika ada)
- Current status submission

## API Endpoints

### GET /api/scan-history
**Parameters:**
- `page` (number): Halaman data (default: 1)
- `limit` (number): Jumlah data per halaman (default: 20)
- `dateFrom` (string): Filter tanggal mulai (format: YYYY-MM-DD)
- `dateTo` (string): Filter tanggal akhir (format: YYYY-MM-DD)
- `verifier` (string): Filter nama verifikator (case insensitive)
- `submissionId` (string): Filter nomor SIMLOK (case insensitive)

**Response:**
```json
{
  "scans": [
    {
      "id": "scan_id",
      "submission_id": "submission_id",
      "scanned_by": "user_id",
      "scanned_at": "2025-09-27T10:30:00Z",
      "scanner_name": "Optional scanner name",
      "notes": "Optional notes",
      "submission": {
        "id": "submission_id",
        "simlok_number": "SIMLOK-2025-001",
        "company_name": "PT Example",
        "project_name": "Project Name",
        "review_status": "MEETS_REQUIREMENTS",
        "final_status": "APPROVED"
      },
      "user": {
        "id": "user_id",
        "name": "Verifier Name",
        "email": "verifier@example.com",
        "role": "VERIFIER"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

## Routes Structure

```
/reviewer/scan-history
├── ScanHistoryPage component
├── Filter panel
├── Data table
└── Detail modal

/approver/scan-history
├── ScanHistoryPage component
├── Filter panel  
├── Data table
└── Detail modal
```

## Database Schema
Menggunakan model `QrScan` yang sudah ada:
```prisma
model QrScan {
  id            String     @id @default(cuid())
  submission_id String
  scanned_by    String
  scanned_at    DateTime   @default(now())
  scanner_name  String?    // Optional: name of scanner
  notes         String?    // Optional: scan notes
  submission    Submission @relation("SubmissionQrScans")
  user          User       @relation("QrScannedBy")
}
```

## Security & Access Control
- **Authentication Required**: Harus login dengan session valid
- **Role-Based Access**: Hanya REVIEWER, APPROVER, ADMIN, dan SUPER_ADMIN
- **Data Isolation**: Setiap role hanya melihat data yang relevan

## UI/UX Features
- **Responsive Design**: Mobile-friendly layout
- **Loading States**: Skeleton loading saat fetch data
- **Empty States**: Pesan informatif saat tidak ada data
- **Status Colors**: Color coding untuk berbagai status
- **Search & Filter**: Real-time filtering dan pencarian
- **Pagination**: Efficient data loading dengan pagination

## Integration Points
1. **Sidebar Menu**: Terintegrasi dengan SidebarLayout
2. **API Routes**: RESTful API dengan parameter filtering
3. **Database**: Menggunakan Prisma ORM dengan relasi
4. **Authentication**: NextAuth session management
5. **UI Components**: Menggunakan komponen UI yang konsisten

## Future Enhancements
1. **Export Functionality**: Export scan history ke Excel/PDF
2. **Real-time Updates**: WebSocket untuk live scan monitoring
3. **Advanced Analytics**: Charts dan statistik scan activity
4. **Notification Integration**: Notifikasi untuk scan events
5. **Audit Trail**: Detailed logging untuk compliance