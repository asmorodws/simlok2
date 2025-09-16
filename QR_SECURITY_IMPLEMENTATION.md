# Secure QR Code System - Testing Guide

## Overview
Sistem QR Code baru menggunakan hashing dan enkripsi untuk mencegah manipulasi data. QR code berisi:
- ID submission
- Tanggal mulai dan selesai pelaksanaan  
- Timestamp pembuatan
- Hash verifikasi dengan salt

## Features Implemented

### 1. Secure QR Generation ✅
- **Location**: `/api/submissions/[id]` (saat approval)
- **Security**: AES-256 encryption + SHA-256 hash
- **Expiry**: QR code expires after 24 hours
- **Data**: ID + implementation dates + timestamp + salt

### 2. QR Verification API ✅
- **Endpoint**: `POST /api/qr/verify`
- **Authentication**: Only VERIFIER and ADMIN roles
- **Validation**: Hash verification, date range check, expiry check
- **Response**: Full submission details if valid

### 3. Scan Tracking ✅
- **Table**: `QrScan` - tracks who scanned when
- **Data**: scanner user, timestamp, location, notes
- **Relations**: Links to User and Submission models

### 4. Frontend Components ✅
- **SecureQrScanner**: Modern QR scanner with verification
- **ScanHistory**: View scan logs with filters
- **VerifierDashboard**: Integrated scan functionality

## How to Test

### 1. Create Test Submission
1. Login as vendor
2. Create new submission
3. Add worker data
4. Submit for approval

### 2. Approve with Implementation Dates  
1. Login as admin
2. Go to submission details
3. Set approval to "APPROVED"
4. **IMPORTANT**: Set implementation start & end dates
5. Fill other required fields
6. Save approval

### 3. Test QR Scanning
1. Login as verifier 
2. Click "Scanner QR" button
3. Scan the QR code from approved submission
4. Verify response shows correct data
5. Check scan is recorded in history

### 4. Test Security Features
1. Try scanning expired QR (change system date)
2. Try scanning modified QR data
3. Try scanning with vendor account (should fail)
4. Test date range validation

## QR Code Format
```
SIMLOK|<encrypted_payload>|<hash>
```

Where:
- `encrypted_payload`: Base64 encoded encrypted JSON with IV
- `hash`: SHA-256 hash of ID|start_date|end_date|timestamp|salt

## Environment Variables
```env
QR_SECURITY_SALT="simlok_qr_security_salt_2025_super_secure"
```

## API Endpoints

### POST /api/qr/verify
**Purpose**: Verify QR code and record scan
**Auth**: VERIFIER, ADMIN only
**Body**:
```json
{
  "qrString": "SIMLOK|payload|hash",
  "scanLocation": "Pintu Masuk Area A", 
  "scanNotes": "Regular patrol scan"
}
```

**Response**:
```json
{
  "success": true,
  "message": "QR code verified successfully",
  "scan_id": "cm123...",
  "scanned_at": "2025-09-15T13:45:00Z",
  "submission": { /* full submission data */ }
}
```

### GET /api/qr/verify
**Purpose**: Get scan history
**Auth**: VERIFIER (own scans), ADMIN (all scans)
**Query**: `?limit=20&offset=0&submission_id=cm123`

## Database Schema

### QrScan Table
```sql
- id: String (cuid)
- submission_id: String (FK to Submission)
- scanned_by: String (FK to User) 
- scanned_at: DateTime
- scanner_name: String (optional)
- notes: String (optional)
```

## Security Features

1. **Encryption**: AES-256 with random IV
2. **Hash Verification**: SHA-256 with secret salt
3. **Expiry**: 24 hour time limit
4. **Date Validation**: Check if current date within implementation period
5. **Role-based Access**: Only verifiers/admins can scan
6. **Audit Trail**: All scans logged with user and timestamp

## Testing Scenarios

### Valid QR Scan
- ✅ QR from approved submission
- ✅ Within implementation date range
- ✅ Not expired (< 24 hours)
- ✅ Scanned by verifier/admin

### Invalid QR Scan
- ❌ Modified QR data (hash mismatch)
- ❌ Expired QR (> 24 hours old)
- ❌ Outside implementation dates
- ❌ Scanned by vendor (access denied)
- ❌ QR from pending/rejected submission

## Troubleshooting

1. **"Hash verification failed"**: QR data modified or wrong salt
2. **"QR code has expired"**: QR older than 24 hours
3. **"Not valid for current date"**: Outside implementation period  
4. **"Access denied"**: Non-verifier trying to scan
5. **"Submission not found"**: Invalid submission ID in QR

## Migration Applied
- ✅ `20250915135300_add_qr_scan_tracking` - Added QrScan table
- ✅ Database relations properly configured
- ✅ Indexes added for performance
