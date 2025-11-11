# Error Handling & Empty State Components

Dokumentasi lengkap untuk komponen-komponen error handling dan empty state di aplikasi SIMLOK.

---

## 📑 Daftar Isi

1. [Error Pages (Next.js)](#error-pages-nextjs)
2. [ErrorState Component](#errorstate-component)
3. [EmptyState Component](#emptystate-component)
4. [Best Practices](#best-practices)

---

## Error Pages (Next.js)

Next.js 13+ App Router menyediakan file konvensi khusus untuk error handling:

### 1. `not-found.tsx` - 404 Pages

#### Root Level: `/app/not-found.tsx`
Halaman 404 untuk seluruh aplikasi.

**Kapan digunakan:**
- User mengakses route yang tidak ada
- Manual trigger dengan `notFound()` dari `next/navigation`

**Contoh trigger:**
```typescript
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: { id: string } }) {
  const data = await fetchData(params.id);
  
  if (!data) {
    notFound(); // Trigger 404 page
  }
  
  return <div>{data.name}</div>;
}
```

#### Dashboard: `/app/(dashboard)/not-found.tsx`
404 khusus untuk dashboard routes dengan link ke dashboard pages.

#### Auth: `/app/(auth)/not-found.tsx`
404 khusus untuk auth routes dengan link ke login/signup.

### 2. `error.tsx` - Error Boundary

#### Root Level: `/app/error.tsx`
Error boundary untuk menangkap runtime errors di root level.

**Kapan digunakan:**
- Runtime error terjadi di component
- API call gagal
- Data fetching error
- Client-side JavaScript error

**Props:**
```typescript
{
  error: Error & { digest?: string };
  reset: () => void; // Function to retry
}
```

**Example usage dalam component:**
```typescript
'use client';

export default function MyComponent() {
  const [data, setData] = useState(null);
  
  // Error akan tertangkap oleh error.tsx terdekat
  if (errorCondition) {
    throw new Error('Something went wrong');
  }
  
  return <div>{data}</div>;
}
```

### 3. `global-error.tsx` - Global Error Handler

Menangkap error di root layout level (sangat jarang terpicu).

**Catatan:** File ini harus include `<html>` dan `<body>` tags.

---

## ErrorState Component

Komponen reusable untuk menampilkan error state di dalam aplikasi.

### Location
```typescript
import ErrorState from '@/components/ui/ErrorState';
```

### Variants

#### 1. Default Variant - Centered Card
```tsx
<ErrorState
  title="Gagal Memuat Data"
  message="Tidak dapat mengambil data dari server."
  error={error}
  onRetry={() => refetch()}
  onGoHome={() => router.push('/')}
/>
```

#### 2. Fullscreen Variant
```tsx
<ErrorState
  variant="fullscreen"
  title="Error Memuat Dashboard"
  message="Terjadi kesalahan saat memuat dashboard."
  error={error}
  onRetry={handleRetry}
/>
```

#### 3. Inline Variant - For Cards/Sections
```tsx
<div className="bg-white rounded-lg p-6">
  <ErrorState
    variant="inline"
    title="Data Tidak Tersedia"
    message="Gagal memuat statistik."
    onRetry={refetchStats}
    onClose={() => setShowError(false)}
  />
</div>
```

#### 4. Compact Variant - For Tables/Lists
```tsx
<ErrorState
  variant="compact"
  title="Gagal memuat tabel"
  message="Silakan coba lagi."
  onRetry={refetch}
/>
```

### Props

```typescript
interface ErrorStateProps {
  title?: string;                    // Error title
  message?: string;                  // Error message
  error?: Error | string;            // Error object or string
  onRetry?: () => void;             // Retry handler
  onGoHome?: () => void;            // Go home handler
  onClose?: () => void;             // Close handler (inline only)
  variant?: 'default' | 'inline' | 'compact' | 'fullscreen';
  showErrorDetails?: boolean;        // Show error details (dev only by default)
  retryLabel?: string;              // Custom retry button label
  homeLabel?: string;               // Custom home button label
  className?: string;               // Additional CSS classes
  children?: ReactNode;             // Custom content
}
```

### Usage Examples

#### 1. In Data Fetching
```tsx
'use client';

export default function Dashboard() {
  const { data, error, refetch } = useQuery('dashboard', fetchDashboard);
  
  if (error) {
    return (
      <ErrorState
        variant="fullscreen"
        error={error}
        onRetry={refetch}
      />
    );
  }
  
  return <div>{/* Dashboard content */}</div>;
}
```

#### 2. In Table Component
```tsx
export function DataTable({ data, error, onRetry }: Props) {
  if (error) {
    return (
      <ErrorState
        variant="inline"
        title="Gagal memuat data"
        onRetry={onRetry}
      />
    );
  }
  
  return <table>{/* Table content */}</table>;
}
```

#### 3. With Custom Content
```tsx
<ErrorState
  title="Connection Lost"
  message="Unable to connect to server"
  onRetry={handleRetry}
>
  <div className="text-sm text-gray-600 mb-4">
    <p>Possible reasons:</p>
    <ul className="list-disc list-inside mt-2">
      <li>Internet connection issue</li>
      <li>Server maintenance</li>
      <li>Firewall blocking connection</li>
    </ul>
  </div>
</ErrorState>
```

---

## EmptyState Component

Komponen reusable untuk menampilkan empty state (tidak ada data).

### Location
```typescript
import EmptyState from '@/components/ui/EmptyState';
```

### Variants

#### 1. Default Variant - Full Featured
```tsx
<EmptyState
  icon="document"
  title="Belum Ada Pengajuan"
  description="Anda belum membuat pengajuan SIMLOK."
  actionLabel="Buat Pengajuan"
  actionHref="/vendor/submissions/create"
/>
```

#### 2. Compact Variant
```tsx
<EmptyState
  variant="compact"
  icon="search"
  title="Tidak ada hasil"
  description="Coba gunakan kata kunci lain."
  actionLabel="Reset Filter"
  onAction={handleResetFilter}
/>
```

#### 3. Minimal Variant
```tsx
<EmptyState
  variant="minimal"
  icon="inbox"
  title="Tidak ada notifikasi"
/>
```

### Available Icons

- `'folder'` - FolderOpenIcon
- `'search'` - MagnifyingGlassIcon
- `'inbox'` - InboxIcon
- `'document'` - DocumentTextIcon
- `'users'` - UserGroupIcon
- `'custom'` - Use customIcon prop

### Props

```typescript
interface EmptyStateProps {
  icon?: 'folder' | 'search' | 'inbox' | 'document' | 'users' | 'custom';
  customIcon?: ReactNode;           // Custom icon component
  title?: string;                   // Main title
  description?: string;             // Description text
  actionLabel?: string;             // Primary action button label
  actionHref?: string;              // Primary action link
  onAction?: () => void;           // Primary action handler
  secondaryActionLabel?: string;    // Secondary action button label
  secondaryActionHref?: string;     // Secondary action link
  onSecondaryAction?: () => void;  // Secondary action handler
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;              // Additional CSS classes
  children?: ReactNode;            // Custom content
}
```

### Usage Examples

#### 1. Empty Table
```tsx
export function SubmissionsTable({ submissions }: Props) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        icon="document"
        title="Belum Ada Pengajuan"
        description="Mulai dengan membuat pengajuan SIMLOK pertama Anda."
        actionLabel="Buat Pengajuan Baru"
        actionHref="/vendor/submissions/create"
        secondaryActionLabel="Pelajari Panduan"
        secondaryActionHref="/help/submissions"
      />
    );
  }
  
  return <table>{/* Table content */}</table>;
}
```

#### 2. Search Results
```tsx
export function SearchResults({ query, results }: Props) {
  if (results.length === 0) {
    return (
      <EmptyState
        variant="compact"
        icon="search"
        title={`Tidak ada hasil untuk "${query}"`}
        description="Coba kata kunci lain atau periksa ejaan."
        actionLabel="Reset Pencarian"
        onAction={handleResetSearch}
      />
    );
  }
  
  return <div>{/* Results */}</div>;
}
```

#### 3. With Custom Icon
```tsx
<EmptyState
  icon="custom"
  customIcon={
    <QrCodeIcon className="h-12 w-12 text-gray-400" />
  }
  title="Belum Ada Scan QR"
  description="Mulai scan QR Code SIMLOK untuk verifikasi."
  actionLabel="Mulai Scan"
  onAction={handleOpenScanner}
/>
```

#### 4. Notification Center
```tsx
export function NotificationCenter({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        variant="minimal"
        icon="inbox"
        title="Tidak ada notifikasi"
      />
    );
  }
  
  return <div>{/* Notifications */}</div>;
}
```

---

## Best Practices

### 1. Error Handling Strategy

**Use Next.js Error Pages for:**
- Route-level errors (404, 500)
- Layout errors
- Entire page failures

**Use ErrorState Component for:**
- Data fetching errors
- API call failures
- Component-specific errors
- Partial page failures

### 2. Error Messages

**Do:**
- ✅ Be clear and specific
- ✅ Provide actionable solutions
- ✅ Use friendly language
- ✅ Show retry option

**Don't:**
- ❌ Show technical jargon to users
- ❌ Blame the user
- ❌ Leave users stuck with no action
- ❌ Show raw stack traces in production

### 3. Empty State Guidelines

**Do:**
- ✅ Explain why it's empty
- ✅ Provide clear call-to-action
- ✅ Use appropriate icons
- ✅ Keep messaging positive

**Don't:**
- ❌ Just show "No data"
- ❌ Leave users confused
- ❌ Use negative language

### 4. Example Implementation Pattern

```tsx
'use client';

export default function MyPage() {
  const [data, setData] = useState<Data[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getData();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  // Loading state
  if (loading) {
    return <Skeleton />;
  }
  
  // Error state
  if (error) {
    return (
      <ErrorState
        variant="fullscreen"
        error={error}
        onRetry={fetchData}
      />
    );
  }
  
  // Empty state
  if (data.length === 0) {
    return (
      <EmptyState
        icon="document"
        title="Belum Ada Data"
        description="Mulai dengan menambahkan data pertama Anda."
        actionLabel="Tambah Data"
        onAction={() => router.push('/create')}
      />
    );
  }
  
  // Success state
  return <div>{/* Render data */}</div>;
}
```

---

## Testing Error Pages

### Test 404 Page
```bash
# Navigate to non-existent route
http://localhost:3000/non-existent-page
```

### Test Error Boundary
```tsx
// Create a test component that throws error
'use client';

export function ErrorTest() {
  const [throwError, setThrowError] = useState(false);
  
  if (throwError) {
    throw new Error('Test error');
  }
  
  return (
    <button onClick={() => setThrowError(true)}>
      Trigger Error
    </button>
  );
}
```

---

## Summary

✅ **Created:**
- Root `not-found.tsx` - Global 404 page
- Root `error.tsx` - Root error boundary
- Dashboard `not-found.tsx` - Dashboard 404
- Auth `not-found.tsx` - Auth 404
- `ErrorState` component - Reusable error UI
- `EmptyState` component - Reusable empty state UI

✅ **Features:**
- Multiple variants for different use cases
- Consistent design across the app
- TypeScript fully typed
- Responsive and accessible
- Development mode error details
- Customizable actions and content

✅ **Next.js Conventions:**
- Follows App Router conventions
- Proper error boundaries
- Server/Client component separation
- SEO-friendly metadata
