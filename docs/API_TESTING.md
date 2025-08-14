# Test Submissions API (Updated)

## Setup
Server berjalan di **http://localhost:3001** (port 3001 karena 3000 sedang digunakan)

## Test Scenarios

### 1. Login sebagai Vendor
```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "budi@vendor1.com",
    "password": "vendor123"
  }'
```

### 2. Create Submission (Vendor)
```bash
curl -X POST http://localhost:3001/api/submissions \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "nama_vendor": "CV Budi Jaya",
    "berdasarkan": "Kontrak Kerja No. TEST/2024/001",
    "nama_petugas": "Budi Santoso",
    "pekerjaan": "Testing API Submission",
    "lokasi_kerja": "Test Location",
    "pelaksanaan": "2024-08-15 s/d 2024-08-16",
    "jam_kerja": "08:00 - 17:00 WIB",
    "sarana_kerja": "Testing tools and equipment",
    "nama_pekerja": "Test Worker",
    "lain_lain": "This is a test submission",
    "content": "Testing content for API submission"
  }'
```

### 3. Get Vendor Submissions
```bash
curl -X GET "http://localhost:3001/api/submissions?page=1&limit=5" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### 4. Login sebagai Admin
```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### 5. Get Admin Dashboard (dengan statistik)
```bash
curl -X GET "http://localhost:3001/api/submissions?stats=true&page=1&limit=10" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_SESSION_TOKEN"
```

### 6. Filter Submissions (Admin)
```bash
# Filter by status
curl -X GET "http://localhost:3001/api/submissions?status=PENDING&stats=true" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_SESSION_TOKEN"

# Filter by vendor and status
curl -X GET "http://localhost:3001/api/submissions?vendor=CV%20Budi&status=PENDING" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_SESSION_TOKEN"
```

### 7. Approve Submission (Admin)
```bash
curl -X PUT http://localhost:3001/api/submissions/SUBMISSION_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_SESSION_TOKEN" \
  -d '{
    "status_approval_admin": "APPROVED",
    "keterangan": "Approved after review",
    "nomor_simlok": "SIMLOK/TEST/001",
    "tanggal_simlok": "2024-08-14",
    "tembusan": "Copy to: Manager, HSE Coordinator"
  }'
```

## Frontend Testing (Simplified)

### Login Credentials:
- **Admin**: `admin@example.com` / `admin123`
- **Vendor**: `budi@vendor1.com` / `vendor123`

### Test Flow:
1. **Login** di http://localhost:3001/login
2. **Vendor**: 
   - Akses http://localhost:3001/vendor/submissions
   - Klik "Buat Pengajuan Baru" 
   - Isi form dan submit
3. **Admin**:
   - Akses http://localhost:3001/admin/submissions
   - Lihat dashboard dengan statistik
   - Klik "Review" pada submission PENDING
   - Approve dengan input nomor SIMLOK dan tembusan

## API Improvements Made

### ✅ Fixed Issues:
- Import errors (Card, Button, Badge, Input, Label)
- Type errors dalam form handlers  
- File upload handling
- Path imports untuk auth dan prisma

### ✅ Simplified API:
- Menggabungkan `/api/admin/submissions` ke `/api/submissions` 
- Parameter `stats=true` untuk dashboard admin
- Role-based filtering otomatis
- Better error handling

### ✅ Enhanced Components:
- Button dengan variant "outline", "destructive"
- Badge dengan variant colors
- Type safety di semua form handlers
- Proper file upload handling
