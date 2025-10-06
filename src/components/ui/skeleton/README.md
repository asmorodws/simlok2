# Loading Skeleton Components

Dokumentasi untuk komponen skeleton loading yang digunakan di aplikasi SIMLOK.

## Komponen Utama

### 1. TableSkeleton
Digunakan untuk loading state pada tabel data.

```tsx
import { ReviewerTableSkeleton, ApproverTableSkeleton } from '@/components/ui/skeleton/TableSkeleton';

// Penggunaan umum
<TableSkeleton rows={5} columns={6} showHeader />

// Penggunaan khusus
<ReviewerTableSkeleton />
<ApproverTableSkeleton />
```

### 2. CardSkeleton
Untuk loading state pada dashboard cards dan stats.

```tsx
import CardSkeleton, { ChartSkeleton, ListSkeleton } from '@/components/ui/skeleton/CardSkeleton';

// Stats cards
<CardSkeleton count={4} />

// Chart section
<ChartSkeleton />

// List dengan avatar
<ListSkeleton rows={5} showAvatar />
```

### 3. PageSkeleton
Skeleton lengkap untuk seluruh halaman.

```tsx
import PageSkeleton from '@/components/ui/skeleton/PageSkeleton';

// Halaman dengan header, filters, dan tabel
<PageSkeleton hasHeader hasFilters hasStats={false} />

// Dashboard dengan stats
<PageSkeleton hasHeader={false} hasFilters={false} hasStats />
```

## Implementasi di Table Components

### ReviewerTable & ApproverTable
Kedua komponen ini sudah mendukung prop `loading`:

```tsx
// Contoh penggunaan
<ReviewerTable
  data={submissions}
  loading={loading}  // ← Tambahkan prop ini
  sortBy={sortBy}
  sortOrder={sortOrder}
  onSortChange={handleSort}
  onOpenDetail={handleViewDetail}
/>
```

### Mengganti Loading State Lama
Ganti loading state manual dengan skeleton:

```tsx
// ❌ Cara lama
if (loading) {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

// ✅ Cara baru
if (loading) {
  return <ReviewerTableSkeleton />;
}
```

## Fitur Skeleton

### Animasi Bertingkat
Skeleton menggunakan animasi pulse dengan delay yang berbeda untuk memberikan efek loading yang lebih natural.

### Variasi Konten
- Width bervariasi secara random untuk mensimulasikan konten asli
- Beberapa cell memiliki sub-content (text kecil di bawah)
- Timing animasi yang berbeda per row dan column

### Responsive Design
Semua skeleton responsive dan menyesuaikan dengan breakpoint yang sama dengan komponen asli.

## Best Practices

### 1. Konsistensi
- Gunakan skeleton yang sesuai dengan konten yang akan ditampilkan
- Pastikan skeleton memiliki struktur yang sama dengan konten asli

### 2. Performance
- Skeleton rendering sangat ringan dibanding loading spinner
- Tidak perlu state management tambahan

### 3. User Experience
- Skeleton memberikan gambaran bentuk konten yang akan muncul
- Mengurangi perceived loading time
- Memberikan feedback visual yang lebih informatif

## Komponen yang Sudah Terintegrasi

✅ **ReviewerTable** - Dengan ReviewerTableSkeleton  
✅ **ApproverTable** - Dengan ApproverTableSkeleton  
✅ **ReviewerSubmissionsManagement** - Menggunakan PageSkeleton  
✅ **ApproverSubmissionsManagement** - Menggunakan PageSkeleton  
✅ **ReviewerDashboard** - Table menggunakan loading prop  
✅ **ApproverDashboard** - Table menggunakan loading prop  

## Contoh Lengkap

```tsx
'use client';

import { useState, useEffect } from 'react';
import ReviewerTable from '@/components/reviewer/ReviewerTable';
import PageSkeleton from '@/components/ui/skeleton/PageSkeleton';

export default function MyPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result.data);
    } finally {
      setLoading(false);
    }
  };

  // Untuk loading awal (belum ada data)
  if (loading && data.length === 0) {
    return <PageSkeleton hasHeader hasFilters />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      
      {/* Table dengan skeleton loading */}
      <ReviewerTable
        data={data}
        loading={loading}  // ← Penting!
        onOpenDetail={handleViewDetail}
      />
    </div>
  );
}
```