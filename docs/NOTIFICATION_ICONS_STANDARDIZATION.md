# Standardisasi Icon Notifikasi

## 📋 Overview
Dokumentasi ini menjelaskan standardisasi penggunaan icon dan warna untuk setiap tipe notifikasi dalam sistem Simlok.

## 🎯 Tujuan Standardisasi
- **Konsistensi Visual**: Icon yang sama untuk tipe notifikasi yang sama di semua komponen
- **User Experience**: Pengguna dapat dengan mudah mengenali jenis notifikasi dari icon-nya
- **Maintainability**: Mudah untuk maintain dan update di masa depan

## 🎨 Standard Icon Mapping

### ✅ Status Disetujui (GREEN)
**Icon**: `CheckCircleIcon`  
**Warna**: `text-green-600`  
**Tipe Notifikasi**:
- `submission_approved` - Pengajuan disetujui

**Contoh**:
```tsx
<CheckCircleIcon className="w-5 h-5 text-green-600" />
```

---

### ❌ Status Ditolak (RED)
**Icon**: `XCircleIcon`  
**Warna**: `text-red-600`  
**Tipe Notifikasi**:
- `submission_rejected` - Pengajuan ditolak oleh approver/reviewer
- `reviewed_submission_rejection` - Pengajuan tidak memenuhi syarat saat review

**Contoh**:
```tsx
<XCircleIcon className="w-5 h-5 text-red-600" />
```

**Note**: Menggunakan `XCircleIcon` (bukan `XMarkIcon`) untuk konsistensi dengan `CheckCircleIcon`

---

### ⏱️ Status Pending/Review (AMBER)
**Icon**: `ClockIcon`  
**Warna**: `text-amber-600`  
**Tipe Notifikasi**:
- `submission_pending` - Pengajuan dalam status pending
- `new_submission_review` - Pengajuan baru untuk direview

**Contoh**:
```tsx
<ClockIcon className="w-5 h-5 text-amber-600" />
```

---

### ✓ Perlu Persetujuan (BLUE SHIELD)
**Icon**: `ShieldCheckIcon`  
**Warna**: `text-blue-600`  
**Tipe Notifikasi**:
- `reviewed_submission_approval` - Pengajuan sudah direview dan perlu persetujuan final
- `status_change` - Perubahan status umum

**Contoh**:
```tsx
<ShieldCheckIcon className="w-5 h-5 text-blue-600" />
```

**Alasan**: Shield icon menunjukkan bahwa ada proses approval/keamanan yang diperlukan

---

### 📄 Pengajuan Baru (BLUE DOCUMENT)
**Icon**: `DocumentPlusIcon`  
**Warna**: `text-blue-600`  
**Tipe Notifikasi**:
- `new_submission` - Pengajuan baru masuk

**Contoh**:
```tsx
<DocumentPlusIcon className="w-5 h-5 text-blue-600" />
```

---

### 👤 User/Vendor Baru (BLUE USER)
**Icon**: `UserPlusIcon`  
**Warna**: `text-blue-600`  
**Tipe Notifikasi**:
- `user_registered` - User baru terdaftar
- `new_vendor` - Vendor baru mendaftar
- `new_user_verification` - User baru perlu verifikasi
- `vendor_verified` - Vendor terverifikasi

**Contoh**:
```tsx
<UserPlusIcon className="w-5 h-5 text-blue-600" />
```

---

### 🔔 Default (GRAY BELL)
**Icon**: `BellIcon`  
**Warna**: `text-gray-600`  
**Tipe Notifikasi**: Semua tipe yang tidak terdefinisi di atas

**Contoh**:
```tsx
<BellIcon className="w-5 h-5 text-gray-600" />
```

---

## 📦 Komponen yang Diupdate

### 1. NotificationsPanel.tsx
**Path**: `src/components/notifications/NotificationsPanel.tsx`

**Fungsi**: `getNotificationIcon(type: string)`

**Import yang Diperlukan**:
```tsx
import {
  BellIcon,
  XMarkIcon,
  XCircleIcon,      // ✅ ADDED
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  ShieldCheckIcon,
  InboxIcon
} from '@heroicons/react/24/outline';
```

**Case Tambahan**:
- `reviewed_submission_rejection` → `XCircleIcon` (red)
- `new_submission_review` → `ClockIcon` (amber)
- `reviewed_submission_approval` → `ShieldCheckIcon` (blue)

---

### 2. Notifications Page
**Path**: `src/app/(dashboard)/dashboard/notifications/page.tsx`

**Fungsi**: `getNotificationIcon(type: string)`

**Import yang Diperlukan**:
```tsx
import {
  BellIcon,
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentPlusIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  XCircleIcon,      // ✅ ADDED
  ArrowRightIcon
} from '@heroicons/react/24/outline';
```

**Update `submissionTypes` Array**:
```tsx
const submissionTypes = [
  'submission_approved',
  'submission_rejected',
  'submission_pending',
  'new_submission',
  'new_submission_review',           // ✅ ADDED
  'reviewed_submission_approval',    // ✅ ADDED
  'reviewed_submission_rejection',   // ✅ ADDED
  'status_change'
];
```

---

## 🎨 Color Palette

### Status Colors
| Status | Color Class | Hex Code | Usage |
|--------|-------------|----------|-------|
| Success/Approved | `text-green-600` | `#059669` | Approved submissions |
| Error/Rejected | `text-red-600` | `#DC2626` | Rejected submissions |
| Warning/Pending | `text-amber-600` | `#D97706` | Pending/review status |
| Info/Action | `text-blue-600` | `#2563EB` | New items, needs action |
| Neutral | `text-gray-600` | `#4B5563` | Default state |

---

## 🔄 Workflow Icon Usage

### Vendor Workflow
1. **Submit** → `DocumentPlusIcon` (blue) - "Pengajuan Baru"
2. **Review** → `ClockIcon` (amber) - "Sedang Direview"
3. **Approved** → `CheckCircleIcon` (green) - "Disetujui"
4. **Rejected** → `XCircleIcon` (red) - "Ditolak"

### Reviewer Workflow
1. **New Submission** → `DocumentPlusIcon` (blue) - "Pengajuan Baru untuk Review"
2. **Reviewing** → `ClockIcon` (amber) - "Sedang Review"
3. **Send to Approver** → `ShieldCheckIcon` (blue) - "Perlu Persetujuan Final"
4. **Reject** → `XCircleIcon` (red) - "Tidak Memenuhi Syarat"

### Approver Workflow
1. **Needs Approval** → `ShieldCheckIcon` (blue) - "Perlu Persetujuan"
2. **Approved** → `CheckCircleIcon` (green) - "Disetujui"
3. **Rejected** → `XCircleIcon` (red) - "Ditolak"

---

## 📝 Enhanced Message Mapping

### NotificationsPanel Enhanced Messages
```tsx
const getEnhancedMessage = (notification: Notification) => {
  switch (type) {
    case 'submission_approved':
      return { title: 'Pengajuan Disetujui', ... };
    
    case 'submission_rejected':
    case 'reviewed_submission_rejection':
      return { title: 'Pengajuan Ditolak', ... };
    
    case 'submission_pending':
    case 'new_submission_review':
      return { title: 'Pengajuan Perlu Review', ... };
    
    case 'reviewed_submission_approval':
      return { title: 'Pengajuan Perlu Persetujuan', ... };
    
    case 'new_submission':
      return { title: 'Pengajuan Baru Masuk', ... };
    
    case 'user_registered':
    case 'new_vendor':
    case 'new_user_verification':
      return { title: 'User Baru Perlu Verifikasi', ... };
  }
};
```

---

## ✅ Checklist Implementasi

- [x] Update `NotificationsPanel.tsx` dengan icon konsisten
- [x] Update `notifications/page.tsx` dengan icon konsisten
- [x] Tambah import `XCircleIcon` di kedua file
- [x] Standardisasi warna untuk setiap status
- [x] Update `submissionTypes` array
- [x] Update enhanced messages untuk tipe baru
- [x] Dokumentasi lengkap dibuat

---

## 🧪 Testing Checklist

### Visual Testing
- [ ] Notifikasi approval menampilkan `CheckCircleIcon` hijau
- [ ] Notifikasi rejection menampilkan `XCircleIcon` merah
- [ ] Notifikasi pending/review menampilkan `ClockIcon` amber
- [ ] Notifikasi perlu approval menampilkan `ShieldCheckIcon` biru
- [ ] Notifikasi baru menampilkan icon yang sesuai

### Functional Testing
- [ ] Semua tipe notifikasi memiliki icon
- [ ] Warna icon konsisten di panel dan halaman notifikasi
- [ ] Tidak ada console error terkait missing icons
- [ ] Enhanced messages ditampilkan dengan benar

---

## 🔮 Future Improvements

1. **Icon Library**: Pertimbangkan membuat custom icon component untuk reusability
2. **Theme Support**: Siapkan dark mode color variants
3. **Animation**: Tambahkan subtle animation untuk notifikasi baru
4. **Sound**: Pertimbangkan sound notification untuk tipe tertentu
5. **Badge**: Tambahkan badge indicator untuk priority notifications

---

## 📚 References

- HeroIcons Documentation: https://heroicons.com/
- Tailwind CSS Colors: https://tailwindcss.com/docs/customizing-colors
- Next.js Best Practices: https://nextjs.org/docs

---

**Terakhir Diupdate**: 5 November 2025  
**Version**: 1.0  
**Author**: System Developer
