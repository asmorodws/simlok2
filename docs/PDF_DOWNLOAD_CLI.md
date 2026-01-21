# PDF Download CLI Documentation

Dokumentasi lengkap untuk sistem download PDF SIMLOK melalui command line interface (CLI).

## Daftar Isi
- [Overview](#overview)
- [Instalasi](#instalasi)
- [Download PDF Single](#download-pdf-single)
- [Download PDF Bulk](#download-pdf-bulk)
- [Filter Options](#filter-options)
- [Output Format](#output-format)
- [Troubleshooting](#troubleshooting)

---

## Overview

Sistem ini menyediakan 2 script CLI untuk download PDF SIMLOK dari database:

1. **`download-pdf.ts`** - Download single PDF berdasarkan submission ID
2. **`download-pdf-bulk.ts`** - Download multiple PDFs berdasarkan filter/kriteria

### Lokasi Output Default
Semua PDF akan disimpan di: `public/downloads/simlok-pdfs/`

Folder ini sudah ditambahkan ke `.gitignore` untuk menghindari commit file besar ke repository.

### Format Nama File
```
SIMLOK_{nomor_simlok}.pdf
```

**Contoh:**
- `SIMLOK_396_S00330_2026-S0.pdf`
- `SIMLOK_327_S00330_2026-S0.pdf`

---

## Instalasi

Tidak ada instalasi khusus. Script sudah siap digunakan melalui npm scripts.

### Dependencies
- TypeScript (`tsx` untuk eksekusi)
- Prisma Client
- PDF generation utilities (`src/utils/pdf/simlokTemplate.ts`)

---

## Download PDF Single

Download satu PDF berdasarkan submission ID.

### Syntax
```bash
npm run download-pdf -- <submission-id> [--output <directory>]
```

### Parameters

| Parameter | Required | Description | Default |
|-----------|----------|-------------|---------|
| `<submission-id>` | ✅ Yes | ID submission yang akan di-download | - |
| `--output` | ❌ No | Direktori output | `./public/downloads/simlok-pdfs` |

### Contoh Penggunaan

**Basic usage:**
```bash
npm run download-pdf -- cm123abc456def
```

**Custom output directory:**
```bash
npm run download-pdf -- cm123abc456def --output ./my-pdfs
```

### Output
```
📥 Downloading PDF for submission ID: cm123abc456def
📄 Found submission: 396/S00330/2026-S0
🔄 Generating PDF...
✅ PDF saved successfully: public/downloads/simlok-pdfs/SIMLOK_396_S00330_2026-S0.pdf
```

---

## Download PDF Bulk

Download multiple PDFs sekaligus berdasarkan filter.

### Syntax
```bash
npm run download-pdf-bulk -- [options]
```

### Default Behavior
**Jika dijalankan tanpa parameter**, script akan:
- Download semua submission dengan status: `APPROVED` + `MEETS_REQUIREMENTS`
- Save ke: `./public/downloads/simlok-pdfs/`

```bash
npm run download-pdf-bulk
```

---

## Filter Options

### Status Filters

| Option | Description |
|--------|-------------|
| `--approved` | Download submission yang sudah approved (default) |
| `--pending` | Download submission yang pending |
| `--rejected` | Download submission yang rejected |
| `--all` | Download semua submission (ignore status) |

**Contoh:**
```bash
# Download yang approved (default)
npm run download-pdf-bulk

# Download yang pending
npm run download-pdf-bulk -- --pending

# Download semua
npm run download-pdf-bulk -- --all
```

### Advanced Status Filters

| Option | Description | Example |
|--------|-------------|---------|
| `--approval-status <status>` | Filter by approval status | `--approval-status APPROVED` |
| `--review-status <status>` | Filter by review status | `--review-status MEETS_REQUIREMENTS` |

**Approval Status Values:**
- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`

**Review Status Values:**
- `PENDING_REVIEW`
- `MEETS_REQUIREMENTS`
- `NOT_MEETS_REQUIREMENTS`

### Date Filters

| Option | Description |
|--------|-------------|
| `--today` | Download hanya submission yang dibuat hari ini |

**Contoh:**
```bash
# Download approved hari ini
npm run download-pdf-bulk -- --today

# Download semua hari ini
npm run download-pdf-bulk -- --all --today

# Download pending hari ini
npm run download-pdf-bulk -- --pending --today
```

### Vendor Filter

| Option | Description | Example |
|--------|-------------|---------|
| `--vendor <vendor-id>` | Filter by vendor/user ID | `--vendor cm123abc456` |

**Contoh:**
```bash
# Download approved dari vendor tertentu
npm run download-pdf-bulk -- --vendor cm123abc456def

# Download semua dari vendor hari ini
npm run download-pdf-bulk -- --vendor cm123abc456def --today
```

### Limit

| Option | Description | Example |
|--------|-------------|---------|
| `--limit <number>` | Batasi jumlah download | `--limit 50` |

**Contoh:**
```bash
# Download 10 approved pertama
npm run download-pdf-bulk -- --limit 10

# Download 5 submission hari ini
npm run download-pdf-bulk -- --today --limit 5
```

### Output Directory

| Option | Description | Default |
|--------|-------------|---------|
| `--output <path>` | Custom output directory | `./public/downloads/simlok-pdfs` |

**Contoh:**
```bash
npm run download-pdf-bulk -- --output ./backup/pdfs
```

---

## Kombinasi Filter

Anda bisa mengkombinasikan multiple filters:

```bash
# Approved dari vendor tertentu hari ini, max 20
npm run download-pdf-bulk -- --vendor cm123 --today --limit 20

# Pending hari ini, save ke custom folder
npm run download-pdf-bulk -- --pending --today --output ./reports

# All submissions dari vendor tertentu
npm run download-pdf-bulk -- --all --vendor cm123
```

---

## Output Format

### Progress Display

Script akan menampilkan progress real-time:

```
📥 Starting bulk PDF download...
Options: { approved: true, today: true, output: './public/downloads/simlok-pdfs' }
📄 Found 15 submission(s)

[1/15] Processing: 396/S00330/2026-S0
✅ Saved: public/downloads/simlok-pdfs/SIMLOK_396_S00330_2026-S0.pdf

[2/15] Processing: 327/S00330/2026-S0
✅ Saved: public/downloads/simlok-pdfs/SIMLOK_327_S00330_2026-S0.pdf

...
```

### Summary Report

Setelah selesai, akan muncul ringkasan:

```
==================================================
📊 Download Summary:
   Total: 15
   ✅ Success: 14
   ❌ Failed: 1
   📁 Output: ./public/downloads/simlok-pdfs
==================================================
```

---

## Troubleshooting

### Error: Submission ID is required
**Penyebab:** Menjalankan `download-pdf` tanpa submission ID

**Solusi:**
```bash
npm run download-pdf -- <submission-id>
```

### Error: Cannot find module
**Penyebab:** Dependencies belum ter-install

**Solusi:**
```bash
npm install
```

### Warning: File not found (images/documents)
**Ini normal** jika file gambar/dokumen belum ada di local storage. PDF tetap akan ter-generate tanpa gambar.

**Contoh warning:**
```
[LoadWorkerPhoto] ❌ File not found at any path
```

PDF akan tetap dibuat, hanya tanpa foto pekerja atau dokumen pendukung.

### TypeScript Errors
Script menggunakan `tsx` yang lebih toleran terhadap type errors. Jika ada error saat compile, cek:

```bash
npx tsc --noEmit scripts/download-pdf-bulk.ts
```

### Permission Denied
Pastikan direktori output dapat ditulis:

```bash
chmod 755 public/downloads
```

---

## Technical Details

### Database Query
Script menggunakan Prisma dengan include relations:
```typescript
{
  user: true,
  worker_list: true,
  support_documents: true,
  approved_by_final_user: true
}
```

### Filter Logic (Default)
```typescript
where: {
  approval_status: 'APPROVED',
  review_status: 'MEETS_REQUIREMENTS'
}
```

### Date Filter (Today)
```typescript
where: {
  created_at: {
    gte: startOfDay,  // 00:00:00
    lte: endOfDay     // 23:59:59
  }
}
```

---

## Use Cases

### Backup Harian
Download semua approved hari ini:
```bash
npm run download-pdf-bulk -- --today
```

### Export Vendor Spesifik
Download semua submission dari satu vendor:
```bash
npm run download-pdf-bulk -- --all --vendor cm123abc
```

### Audit Trail
Download yang rejected untuk review:
```bash
npm run download-pdf-bulk -- --rejected --output ./audit
```

### Quick Download
Download 1 PDF spesifik untuk review:
```bash
npm run download-pdf -- cm123abc456
```

---

## Best Practices

1. **Gunakan `--limit`** saat testing untuk menghindari download mass data
2. **Gunakan `--today`** untuk backup incremental harian
3. **Custom `--output`** untuk organize files by purpose
4. **Check summary** untuk verify success rate
5. **Folder `public/downloads/`** sudah di-gitignore, aman untuk large files

---

## Script Location

```
scripts/
├── download-pdf.ts        # Single download by ID
└── download-pdf-bulk.ts   # Bulk download with filters
```

### Package.json Scripts
```json
{
  "download-pdf": "tsx scripts/download-pdf.ts",
  "download-pdf-bulk": "tsx scripts/download-pdf-bulk.ts"
}
```

---

## Future Enhancements

Potential improvements:
- [ ] Date range filter (--from, --to)
- [ ] ZIP compression for bulk downloads
- [ ] Email notification after completion
- [ ] Resume interrupted downloads
- [ ] Parallel processing for faster downloads
- [ ] CSV report generation

---

**Last Updated:** January 21, 2026
