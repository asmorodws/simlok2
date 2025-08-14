# Submissions API Documentation (Updated)

## Overview
API untuk mengelola pengajuan (submissions) dalam sistem SIMLOK. Hanya admin yang dapat melakukan update dan delete submissions.

## Endpoints

### 1. GET /api/submissions
Mendapatkan daftar submissions dengan role-based filtering

**Query Parameters:**
- `page` (optional): Halaman data (default: 1)
- `limit` (optional): Jumlah data per halaman (default: 10)
- `status` (optional): Filter berdasarkan status (PENDING, APPROVED, REJECTED)
- `vendor` (optional): Filter berdasarkan nama vendor (admin/verifier only)
- `stats` (optional): Jika "true", akan mengembalikan statistik (admin only)

**Role-based Behavior:**
- **VENDOR**: Hanya melihat submissions mereka sendiri
- **ADMIN/VERIFIER**: Melihat semua submissions + dapat filter by vendor

**Response (Basic):**
```json
{
  "submissions": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

**Response (Admin dengan stats=true):**
```json
{
  "submissions": [...],
  "pagination": {...},
  "statistics": {
    "total": 100,
    "pending": 20,
    "approved": 70,
    "rejected": 10
  }
}
```

### 2. POST /api/submissions
Membuat submission baru (hanya vendor)

**Body:** (sama seperti sebelumnya)

### 3. GET /api/submissions/[id]
Mendapatkan detail submission berdasarkan ID

### 4. PUT /api/submissions/[id]
Update submission (hanya admin untuk approval/rejection)

### 5. DELETE /api/submissions/[id]
Hapus submission (hanya admin)

## Perubahan dari Versi Sebelumnya

### ✅ Simplifikasi API
- **Dihapus**: `/api/admin/submissions` 
- **Digabung ke**: `/api/submissions` dengan parameter `stats=true`
- **Benefit**: Satu endpoint untuk semua kebutuhan, lebih mudah maintain

### ✅ Enhanced GET /api/submissions
- Role-based filtering otomatis
- Parameter `stats=true` untuk admin dashboard
- Parameter `vendor` untuk filter nama vendor
- Backward compatible dengan semua client yang ada

## Usage Examples

### Vendor - List Own Submissions
```bash
curl -X GET "http://localhost:3001/api/submissions?page=1&limit=5"
```

### Admin - Dashboard dengan Statistik
```bash
curl -X GET "http://localhost:3001/api/submissions?stats=true&page=1&limit=10"
```

### Admin - Filter by Vendor dan Status
```bash
curl -X GET "http://localhost:3001/api/submissions?vendor=CV%20Budi&status=PENDING&stats=true"
```

## Component Updates

### AdminSubmissions
- Sekarang menggunakan `/api/submissions?stats=true`
- Automatic fallback jika stats tidak tersedia
- Error handling yang lebih baik

### VendorSubmissions  
- Tetap menggunakan `/api/submissions` biasa
- Tidak ada perubahan functionality

## Benefits

1. **Simplified Architecture**: Satu endpoint untuk semua kebutuhan
2. **Better Maintainability**: Tidak ada duplikasi logic
3. **Consistent API**: Semua role menggunakan endpoint yang sama
4. **Flexible**: Parameter opsional memungkinkan berbagai use case
