# Design System & Component Library - SIMLOK

## Overview
Sistem design yang konsisten untuk semua halaman role di aplikasi SIMLOK. Terdiri dari komponen-komponen reusable yang memastikan tampilan dan user experience yang seragam.

## Core Components

### Layout Components

#### 1. PageHeader
Header halaman yang konsisten dengan dukungan aksi dan breadcrumb.

```tsx
<PageHeader
  title="Manajemen User"
  subtitle="Admin Panel"
  description="Kelola dan verifikasi user dalam sistem"
  primaryAction={{
    label: "Tambah User",
    onClick: handleAddUser,
    icon: <PlusIcon className="h-4 w-4" />
  }}
  secondaryActions={[
    {
      label: "Export",
      onClick: handleExport,
      variant: "outline"
    }
  ]}
/>
```

#### 2. PageContainer
Container utama halaman dengan spacing yang konsisten.

```tsx
<PageContainer maxWidth="full" padding="md">
  {/* Page content */}
</PageContainer>
```

#### 3. StatsGrid
Grid untuk menampilkan statistik dengan layout responsive.

```tsx
<StatsGrid 
  stats={[
    {
      id: "total-users",
      label: "Total User", 
      value: 120,
      icon: <UserIcon />,
      color: "blue",
      onClick: () => navigateToUsers()
    }
  ]}
  columns={3}
/>
```

### UI Components

#### 1. DataTable
Tabel data dengan fitur pencarian, sorting, dan pagination.

```tsx
<DataTable
  title="Daftar User"
  data={users}
  columns={[
    { key: "name", header: "Nama", accessor: "name" },
    { key: "email", header: "Email", accessor: "email" },
    { 
      key: "status", 
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />
    }
  ]}
  searchable={true}
  searchValue={search}
  onSearchChange={setSearch}
  pagination={{
    currentPage: 1,
    totalPages: 10,
    pageSize: 10,
    totalItems: 100,
    onPageChange: handlePageChange
  }}
  actions={[
    {
      label: "Tambah User",
      onClick: handleAdd,
      variant: "primary"
    }
  ]}
/>
```

#### 2. StatusBadge
Badge untuk menampilkan status dengan warna yang konsisten.

```tsx
<StatusBadge status="PENDING" />
<StatusBadge status="APPROVED" />
<StatusBadge status="REJECTED" />
```

#### 3. ActionButton
Tombol aksi standar dengan ikon dan variant.

```tsx
<ActionButton
  action="view"
  onClick={handleView}
  tooltip="Lihat detail"
/>

<ActionButtonGroup
  actions={[
    { action: "view", onClick: handleView },
    { action: "edit", onClick: handleEdit },
    { action: "delete", onClick: handleDelete }
  ]}
/>
```

### Templates

#### 1. DashboardTemplate
Template dashboard yang dapat dikustomisasi untuk semua role.

```tsx
<DashboardTemplate
  description="Kelola sistem dan monitor aktivitas"
  role="ADMIN"
  stats={statsData}
  tables={tablesConfig}
  tablesLayout="grid-2"
  customSections={[
    <CustomChart key="chart" />,
    <CustomWidget key="widget" />
  ]}
/>
```

#### 2. ListPageTemplate
Template untuk halaman list/tabel dengan filter dan pencarian.

```tsx
<ListPageTemplate
  title="Manajemen User"
  description="Kelola user dalam sistem"
  data={users}
  columns={userColumns}
  searchable={true}
  searchValue={search}
  onSearchChange={setSearch}
  filters={[
    { key: "all", label: "Semua", value: "" },
    { key: "active", label: "Aktif", value: "active" },
    { key: "inactive", label: "Tidak Aktif", value: "inactive" }
  ]}
  activeFilter={activeFilter}
  onFilterChange={setActiveFilter}
  primaryAction={{
    label: "Tambah User",
    onClick: handleAdd,
    icon: <PlusIcon />
  }}
/>
```

## Color Palette

### Primary Colors
- **Blue**: `#465fff` (brand-500)
- **Gray**: `#667085` (gray-500)
- **White**: `#ffffff`

### Status Colors
- **Success**: `#12b76a` (emerald-500)
- **Warning**: `#f79009` (amber-500) 
- **Error**: `#f04438` (red-500)
- **Info**: `#0ba5ec` (blue-light-500)

### Background Colors
- **Page Background**: `bg-gray-50`
- **Card Background**: `bg-white`
- **Border**: `border-gray-200`

## Typography Scale

### Headings
- **H1**: `text-2xl font-bold` (Page Title)
- **H2**: `text-xl font-semibold` (Section Title)  
- **H3**: `text-lg font-semibold` (Card Title)

### Body Text
- **Large**: `text-base` (16px)
- **Normal**: `text-sm` (14px)
- **Small**: `text-xs` (12px)

### Font Weights
- **Bold**: `font-bold` (700)
- **Semibold**: `font-semibold` (600)
- **Medium**: `font-medium` (500)
- **Normal**: `font-normal` (400)

## Spacing System

### Padding/Margin
- **xs**: `2` (8px)
- **sm**: `3` (12px) 
- **md**: `4` (16px)
- **lg**: `6` (24px)
- **xl**: `8` (32px)

### Gap
- **Component Gap**: `gap-4` (16px)
- **Section Gap**: `space-y-6` (24px)
- **Page Gap**: `space-y-8` (32px)

## Border & Shadow System

### Border Radius
- **Small**: `rounded-lg` (8px)
- **Medium**: `rounded-xl` (12px)
- **Large**: `rounded-2xl` (16px)

### Shadows
- **Card**: `shadow-sm` 
- **Modal**: `shadow-lg`
- **Dropdown**: `shadow-md`

## Usage Examples

### Admin Dashboard
```tsx
export default function AdminDashboard() {
  return (
    <DashboardTemplate
      role="ADMIN"
      description="Kelola sistem dan monitor aktivitas pengguna"
      stats={[
        {
          id: "total-vendors", 
          label: "Total Vendor",
          value: 45,
          icon: <UserGroupIcon />,
          color: "blue"
        }
      ]}
      tables={[
        {
          title: "Pengajuan Terbaru",
          data: submissions,
          columns: submissionColumns,
          loading: loading
        }
      ]}
    />
  );
}
```

### Users List Page
```tsx
export default function UsersPage() {
  return (
    <ListPageTemplate
      title="Manajemen User"
      data={users}
      columns={userColumns}
      searchable={true}
      primaryAction={{
        label: "Tambah User",
        onClick: () => setIsModalOpen(true)
      }}
      filters={statusFilters}
    />
  );
}
```

## Migration Guide

### Dari Komponen Lama ke Baru

1. **Ganti Card custom dengan Card standar**:
```tsx
// Sebelum
<div className="bg-white rounded-lg shadow p-6">
  
// Sesudah  
<Card className="p-6">
```

2. **Ganti table custom dengan DataTable**:
```tsx
// Sebelum
<table className="min-w-full">
  
// Sesudah
<DataTable data={data} columns={columns} />
```

3. **Ganti badge custom dengan StatusBadge**:
```tsx
// Sebelum
<span className="px-2 py-1 bg-green-100 text-green-800 rounded">
  
// Sesudah
<StatusBadge status="APPROVED" />
```

## Best Practices

1. **Consistency**: Selalu gunakan komponen dari design system
2. **Spacing**: Ikuti spacing system yang sudah ditentukan
3. **Colors**: Gunakan color palette yang konsisten
4. **Typography**: Ikuti hierarchy yang sudah ditetapkan
5. **Accessibility**: Pastikan kontras warna memenuhi standar
6. **Responsive**: Semua komponen sudah responsive by default