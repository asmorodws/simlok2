# Update: Simplified Supporting Documents Page Display

**Date:** October 20, 2025  
**Change:** Remove detailed information from supporting documents page, show only document title and preview

---

## 🎯 **Change Summary**

**BEFORE:**
Each document cell displayed:
- Document title (SIMJA/SIKA/HSSE Pass)
- Document type/subtitle
- Document number
- Document date
- Document preview (~200px height)

**AFTER:**
Each document cell displays:
- Document title only (SIMJA/SIKA/HSSE Pass)
- Document preview (~250px height - **25% larger!**)

---

## 📊 **Visual Comparison**

### **Before (With Details):**
```
┌────────────────────────┐
│ SIMJA (Bold)           │ ← Title
│ Pekerjaan Dingin       │ ← Subtitle (Type)
│                        │
│ No: 123/SIMJA/2025     │ ← Info
│ Tanggal: 15 Okt 2025   │ ← Info
│                        │
│ ┌──────────────────┐   │
│ │                  │   │
│ │   [Document]     │   │ ← Preview (200px)
│ │                  │   │
│ └──────────────────┘   │
└────────────────────────┘
```

### **After (Document Only):**
```
┌────────────────────────┐
│ SIMJA (Bold)           │ ← Title only
│                        │
│ ┌──────────────────┐   │
│ │                  │   │
│ │                  │   │
│ │   [Document]     │   │ ← Preview (250px - BIGGER!)
│ │                  │   │
│ │                  │   │
│ └──────────────────┘   │
└────────────────────────┘
```

---

## 🔧 **Code Changes**

**File:** `src/utils/pdf/simlokTemplate.ts`

### **Removed:**
```typescript
// Subtitle display
if (doc.subtitle) {
  k.text(doc.subtitle, x + 10, titleY - 15, { 
    size: 10, 
    color: rgb(0.4, 0.4, 0.4) 
  });
}

// Document info (number and date)
const infoY = titleY - (doc.subtitle ? 35 : 20);
k.text(`No: ${doc.number}`, x + 10, infoY, { size: 9 });
k.text(`Tanggal: ${doc.date}`, x + 10, infoY - 12, { size: 9 });
```

### **Simplified:**
```typescript
// Draw document title only (no subtitle, no number, no date)
const titleY = y - 15;
k.text(doc.title, x + 10, titleY, { bold: true, size: 12 });

// Use more space for document preview
const imageY = titleY - 10; // Start closer to title
const imageHeight = docHeight - 30; // More space (was docHeight - 80)
const imageWidth = docWidth - 20;
```

---

## 📏 **Space Allocation**

### **Before:**
- Title: 15px
- Subtitle: 15px (if exists)
- Info: 35-20px (number + date)
- Spacing: 25px
- **Total header:** 80px
- **Document preview:** 200px (280 - 80)

### **After:**
- Title: 15px
- Spacing: 10px
- **Total header:** 30px
- **Document preview:** 250px (280 - 30)

**Result:** Document preview is **50px taller (25% bigger)**!

---

## ✅ **Benefits**

1. **Cleaner Display:**
   - ✅ Less clutter
   - ✅ Focus on document content
   - ✅ Easier to review visually

2. **Better Visibility:**
   - ✅ 25% larger document preview
   - ✅ More readable document content
   - ✅ Better use of available space

3. **Faster Processing:**
   - ✅ Less text rendering
   - ✅ Simpler layout calculations
   - ✅ Fewer function calls

4. **User-Friendly:**
   - ✅ Document title still clearly labeled (SIMJA/SIKA/HSSE Pass)
   - ✅ Larger preview = easier verification
   - ✅ Professional, clean appearance

---

## 🎨 **Layout Details**

### **Document Cell Structure:**
```
Cell Size: 220px × 280px

┌─────────────────────────────┐
│ [15px] SIMJA (Title)        │
│ [10px spacing]              │
├─────────────────────────────┤
│                             │
│                             │
│     [250px]                 │
│     Document                │
│     Preview                 │
│     Area                    │
│                             │
│                             │
└─────────────────────────────┘
```

### **Grid Layout (Unchanged):**
- 2 columns × 2 rows
- Horizontal gap: 30px
- Vertical gap: 30px
- Centered on page

---

## 🧪 **Testing**

### **Expected Results:**

1. **Visual Check:**
   - ✅ Each document shows only title (SIMJA/SIKA/HSSE Pass)
   - ✅ No subtitle, number, or date displayed
   - ✅ Document preview is noticeably larger

2. **Functionality:**
   - ✅ Document loading still works (image and PDF)
   - ✅ Aspect ratio still preserved
   - ✅ Error placeholders still work

3. **Layout:**
   - ✅ Documents still in grid (2×2)
   - ✅ Still centered on page
   - ✅ Frame borders still visible

---

## 📝 **Console Logs (Unchanged)**

```
[AddSupportingDocumentsPage] Creating documents page...
[AddSupportingDocumentsPage] Found 3 documents to display
[AddSupportingDocumentsPage] Drawing SIMJA at position (187, 701)
[AddSupportingDocumentsPage] ✅ SIMJA image drawn successfully
[AddSupportingDocumentsPage] Drawing SIKA at position (447, 701)
[AddSupportingDocumentsPage] ✅ SIKA PDF drawn successfully
[AddSupportingDocumentsPage] Drawing HSSE Pass at position (187, 391)
[AddSupportingDocumentsPage] ✅ HSSE Pass image drawn successfully
[AddSupportingDocumentsPage] Documents page completed
```

---

## 🔄 **Comparison: Old vs New**

| Aspect | Before | After | Change |
|--------|--------|-------|--------|
| Title | ✅ Yes | ✅ Yes | No change |
| Subtitle | ✅ Yes | ❌ No | Removed |
| Number | ✅ Yes | ❌ No | Removed |
| Date | ✅ Yes | ❌ No | Removed |
| Preview Height | 200px | 250px | +50px (+25%) |
| Header Height | 80px | 30px | -50px (-62.5%) |
| Total Cell | 280px | 280px | No change |

---

## 💡 **Rationale**

### **Why Remove Details?**

1. **Information Already in Main Document:**
   - Nomor SIMJA/SIKA sudah ada di halaman 1 (bagian "Lain-lain")
   - Tanggal sudah tertulis di halaman 1
   - Detail ini redundant di halaman lampiran

2. **Focus on Visual Verification:**
   - User ingin **melihat dokumen**, bukan membaca info
   - Larger preview = easier to verify document authenticity
   - Visual inspection lebih penting daripada metadata

3. **Professional Appearance:**
   - Cleaner, less cluttered
   - More focus on actual document content
   - Better use of limited space

---

## ✅ **Status**

- [x] Code modified (simlokTemplate.ts)
- [x] TypeScript: 0 errors
- [x] Documentation created
- [ ] Testing with real documents
- [ ] User validation

---

**Change Complete!** 🎉

Halaman lampiran dokumen sekarang menampilkan hanya judul dan preview dokumen yang lebih besar, tanpa detail nomor, tanggal, atau type. Fokus sepenuhnya pada konten dokumen visual.
