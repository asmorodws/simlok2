# Testing & Auto-Fix SIMLOK

Dokumentasi untuk testing concurrent SIMLOK generation dan auto-fix untuk masalah SIMLOK numbers.

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Script 1: Test Concurrent SIMLOK](#script-1-test-concurrent-simlok)
3. [Script 2: Fix SIMLOK Issues](#script-2-fix-simlok-issues)
4. [Workflow Rekomendasi](#workflow-rekomendasi)
5. [Troubleshooting](#troubleshooting)

---

## Overview

Terdapat 2 script utama untuk testing dan maintenance SIMLOK:

1. **`test-concurrent-simlok.ts`** - Test concurrent SIMLOK generation langsung ke database
2. **`fix-simlok-issues.ts`** - Detect dan auto-fix duplicate/gap issues

---

## Script 1: Test Concurrent SIMLOK

### Fitur

✅ **Direct Database Testing** - Test langsung ke database tanpa HTTP  
✅ **Concurrent Testing** - Simulasi multiple approvals bersamaan  
✅ **Retry Detection** - Mendeteksi apakah retry mechanism bekerja  
✅ **Auto Analysis** - Analisis otomatis untuk duplicates, gaps, performance  
✅ **Database Verification** - Verifikasi consistency hasil generation  
✅ **Auto Cleanup** - Membersihkan test data setelah selesai  

### Cara Menggunakan

#### Basic Usage

```bash
# Test dengan default settings (10 submissions, 5 concurrent)
npx tsx scripts/test-concurrent-simlok.ts
```

#### Advanced Usage

```bash
# Custom jumlah submissions dan concurrency
npx tsx scripts/test-concurrent-simlok.ts -s 20 -c 10

# High concurrency stress test
npx tsx scripts/test-concurrent-simlok.ts -s 50 -c 20

# Kombinasi untuk load testing
npx tsx scripts/test-concurrent-simlok.ts -s 100 -c 50
```

#### Options

| Option | Alias | Default | Deskripsi |
|--------|-------|---------|-----------|
| `--submissions` | `-s` | 10 | Jumlah submissions yang akan dibuat |
| `--concurrency` | `-c` | 5 | Jumlah concurrent approvals |
| `--help` | `-h` | - | Tampilkan help |

### Output Example

```
================================================================================
🧪 CONCURRENT SIMLOK GENERATION TEST
================================================================================
Configuration:
  - Submissions: 15
  - Concurrency: 10
================================================================================

📝 Creating 15 test submissions...
✅ Created 15 test submissions

 Starting 15 concurrent SIMLOK generations (batch size: 10)...

📦 Processing batch 1 (10 submissions)...
🔄 Attempt 1/3 for submission abc123
  � Generating number 14/S00330/2025-S0 for abc123
  ✅ Success: 14/S00330/2025-S0 (96ms)
  
... (more results) ...

================================================================================
📊 TEST RESULTS ANALYSIS
================================================================================

✅ Success: 15/15
❌ Failed: 0/15

📋 SIMLOK Numbers:
  Total: 15
  Unique: 15
  ✅ NO DUPLICATES - All numbers are unique!

🔢 Sequence Analysis:
  Range: 14 to 28
  Expected count: 15
  Actual count: 15
  ✅ SEQUENTIAL - Perfect sequence!

🔄 Retry Statistics:
  Required retry: 0/15

⏱️  Performance:
  Average: 173ms
  Min: 27ms
  Max: 345ms

🔍 Database Verification:
  Approved in DB: 15/15
  ✅ CONSISTENT - Results match database

================================================================================
✅✅✅ TEST PASSED - All checks successful!
================================================================================

🧹 Cleaning up test data...
✅ Cleanup complete
```

### Apa Yang Ditest?

1. **Success Rate** - Berapa % berhasil approve
2. **Duplicate Detection** - Apakah ada SIMLOK number yang sama
3. **Sequence Validation** - Apakah nomor berurutan tanpa gap
4. **Retry Mechanism** - Berapa kali retry dilakukan
5. **Performance** - Average, min, max duration
6. **Database Consistency** - Results vs database record

---

## Script 2: Fix SIMLOK Issues

### Fitur

✅ **Duplicate Detection** - Deteksi SIMLOK number yang duplicate  
✅ **Gap Detection** - Deteksi nomor yang hilang dalam sequence  
✅ **Auto Fix Duplicates** - Reassign nomor baru untuk duplicates  
✅ **Health Report** - Laporan kesehatan SIMLOK database  
✅ **Safe Operation** - Konfirmasi sebelum fix  

### Cara Menggunakan

#### Detection Only (No Fix)

```bash
# Deteksi masalah tanpa fix
npx tsx scripts/fix-simlok-issues.ts
```

#### Detection + Auto Fix

```bash
# Deteksi dan fix otomatis (dengan konfirmasi)
npx tsx scripts/fix-simlok-issues.ts --fix
```

#### Report Only

```bash
# Tampilkan health report saja
npx tsx scripts/fix-simlok-issues.ts --report
```

### Output Examples

#### Detection Mode

```
================================================================================
🔧 SIMLOK ISSUE DETECTION AND FIX
================================================================================

🔍 Checking for duplicate SIMLOK numbers...

❌ Duplicate found: 5/S00330/2025-S0
   Count: 2
   Submissions:
     1. abc123 (created: 2025-11-15T10:30:00.000Z)
     2. def456 (created: 2025-11-15T10:30:01.000Z)

🔍 Checking for gaps in SIMLOK sequence...

✅ No gaps found! Perfect sequence from 1 to 50

💡 Run with --fix flag to automatically fix detected issues

📊 SIMLOK Health Report
================================================================================

Statistics:
  Total SIMLOK numbers: 50
  Range: 1 to 50
  Expected count: 50
  ✅ Perfect sequence with no gaps!

================================================================================
```

#### Fix Mode

```
================================================================================
🔧 SIMLOK ISSUE DETECTION AND FIX
================================================================================

🔍 Checking for duplicate SIMLOK numbers...

❌ Duplicate found: 5/S00330/2025-S0
   Count: 2
   Submissions:
     1. abc123 (created: 2025-11-15T10:30:00.000Z)
     2. def456 (created: 2025-11-15T10:30:01.000Z)

🔍 Checking for gaps in SIMLOK sequence...

✅ No gaps found! Perfect sequence from 1 to 50

⚠️  Found 1 duplicate(s). Proceed with fix? (y/N): y

🔧 Starting duplicate fix...

Fixing 1 duplicate(s) of 5/S00330/2025-S0:
  Keeping: abc123 (oldest)
  ✅ def456: 5/S00330/2025-S0 → 51/S00330/2025-S0

✅ Duplicate fix completed!

📊 SIMLOK Health Report
================================================================================

Statistics:
  Total SIMLOK numbers: 50
  Range: 1 to 51
  Expected count: 51
  ⚠️  1 gap(s) detected

================================================================================
```

### Strategi Fix

#### Duplicate Fix

Ketika ditemukan duplicate:
1. **Keep oldest** - Submission pertama (berdasarkan created_at) tetap dengan nomor asli
2. **Reassign rest** - Submission lainnya diberi nomor baru (next available)
3. **Update database** - Update langsung ke database

#### Gap Analysis

Gap biasanya **tidak perlu di-fix** karena bisa terjadi karena:
- Deleted submissions
- Failed transactions
- Manual fixes

Script hanya akan **inform** tentang gaps, tidak auto-fix.

---

## Workflow Rekomendasi

### 1. Development Testing

```bash
# Step 1: Test API dengan concurrent load
npx tsx scripts/test-approval-api.ts -s 20 -c 10

# Step 2: Check jika ada issues
npx tsx scripts/fix-simlok-issues.ts

# Step 3: Fix jika perlu
npx tsx scripts/fix-simlok-issues.ts --fix
```

### 2. Before Deployment

```bash
# Step 1: Health check
npx tsx scripts/fix-simlok-issues.ts --report

# Step 2: Stress test
npx tsx scripts/test-approval-api.ts -s 50 -c 20

# Step 3: Verify no issues
npx tsx scripts/fix-simlok-issues.ts
```

### 3. Production Monitoring

```bash
# Daily check (via cron)
npx tsx scripts/fix-simlok-issues.ts --report

# Weekly validation
npx tsx scripts/fix-simlok-issues.ts

# Fix jika ada masalah
npx tsx scripts/fix-simlok-issues.ts --fix
```

### 4. After Fixing Bug

```bash
# Step 1: Test fix dengan API
npx tsx scripts/test-approval-api.ts -s 30 -c 15

# Step 2: Check production data
npx tsx scripts/fix-simlok-issues.ts

# Step 3: Fix production jika perlu
npx tsx scripts/fix-simlok-issues.ts --fix
```

---

## Troubleshooting

### Test Failed - Duplicates Found

**Gejala:**
```
❌ DUPLICATES FOUND!
Duplicate numbers: 5, 10
```

**Solusi:**
1. Check server logs untuk retry mechanism
2. Verify database transaction isolation level
3. Run fix script: `npx tsx scripts/fix-simlok-issues.ts --fix`
4. Re-test: `npx tsx scripts/test-approval-api.ts`

### Test Failed - Gaps in Sequence

**Gejala:**
```
❌ GAPS DETECTED - Sequence has missing numbers
Missing: 5, 8, 12
```

**Solusi:**
1. Check jika ada failed transactions di logs
2. Gaps biasanya normal (deleted submissions)
3. Jika critical, bisa reassign semua nomor (manual)

### Test Failed - API Errors

**Gejala:**
```
❌ Failed: 5/10
  - abc123: Unique constraint failed
  - def456: Unique constraint failed
```

**Solusi:**
1. Check jika retry mechanism aktif di code
2. Verify max retries cukup (min 3-5)
3. Check database connection pool
4. Increase retry delay jika perlu

### Login Failed

**Gejala:**
```
❌ Login failed: 401 Unauthorized
```

**Solusi:**
1. Verify default APPROVER user exists
2. Check password sudah di-reset ke "user123"
3. Run: `npx tsx scripts/reset-default-passwords.ts`

### Server Not Running

**Gejala:**
```
❌ fetch failed
ECONNREFUSED
```

**Solusi:**
1. Start development server: `npm run dev`
2. Verify server running di port 3000
3. Atau gunakan -u flag dengan URL yang benar

### Database Connection Error

**Gejala:**
```
❌ Can't reach database server
```

**Solusi:**
1. Check DATABASE_URL di .env
2. Verify database service running
3. Check network connectivity

---

## Best Practices

### 1. Testing Frequency

- **Development**: Setiap kali modify approval logic
- **Staging**: Before setiap deployment
- **Production**: Weekly health check

### 2. Concurrency Level

- **Low (5-10)**: Normal testing
- **Medium (10-20)**: Stress testing
- **High (20-50)**: Load testing

⚠️ **Warning**: High concurrency bisa overload development database

### 3. Monitoring

Script bisa di-integrate ke CI/CD:

```yaml
# .github/workflows/test.yml
- name: Test Approval API
  run: npx tsx scripts/test-approval-api.ts -s 20 -c 10

- name: Check SIMLOK Health
  run: npx tsx scripts/fix-simlok-issues.ts --report
```

### 4. Backup Before Fix

Sebelum run auto-fix di production:

```bash
# Backup database
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql

# Run fix
npx tsx scripts/fix-simlok-issues.ts --fix
```

---

## Summary

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `test-approval-api.ts` | Test concurrent approvals via API | Development, before deployment |
| `fix-simlok-issues.ts` | Detect & fix SIMLOK issues | Production monitoring, after bug fix |

**Key Benefits:**
- ✅ Catch issues before production
- ✅ Auto-fix duplicates
- ✅ Monitor SIMLOK health
- ✅ Verify retry mechanism works
- ✅ Database consistency validation

