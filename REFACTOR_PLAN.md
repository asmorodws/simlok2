# 📋 Rencana Refactoring Struktur Folder & File

## 🎯 Tujuan
Meningkatkan maintainability dengan struktur folder yang jelas, penamaan konsisten, dan grouping berdasarkan domain.

## 📊 Analisis Struktur Saat Ini

### ❌ Masalah yang Ditemukan

#### 1. Duplikasi & Inkonsistensi di `/src/lib`
```
❌ api-cache.ts      (server-side cache helper)
❌ apiCache.ts       (client-side cache helper)
❌ apiOptimization.ts (client optimization utils)
❌ api-utils.ts      (server API utilities)
```
**Problem:** 
- Naming tidak konsisten (kebab-case vs camelCase)
- Duplikasi konsep "cache" yang membingungkan
- Tidak jelas mana client-side mana server-side

#### 2. File Utility Tidak Terorganisir
```
/src/lib/
  ├── auth.ts
  ├── cache.ts
  ├── db.ts
  ├── env.ts
  ├── fetchJson.ts
  ├── fileManager.ts
  ├── fileUrlHelper.ts
  ├── notificationAudience.ts
  ├── notificationCleanup.ts
  ├── parseNumber.ts
  ├── prisma.ts
  ├── qr-security.ts
  ├── redis.ts
  ├── singletons.ts
  └── utils.ts
```
**Problem:** Semua tercampur tanpa grouping domain

#### 3. Components Sudah Bagus (Tetap Dipertahankan)
```
/src/components/
  ├── admin/          ✅
  ├── approver/       ✅
  ├── reviewer/       ✅
  ├── verifier/       ✅
  ├── visitor/        ✅
  ├── vendor/         ✅
  ├── common/         ✅
  ├── ui/             ✅
  └── ...
```
**Good:** Sudah terorganisir berdasarkan role/fungsi

---

## 🎨 Struktur Baru yang Direkomendasikan

### 📁 Struktur `/src/lib` - Reorganisasi

```
/src/lib/
├── api/
│   ├── client/
│   │   ├── cache.ts              (rename dari apiCache.ts)
│   │   ├── optimization.ts       (rename dari apiOptimization.ts)
│   │   └── fetcher.ts            (rename dari fetchJson.ts)
│   └── server/
│       ├── cache.ts              (rename dari api-cache.ts)
│       ├── utils.ts              (rename dari api-utils.ts)
│       └── validation.ts         (pisah dari api-utils.ts)
├── database/
│   ├── prisma.ts                 (tetap)
│   ├── redis.ts                  (tetap)
│   └── singletons.ts             (tetap)
├── security/
│   ├── auth.ts                   (tetap)
│   └── qr.ts                     (rename dari qr-security.ts)
├── storage/
│   ├── file-manager.ts           (rename dari fileManager.ts)
│   └── file-url-helper.ts        (rename dari fileUrlHelper.ts)
├── notifications/
│   ├── audience.ts               (rename dari notificationAudience.ts)
│   └── cleanup.ts                (rename dari notificationCleanup.ts)
└── utils/
    ├── env.ts                    (tetap)
    ├── parse.ts                  (rename dari parseNumber.ts)
    ├── cache.ts                  (tetap - generic cache)
    └── helpers.ts                (rename dari utils.ts)
```

### 📁 Struktur `/src/hooks` - Tetap dengan Minor Improvements

```
/src/hooks/
├── api/
│   └── use-api-optimization.ts   (rename dari useApiOptimization.ts)
├── ui/
│   ├── use-modal.ts              (rename dari useModal.ts)
│   └── use-toast.ts              (rename dari useToast.ts)
├── data/
│   └── use-implementation-dates.ts (rename dari useImplementationDates.ts)
└── session/
    ├── use-session-monitor.ts    (rename dari useSessionMonitor.ts)
    └── use-realtime-notifications.ts (rename dari useRealTimeNotifications.ts)
```

---

## 🔧 Naming Convention yang Dipilih

### ✅ Aturan Penamaan

1. **Files:** `kebab-case.ts` (lowercase dengan dash)
   ```
   ✅ file-manager.ts
   ✅ use-api-optimization.ts
   ❌ fileManager.ts
   ❌ useApiOptimization.ts
   ```

2. **Folders:** `kebab-case` (lowercase dengan dash)
   ```
   ✅ api/client/
   ✅ user-profile/
   ❌ apiClient/
   ❌ userProfile/
   ```

3. **Components:** `PascalCase.tsx`
   ```
   ✅ UserTable.tsx
   ✅ ReviewerDashboard.tsx
   ✅ SimlokPdfModal.tsx
   ```

4. **Hooks:** Prefix `use-` dengan kebab-case
   ```
   ✅ use-api-optimization.ts
   ✅ use-toast.ts
   ❌ useApiOptimization.ts
   ```

### 📌 Alasan Pemilihan Naming Convention

**Kenapa kebab-case untuk files?**
- ✅ Case-insensitive file systems friendly (Windows/Mac)
- ✅ Lebih readable untuk nama panjang
- ✅ Standard di banyak modern frameworks (Next.js app router)
- ✅ Konsisten dengan URL routing

**Kenapa PascalCase untuk components?**
- ✅ React convention
- ✅ Membedakan component dari utility files
- ✅ Standard industry

---

## 🚀 Migration Plan

### Phase 1: Reorganisasi `/src/lib` (Priority: HIGH)

#### Step 1.1: Buat Struktur Folder Baru
```bash
mkdir -p src/lib/api/client
mkdir -p src/lib/api/server
mkdir -p src/lib/database
mkdir -p src/lib/security
mkdir -p src/lib/storage
mkdir -p src/lib/notifications
mkdir -p src/lib/utils
```

#### Step 1.2: Move & Rename Files
```bash
# API - Client Side
mv src/lib/apiCache.ts src/lib/api/client/cache.ts
mv src/lib/apiOptimization.ts src/lib/api/client/optimization.ts
mv src/lib/fetchJson.ts src/lib/api/client/fetcher.ts

# API - Server Side
mv src/lib/api-cache.ts src/lib/api/server/cache.ts
mv src/lib/api-utils.ts src/lib/api/server/utils.ts

# Database
mv src/lib/prisma.ts src/lib/database/prisma.ts
mv src/lib/redis.ts src/lib/database/redis.ts
mv src/lib/singletons.ts src/lib/database/singletons.ts
mv src/lib/db.ts src/lib/database/client.ts

# Security
mv src/lib/auth.ts src/lib/security/auth.ts
mv src/lib/qr-security.ts src/lib/security/qr.ts

# Storage
mv src/lib/fileManager.ts src/lib/storage/file-manager.ts
mv src/lib/fileUrlHelper.ts src/lib/storage/file-url-helper.ts

# Notifications
mv src/lib/notificationAudience.ts src/lib/notifications/audience.ts
mv src/lib/notificationCleanup.ts src/lib/notifications/cleanup.ts

# Utils
mv src/lib/parseNumber.ts src/lib/utils/parse.ts
mv src/lib/utils.ts src/lib/utils/helpers.ts
# cache.ts dan env.ts sudah di utils, tetap
```

#### Step 1.3: Update All Imports
Setelah move files, update semua import statements di:
- `src/app/**/*.tsx`
- `src/components/**/*.tsx`
- `src/hooks/**/*.ts`
- `src/services/**/*.ts`
- `src/server/**/*.ts`

**Old Import:**
```typescript
import { cachedFetch } from '@/lib/apiCache';
import { debounce } from '@/lib/apiOptimization';
import { prisma } from '@/lib/prisma';
```

**New Import:**
```typescript
import { cachedFetch } from '@/lib/api/client/cache';
import { debounce } from '@/lib/api/client/optimization';
import { prisma } from '@/lib/database/prisma';
```

### Phase 2: Reorganisasi `/src/hooks` (Priority: MEDIUM)

#### Step 2.1: Buat Struktur Folder
```bash
mkdir -p src/hooks/api
mkdir -p src/hooks/ui
mkdir -p src/hooks/data
mkdir -p src/hooks/session
```

#### Step 2.2: Move & Rename Files
```bash
mv src/hooks/useApiOptimization.ts src/hooks/api/use-api-optimization.ts
mv src/hooks/useModal.ts src/hooks/ui/use-modal.ts
mv src/hooks/useToast.ts src/hooks/ui/use-toast.ts
mv src/hooks/useImplementationDates.ts src/hooks/data/use-implementation-dates.ts
mv src/hooks/useSessionMonitor.ts src/hooks/session/use-session-monitor.ts
mv src/hooks/useRealTimeNotifications.ts src/hooks/session/use-realtime-notifications.ts
```

#### Step 2.3: Update Imports
**Old:**
```typescript
import { useToast } from '@/hooks/useToast';
import { useFetch } from '@/hooks/useApiOptimization';
```

**New:**
```typescript
import { useToast } from '@/hooks/ui/use-toast';
import { useFetch } from '@/hooks/api/use-api-optimization';
```

### Phase 3: Create Index Files (Priority: LOW)

Buat barrel exports untuk kemudahan import:

#### `/src/lib/api/client/index.ts`
```typescript
export * from './cache';
export * from './optimization';
export * from './fetcher';
```

#### `/src/lib/api/server/index.ts`
```typescript
export * from './cache';
export * from './utils';
```

#### `/src/hooks/api/index.ts`
```typescript
export * from './use-api-optimization';
```

**Usage:**
```typescript
// Old: import dari file spesifik
import { cachedFetch } from '@/lib/api/client/cache';
import { debounce } from '@/lib/api/client/optimization';

// New: import dari barrel
import { cachedFetch, debounce } from '@/lib/api/client';
```

---

## 📝 Checklist Eksekusi

### Persiapan
- [ ] Backup repository (git commit semua changes)
- [ ] Buat branch baru: `git checkout -b refactor/folder-structure`
- [ ] Pastikan tidak ada uncommitted changes

### Phase 1: `/src/lib` Reorganization
- [ ] Buat struktur folder baru
- [ ] Move dan rename files
- [ ] Update imports di semua files
- [ ] Test build: `npm run build`
- [ ] Test dev: `npm run dev`
- [ ] Commit: `git commit -m "refactor: reorganize /src/lib structure"`

### Phase 2: `/src/hooks` Reorganization
- [ ] Buat struktur folder
- [ ] Move dan rename files
- [ ] Update imports
- [ ] Test build & dev
- [ ] Commit: `git commit -m "refactor: reorganize /src/hooks structure"`

### Phase 3: Barrel Exports
- [ ] Buat index.ts files
- [ ] (Optional) Refactor imports to use barrel exports
- [ ] Test build & dev
- [ ] Commit: `git commit -m "refactor: add barrel exports"`

### Final
- [ ] Run full test suite
- [ ] Merge ke main branch
- [ ] Update dokumentasi README

---

## ⚡ Quick Commands

### Find All Import References (Before Refactoring)
```bash
# Find all imports of apiCache
grep -r "from '@/lib/apiCache'" src/

# Find all imports of useToast
grep -r "from '@/hooks/useToast'" src/

# Find all imports of api-cache
grep -r "from '@/lib/api-cache'" src/
```

### Update All Imports (Using sed - Automated)
```bash
# Update apiCache imports
find src -type f -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i "s|from '@/lib/apiCache'|from '@/lib/api/client/cache'|g"

# Update apiOptimization imports
find src -type f -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i "s|from '@/lib/apiOptimization'|from '@/lib/api/client/optimization'|g"

# Update useToast imports
find src -type f -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i "s|from '@/hooks/useToast'|from '@/hooks/ui/use-toast'|g"
```

---

## 📊 Benefits Setelah Refactoring

### ✅ Maintainability
- Domain separation jelas (api/database/security/storage/notifications)
- Client-side vs server-side terpisah
- Mudah menemukan file berdasarkan fungsi

### ✅ Scalability
- Mudah menambah file baru di folder yang tepat
- Struktur siap untuk growth

### ✅ Developer Experience
- Konsistensi naming (kebab-case)
- Auto-complete lebih baik (barrel exports)
- Onboarding developer baru lebih cepat

### ✅ Code Organization
- No more "utility dumping ground"
- Clear responsibility per folder
- Easier to understand codebase architecture

---

## 🎯 Struktur Final

```
src/
├── lib/
│   ├── api/
│   │   ├── client/           # Client-side API utilities
│   │   │   ├── cache.ts
│   │   │   ├── optimization.ts
│   │   │   ├── fetcher.ts
│   │   │   └── index.ts
│   │   └── server/           # Server-side API utilities
│   │       ├── cache.ts
│   │       ├── utils.ts
│   │       └── index.ts
│   ├── database/             # Database connections & ORM
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── client.ts
│   │   └── singletons.ts
│   ├── security/             # Auth & security utilities
│   │   ├── auth.ts
│   │   └── qr.ts
│   ├── storage/              # File storage utilities
│   │   ├── file-manager.ts
│   │   └── file-url-helper.ts
│   ├── notifications/        # Notification system
│   │   ├── audience.ts
│   │   └── cleanup.ts
│   └── utils/                # Generic utilities
│       ├── cache.ts
│       ├── env.ts
│       ├── parse.ts
│       └── helpers.ts
├── hooks/
│   ├── api/                  # API-related hooks
│   │   ├── use-api-optimization.ts
│   │   └── index.ts
│   ├── ui/                   # UI-related hooks
│   │   ├── use-modal.ts
│   │   ├── use-toast.ts
│   │   └── index.ts
│   ├── data/                 # Data manipulation hooks
│   │   └── use-implementation-dates.ts
│   └── session/              # Session & realtime hooks
│       ├── use-session-monitor.ts
│       └── use-realtime-notifications.ts
└── components/               # ✅ Already good (keep as is)
    ├── admin/
    ├── approver/
    ├── reviewer/
    ├── verifier/
    ├── visitor/
    ├── vendor/
    ├── common/
    └── ui/
```

---

## 💡 Rekomendasi Tambahan

### 1. Tambahkan README.md di Setiap Folder
Contoh `/src/lib/api/client/README.md`:
```markdown
# Client-Side API Utilities

This folder contains client-side API optimization and caching utilities.

## Files
- `cache.ts` - Client-side in-memory cache with TTL
- `optimization.ts` - Debounce, throttle, SmartPolling utilities
- `fetcher.ts` - Enhanced fetch wrapper with error handling

## Usage
See API_OPTIMIZATION_SUMMARY.md for detailed usage examples.
```

### 2. Gunakan Path Aliases di tsconfig.json
```json
{
  "compilerOptions": {
    "paths": {
      "@/lib/*": ["./src/lib/*"],
      "@/lib/api/client": ["./src/lib/api/client"],
      "@/lib/api/server": ["./src/lib/api/server"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/components/*": ["./src/components/*"]
    }
  }
}
```

### 3. Enforce dengan ESLint
Tambahkan di `.eslintrc.json`:
```json
{
  "rules": {
    "import/order": ["error", {
      "groups": [
        "builtin",
        "external",
        "internal",
        ["parent", "sibling"],
        "index"
      ],
      "pathGroups": [
        {
          "pattern": "@/lib/**",
          "group": "internal",
          "position": "before"
        }
      ]
    }]
  }
}
```

---

## 🚨 Catatan Penting

1. **Lakukan di branch terpisah** - Jangan langsung ke main
2. **Test setiap phase** - Jangan move semua sekaligus
3. **Commit per phase** - Mudah rollback jika ada masalah
4. **Update documentation** - Pastikan docs mencerminkan struktur baru
5. **Inform team** - Koordinasi dengan tim jika collaborative project

---

**Status:** 📋 DRAFT - Ready for Review & Implementation
**Created:** November 3, 2025
**Priority:** HIGH - Improves long-term maintainability
