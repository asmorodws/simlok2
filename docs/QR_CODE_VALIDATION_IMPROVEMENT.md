# QR Code Validation Logic Improvement

## 📋 Overview

Perbaikan logika validasi QR code agar **expired hanya berdasarkan tanggal pelaksanaan**, bukan 24 jam sejak generate.

## 🔄 Perubahan Logika

### **SEBELUM (❌ Tidak Tepat)**

```typescript
// QR code valid hanya 24 jam sejak dibuat
const expiration = Date.now() + (24 * 60 * 60 * 1000);

// Check expiration
if (Date.now() > qrData.e) {
  console.error('QR code has expired');
  return false;
}
```

**Masalah:**
- QR code expired setelah 24 jam, meskipun periode pelaksanaan masih berlangsung
- Tidak sesuai dengan kebutuhan bisnis
- Vendor harus generate ulang QR code setiap hari

### **SESUDAH (✅ Correct)**

```typescript
// QR code valid selama periode pelaksanaan
const qrData: SimpleQrData = {
  i: submission.id,
  sd: implementation_start_date,  // Format: YYYY-MM-DD
  ed: implementation_end_date,    // Format: YYYY-MM-DD
  s: signature
};

// Validate QR is scanned within implementation period
function verifySimpleQrData(qrData: SimpleQrData, scanDate: Date): boolean {
  const scanDateStr = formatToYYYYMMDD(scanDate);
  
  // Check if before start date
  if (qrData.sd && scanDateStr < qrData.sd) {
    return false; // Belum dimulai
  }
  
  // Check if after end date
  if (qrData.ed && scanDateStr > qrData.ed) {
    return false; // Sudah selesai/expired
  }
  
  return true;
}
```

**Keuntungan:**
- ✅ QR code valid selama periode `implementation_start_date` sampai `implementation_end_date`
- ✅ Expired otomatis setelah tanggal selesai pelaksanaan
- ✅ Tidak bisa scan sebelum tanggal mulai pelaksanaan
- ✅ Sesuai dengan kebutuhan bisnis
- ✅ Vendor tidak perlu generate ulang QR code setiap hari

## 📊 Format QR Code

### **Format Baru**
```
SL:submissionId:startDate:endDate:signature
```

**Contoh:**
```
SL:cmhub941b01jql6a4l39sprpf:2025-11-10:2025-11-30:b58c45221475492fc11f6f9947f2c07a
```

**Komponen:**
- `SL` - Prefix SIMLOK
- `submissionId` - ID submission
- `startDate` - Tanggal mulai pelaksanaan (YYYY-MM-DD) atau 'null'
- `endDate` - Tanggal selesai pelaksanaan (YYYY-MM-DD) atau 'null'
- `signature` - SHA256 hash untuk validasi integritas data

### **Backward Compatibility**

Sistem masih support format lama untuk QR code yang sudah ada:

1. **Legacy Base64:** `SL|base64data`
2. **Legacy Colon:** `SL:id:expiration:signature` (dengan 24 jam expiry)
3. **Raw ID:** `submissionId` (tanpa security)

## 🔐 Security Features

### **1. Signature Verification**
```typescript
const signatureData = `${id}|${startDate}|${endDate}|${QR_SALT}`;
const signature = crypto.createHash('sha256').update(signatureData).digest('hex').substring(0, 32);
```

- Menggunakan SHA-256 untuk integrity check
- Data yang di-hash: submission ID + start date + end date + salt
- Mencegah tampering/modifikasi QR code

### **2. Date Range Validation**
```typescript
// Validasi dilakukan di 2 layer:

// Layer 1: Di parseQrString (verifySimpleQrData)
if (!verifySimpleQrData(qrData)) {
  throw new Error('QR verification failed');
}

// Layer 2: Di API route (isQrValidForDate)
if (!isQrValidForDate(qrPayload)) {
  return error('QR code tidak valid untuk tanggal ini');
}
```

## 📝 Validation Rules

### **Skenario 1: Scan Sebelum Tanggal Mulai**
```
Start Date: 2025-11-15
End Date: 2025-11-30
Scan Date: 2025-11-10

Result: ❌ REJECTED
Message: "QR code hanya dapat digunakan mulai tanggal 2025-11-15"
```

### **Skenario 2: Scan Dalam Periode Pelaksanaan**
```
Start Date: 2025-11-10
End Date: 2025-11-30
Scan Date: 2025-11-15

Result: ✅ VALID
QR code verified successfully
```

### **Skenario 3: Scan Setelah Tanggal Selesai**
```
Start Date: 2025-11-10
End Date: 2025-11-30
Scan Date: 2025-12-05

Result: ❌ EXPIRED
Message: "QR code telah kadaluarsa. Periode pelaksanaan berakhir pada 2025-11-30"
```

### **Skenario 4: Tidak Ada Tanggal Pelaksanaan**
```
Start Date: null
End Date: null
Scan Date: any

Result: ✅ VALID (with warning)
Warning: "QR code has no implementation dates - allowing scan"
```

## 🧪 Testing

### **Test Case 1: Generate QR Code**
```typescript
const submission = {
  id: 'test123',
  implementation_start_date: '2025-11-10',
  implementation_end_date: '2025-11-30'
};

const qrString = generateQrString(submission);
console.log(qrString);
// Expected: SL:test123:2025-11-10:2025-11-30:...signature...
```

### **Test Case 2: Parse & Validate QR Code**
```typescript
const qrString = 'SL:test123:2025-11-10:2025-11-30:abc123...';
const payload = parseQrString(qrString);

console.log(payload);
// Expected:
// {
//   id: 'test123',
//   start_date: '2025-11-10',
//   end_date: '2025-11-30',
//   timestamp: 1731468000000
// }
```

### **Test Case 3: Date Validation**
```typescript
const payload = {
  id: 'test123',
  start_date: '2025-11-10',
  end_date: '2025-11-30',
  timestamp: Date.now()
};

// Test: Scan di dalam periode
const scanDate = new Date('2025-11-15');
console.log(isQrValidForDate(payload, scanDate)); // true

// Test: Scan di luar periode
const expiredDate = new Date('2025-12-05');
console.log(isQrValidForDate(payload, expiredDate)); // false
```

## 📁 Files Modified

1. **`src/lib/qr-security.ts`**
   - Updated `SimpleQrData` interface
   - Updated `generateSimpleQrData()` function
   - Updated `verifySimpleQrData()` function
   - Updated `generateQrString()` function
   - Updated `parseQrString()` function
   - Updated `isQrValidForDate()` function

2. **`src/app/api/qr/verify/route.ts`**
   - Added validation using `isQrValidForDate()`
   - Removed old 7-day expiry check
   - Added specific error messages based on validation failure

## 🎯 Best Practices Implemented

### **1. Separation of Concerns**
- **`qr-security.ts`**: Pure crypto & validation logic
- **`route.ts`**: Business logic & database operations

### **2. Type Safety**
```typescript
interface SimpleQrData {
  i: string;           // submission ID
  sd: string | null;   // start date
  ed: string | null;   // end date
  s: string;           // signature
}

interface QrPayload {
  id: string;
  start_date: string | null;
  end_date: string | null;
  timestamp: number;
}
```

### **3. Error Handling**
```typescript
try {
  const payload = parseQrString(qrString);
  if (!payload) {
    throw new Error('Invalid QR code');
  }
  // ... validation
} catch (error) {
  console.error('QR parsing failed:', error);
  return null;
}
```

### **4. Backward Compatibility**
- Support 3 format QR code lama
- Graceful fallback untuk missing data
- Warning logs untuk format deprecated

### **5. Security**
- SHA-256 hashing untuk signature
- Salt-based signature untuk prevent rainbow table attacks
- Immutable QR code (dates included in signature)

### **6. Logging**
```typescript
console.log('=== QR PARSING RESULT ===');
console.log('Parsed payload:', qrPayload);
console.log('========================');
```

### **7. Date Handling**
- Menggunakan string format `YYYY-MM-DD` untuk date comparison
- Timezone-safe (tidak menggunakan timestamp untuk date comparison)
- Consistent date formatting

## 🚀 Migration Guide

### **Untuk QR Code yang Sudah Ada:**

1. **QR code lama (24 jam expiry) masih bisa digunakan** sampai expired
2. **QR code baru** akan otomatis menggunakan format date-based validation
3. **Tidak perlu re-generate** semua QR code existing

### **Untuk Development:**

1. Pastikan `implementation_start_date` dan `implementation_end_date` terisi di database
2. Test QR code generation dengan data lengkap
3. Verify bahwa QR code tidak bisa di-scan di luar periode

### **Untuk Production:**

1. Deploy perubahan di off-peak hours
2. Monitor logs untuk error QR parsing
3. Siapkan fallback jika ada issue dengan QR code lama

## 📞 Support

Jika ada pertanyaan atau issue:
1. Check logs di `/super-admin/logs`
2. Verify submission dates di database
3. Test QR generation & scanning dengan data sample

---

**Last Updated:** 2025-11-13
**Version:** 2.0.0
**Author:** System Administrator
