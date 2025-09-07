# Logo Pertamina di Halaman Kedua PDF

## Ringkasan Perubahan

### ✅ Logo di Halaman Daftar Pekerja
**File Modified:** `src/utils/pdf/simlokTemplate.ts`

**Perubahan:**
1. **Logo di Halaman Kedua:** Logo Pertamina sekarang muncul di halaman "DAFTAR PEKERJA"
2. **Logo di Halaman Tambahan:** Ketika ada banyak pekerja yang memerlukan halaman tambahan, logo juga akan ditampilkan
3. **Konsistensi Design:** Posisi dan ukuran logo sama dengan halaman pertama

### 📍 Posisi Logo
- **Lokasi:** Kanan atas setiap halaman
- **Koordinat:** 40px dari tepi kanan, 60px dari atas
- **Ukuran:** 120px x 40px
- **Format:** PNG (logo_pertamina.png)

### 🔧 Implementation Details

#### 1. Halaman Kedua (addWorkerPhotosPage)
```typescript
// Load and add logo to the second page as well
const logoImage = await loadLogo(k.doc);
if (logoImage) {
  const logoWidth = 120;
  const logoHeight = 40;
  const logoX = A4.w - logoWidth - 40; // 40 pixels from right edge
  const logoY = A4.h - 60; // 60 pixels from top
  
  k.page.drawImage(logoImage, {
    x: logoX,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  });
}
```

#### 2. Halaman Tambahan (Overflow Workers)
```typescript
// Add logo to the new page
const logoImage = await loadLogo(k.doc);
if (logoImage) {
  // Same positioning as other pages
  k.page.drawImage(logoImage, { ... });
}
```

### 🎯 Hasil
- ✅ **Halaman 1:** Logo Pertamina di kanan atas (sudah ada sebelumnya)
- ✅ **Halaman 2:** Logo Pertamina di kanan atas + "DAFTAR PEKERJA"
- ✅ **Halaman 3+:** Logo Pertamina di setiap halaman tambahan daftar pekerja

### 📱 Konsistensi Branding
- Logo muncul di semua halaman PDF SIMLOK
- Posisi dan ukuran konsisten
- Tidak mengganggu konten utama
- Professional appearance

### 🧪 Testing
- ✅ TypeScript compilation: No errors
- ✅ Logo loading function: Reused existing `loadLogo()`
- ✅ Page layout: Logo tidak overlap dengan konten

### 📝 Notes
- Menggunakan fungsi `loadLogo()` yang sama untuk konsistensi
- Logo hanya ditampilkan jika file logo tersedia
- Graceful fallback jika logo tidak dapat dimuat
- Mempertahankan layout yang ada tanpa perubahan major

## Visual Preview

```
┌─────────────────────────────────────────────────────┐
│                                        [LOGO]       │
│                                                     │
│                 DAFTAR PEKERJA                      │
│            ─────────────────────────                │
│                                                     │
│  [FOTO]     [FOTO]     [FOTO]                      │
│  Worker1    Worker2    Worker3                      │
│                                                     │
│  [FOTO]     [FOTO]     [FOTO]                      │
│  Worker4    Worker5    Worker6                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Sekarang logo Pertamina akan muncul di semua halaman PDF SIMLOK! 🎉
