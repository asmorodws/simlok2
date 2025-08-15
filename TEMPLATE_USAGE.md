# 📋 Template Generator Usage Guide

## 🎯 Fitur Template Generator untuk Admin

### **Pelaksanaan Template**
Form ini membantu admin membuat template pelaksanaan dengan format standar.

**Input Template:**
- **Tanggal Dari**: Tanggal mulai pelaksanaan
- **Tanggal Sampai**: Tanggal selesai pelaksanaan  

**Output Template:**
```
Terhitung mulai tanggal [tanggal dari] sampai [tanggal sampai]. Termasuk hari Sabtu, Minggu dan hari libur lainnya.
```

**Contoh:**
```
Terhitung mulai tanggal 15 Januari 2025 sampai 20 Januari 2025. Termasuk hari Sabtu, Minggu dan hari libur lainnya.
```

---

### **Lain-lain Template**
Form ini membantu admin membuat template lain-lain berdasarkan data SIMJA/SIKA.

**Input Template:**
- **Tanggal Diterima Head of Security**: Tanggal persetujuan security

**Data Otomatis dari Submission:**
- Nomor SIMJA & Tanggal SIMJA
- Nomor SIKA & Tanggal SIKA

**Output Template:**
```
Izin diberikan berdasarkan:
* Simja Ast Man Facility Management
     [nomor_simja] Tgl. [tanggal_simja]

* SIKA Pekerjaan Dingin
      [nomor_sika] Tgl. [tanggal_sika]

      Diterima Head Of Security Region 1
      [tanggal_diterima_security]
```

**Contoh:**
```
Izin diberikan berdasarkan:
* Simja Ast Man Facility Management
     SIMJA/2024/001 Tgl. 10 Januari 2025

* SIKA Pekerjaan Dingin
      SIKA/2024/001 Tgl. 12 Januari 2025

      Diterima Head Of Security Region 1
      15 Januari 2025
```

---

## 🔄 Cara Penggunaan

1. **Buka Modal Admin Submission Detail**
2. **Tab "Proses Persetujuan"**
3. **Scroll ke bagian Pelaksanaan/Lain-lain**
4. **Isi template helper fields (background biru/hijau)**
5. **Klik "🔄 Generate Template"**
6. **Edit manual jika diperlukan**
7. **Submit approval**

---

## ✨ Keunggulan

- ✅ **Template Konsisten**: Format standar untuk semua approval
- ✅ **Efisien**: Tidak perlu ketik manual berulang-ulang
- ✅ **Editable**: Bisa edit hasil template sesuai kebutuhan
- ✅ **Auto-populate**: Data SIMJA/SIKA otomatis terambil
- ✅ **No Database Impact**: Template fields tidak disimpan ke database
- ✅ **User Friendly**: Interface intuitif dengan warna berbeda

---

## 🎨 Visual Guide

- 🔵 **Background Biru**: Template Pelaksanaan  
- 🟢 **Background Hijau**: Template Lain-lain
- ⭐ **Required Field**: Pelaksanaan wajib diisi
- 📝 **Optional Field**: Lain-lain boleh kosong
