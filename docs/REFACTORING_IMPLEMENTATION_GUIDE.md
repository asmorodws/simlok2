# 🎯 IMPLEMENTATION GUIDE - Refactoring dengan Generic Components

**Target:** Mengurangi ~70% kode duplikat di project  
**Status:** ✅ Generic Components Siap Digunakan

---

## 📦 KOMPONEN YANG SUDAH TERSEDIA

### 1. **DashboardPageTemplate** 
📁 `src/components/templates/DashboardPageTemplate.tsx`

**Import:**
```tsx
import DashboardPageTemplate from '@/components/templates/DashboardPageTemplate';
// atau
import { DashboardPageTemplate } from '@/components';
```

**Usage:**
```tsx
export default function MyPage() {
  return (
    <DashboardPageTemplate
      allowedRoles={['VENDOR', 'SUPER_ADMIN']}
      sidebarTitle="Dashboard Vendor"
      titlePage="Vendor"
    >
      <YourContent />
    </DashboardPageTemplate>
  );
}
```

**Menggantikan:**
- `RoleGate` + `SidebarLayout` wrapper
- `DashboardPageHelpers.vendor()` dan sejenisnya

---

### 2. **UserManagementPageTemplate**
📁 `src/components/templates/UserManagementPageTemplate.tsx`

**Import:**
```tsx
import UserManagementPageTemplate from '@/components/templates/UserManagementPageTemplate';
// atau
import { UserManagementPageTemplate } from '@/components';
```

**Usage:**
```tsx
<UserManagementPageTemplate
  title="Verifikasi User"
  description="Kelola dan verifikasi user vendor dalam sistem"
  headerActions={<Button>Tambah User</Button>} // optional
>
  <UserVerificationManagement />
</UserManagementPageTemplate>
```

**Menggantikan:**
- Card wrapper + header section berulang
- Styling yang sama di admin & reviewer pages

---

### 3. **GenericDataTable**
📁 `src/components/organisms/tables/GenericDataTable.tsx`

**Import:**
```tsx
import GenericDataTable from '@/components/organisms/tables/GenericDataTable';
// atau
import { GenericDataTable } from '@/components';
```

**Usage:**
```tsx
<GenericDataTable
  data={users}
  columns={[
    {
      key: 'name',
      label: 'Nama',
      sortable: true,
      render: (user) => <strong>{user.name}</strong>
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (user) => <ActionButtons user={user} />
    }
  ]}
  loading={loading}
  error={error}
  sortField={sortField}
  sortOrder={sortOrder}
  onSortChange={handleSort}
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Cari user..."
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalUsersCount}
  onPageChange={setCurrentPage}
  getRowKey={(user) => user.id}
  showSearch={true}
  showPagination={true}
/>
```

**Features:**
- ✅ Built-in sorting (dengan icon indikator)
- ✅ Built-in pagination
- ✅ Built-in search bar
- ✅ Loading skeleton
- ✅ Error handling
- ✅ Empty state
- ✅ Fully type-safe dengan generics
- ✅ Custom column rendering

**Menggantikan:**
- 200+ lines table markup
- Pagination UI
- Sorting icons & handlers
- Search bar

---

### 4. **GenericFilterBar**
📁 `src/components/molecules/GenericFilterBar.tsx`

**Import:**
```tsx
import GenericFilterBar from '@/components/molecules/GenericFilterBar';
// atau
import { GenericFilterBar } from '@/components';
```

**Usage:**
```tsx
<GenericFilterBar
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Cari user..."
  statusOptions={[
    { value: 'all', label: 'Semua', count: 100 },
    { value: 'pending', label: 'Pending', count: 5 },
    { value: 'verified', label: 'Terverifikasi', count: 80 }
  ]}
  statusFilter={statusFilter}
  onStatusChange={setStatusFilter}
  roleOptions={[
    { value: 'all', label: 'Semua Role' },
    { value: 'VENDOR', label: 'Vendor' }
  ]}
  roleFilter={roleFilter}
  onRoleChange={setRoleFilter}
  showSearch={true}
  showStatusFilter={true}
  showRoleFilter={false}
/>
```

**Menggantikan:**
- Search input + icon
- Status dropdown
- Role dropdown
- Responsive flex layout

---

### 5. **GenericStatsCard**
📁 `src/components/organisms/cards/GenericStatsCard.tsx`

**Import:**
```tsx
import GenericStatsCard from '@/components/organisms/cards/GenericStatsCard';
// atau
import { GenericStatsCard } from '@/components';
```

**Usage:**
```tsx
<GenericStatsCard
  title="Total Users"
  value={stats.totalUsers}
  icon={<UserIcon className="w-6 h-6" />}
  description="Active users"
  bgColor="bg-blue-50"
  iconBgColor="bg-blue-500"
  iconColor="text-white"
  valueColor="text-gray-900"
  onClick={() => setFilter('all')} // optional, makes it clickable
  trend={{ value: '+12%', isPositive: true }} // optional
  badge={<Badge>New</Badge>} // optional
/>
```

**Menggantikan:**
- Custom stat card markup
- Icon + value + label pattern
- Click handlers untuk filtering

---

### 6. **useUserManagement Hook**
📁 `src/hooks/useUserManagement.ts`

**Import:**
```tsx
import { useUserManagement } from '@/hooks/useUserManagement';
// atau
import { useUserManagement } from '@/hooks';
```

**Usage:**
```tsx
const {
  // Data
  users,
  stats,
  loading,
  error,
  
  // Pagination
  currentPage,
  totalPages,
  totalUsersCount,
  setCurrentPage,
  
  // Search & Filter
  searchTerm,
  setSearchTerm,
  debouncedSearchTerm,
  statusFilter,
  setStatusFilter,
  
  // Sorting
  sortField,
  sortOrder,
  handleSort,
  
  // Actions
  fetchUsers,
  refetchUsers,
  
  // Session
  session,
  isSuperAdmin,
  currentUserId,
} = useUserManagement({ 
  limit: 10,
  refreshTrigger: 0 
});
```

**Menggantikan:**
- 150+ lines state management
- Fetch logic dengan URLSearchParams
- Debounce implementation
- Pagination handlers
- Sorting handlers
- Session management

---

### 7. **useSubmissionManagement Hook**
📁 `src/hooks/useSubmissionManagement.ts`

**Import:**
```tsx
import { useSubmissionManagement } from '@/hooks/useSubmissionManagement';
// atau
import { useSubmissionManagement } from '@/hooks';
```

**Usage:**
```tsx
const {
  submissions,
  stats,
  loading,
  error,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  handleSort,
  currentPage,
  setCurrentPage,
  totalPages,
  totalCount,
  refetchSubmissions,
} = useSubmissionManagement({ 
  role: 'APPROVER',
  limit: 10 
});
```

---

## 🔄 MIGRATION STEPS

### Step 1: Update Dashboard Pages (20+ files)

**Target Files:**
- `src/app/(dashboard)/vendor/page.tsx`
- `src/app/(dashboard)/approver/page.tsx`
- `src/app/(dashboard)/reviewer/page.tsx`
- `src/app/(dashboard)/verifier/page.tsx`
- `src/app/(dashboard)/*/submissions/page.tsx`
- dll.

**Before:**
```tsx
export default function VendorPage() {
  return DashboardPageHelpers.vendor(<RoleDashboard role="VENDOR" />);
}
```

**After:**
```tsx
export default function VendorPage() {
  return (
    <DashboardPageTemplate
      allowedRoles={['VENDOR']}
      sidebarTitle="Dashboard Vendor"
      titlePage="Vendor"
    >
      <RoleDashboard role="VENDOR" />
    </DashboardPageTemplate>
  );
}
```

**Estimasi Waktu:** 2-3 jam (bulk replace dengan careful review)

---

### Step 2: Refactor User Management Components

**Target Files:**
- `src/components/features/user/management/AdminUserVerificationManagement.tsx`
- `src/components/features/user/management/ReviewerUserVerificationManagement.tsx`

**Migration Checklist:**
1. ✅ Replace state dengan `useUserManagement` hook
2. ✅ Replace table markup dengan `<GenericDataTable>`
3. ✅ Replace filter UI dengan `<GenericFilterBar>`
4. ✅ Replace stats cards dengan `<GenericStatsCard>`
5. ✅ Keep modal handlers unchanged

**Expected Reduction:**
- AdminUserVerificationManagement: 753 lines → ~280 lines (63%)
- ReviewerUserVerificationManagement: 439 lines → ~150 lines (65%)

**Estimasi Waktu:** 3-4 jam

---

### Step 3: Update User Management Pages

**Target Files:**
- `src/app/(dashboard)/dashboard/users/page.tsx`
- `src/app/(dashboard)/reviewer/users/page.tsx`

**Before:** 56 lines dengan banyak wrapper markup

**After:** 35 lines dengan templates

**Estimasi Waktu:** 30 menit

---

### Step 4: Migrate Other Tables

**Target Tables:**
- SubmissionTable
- ScanHistoryTable
- Custom tables di super-admin/page.tsx

**Pattern:**
```tsx
// Replace custom table dengan:
<GenericDataTable
  data={data}
  columns={columnConfig}
  // ... rest of props
/>
```

**Estimasi Waktu:** 2-3 jam

---

### Step 5: Replace Stats Cards

**Target Files:**
- super-admin/page.tsx
- dashboard pages dengan stats
- Various feature components

**Pattern:**
```tsx
// Replace custom card markup dengan:
<GenericStatsCard
  title="..."
  value={value}
  icon={<Icon />}
  // ... styling props
/>
```

**Estimasi Waktu:** 1-2 jam

---

## ✅ TESTING CHECKLIST

Setelah setiap migration step:

- [ ] Type check passes: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Manual testing di browser
- [ ] UI tetap sama (no visual changes)
- [ ] Functionality unchanged
- [ ] No console errors

---

## 📊 EXPECTED RESULTS

### Code Reduction
| Area | Before | After | Reduction |
|------|--------|-------|-----------|
| **User Management** | 1,192 lines | ~430 lines | **64%** |
| **Dashboard Pages** | ~1,500 lines | ~400 lines | **73%** |
| **Tables** | ~2,000 lines | ~600 lines | **70%** |
| **Stats Cards** | ~500 lines | ~100 lines | **80%** |
| **TOTAL** | **~5,200 lines** | **~1,530 lines** | **~71%**|

### Benefits
- ✅ **Maintainability** ↑↑↑
- ✅ **Consistency** ↑↑↑
- ✅ **Developer Experience** ↑↑
- ✅ **Code Quality** ↑↑
- ✅ **Bundle Size** ↓

---

## 🎯 PRIORITY RECOMMENDATIONS

### High Priority (Do First)
1. ✅ User Management Components (biggest impact)
2. ✅ Dashboard Pages (most files affected)

### Medium Priority (Do Next)
3. ✅ Table Replacements
4. ✅ Stats Card Replacements

### Low Priority (Nice to Have)
5. ⬜ Form Logic consolidation
6. ⬜ Modal pattern consolidation

---

## 🚀 GETTING STARTED

**Recommended Approach:**
1. Start dengan 1 file sebagai proof-of-concept
2. Test thoroughly
3. If success, migrate similar files in batch
4. Commit after each successful migration

**Suggested First File:**
`src/app/(dashboard)/reviewer/users/page.tsx`
- Kecil (56 lines)
- Clear benefit
- Easy to rollback

---

**Status:** 🟢 Siap untuk implementasi  
**Risk Level:** 🟡 Low (backward compatible)  
**Effort:** 🔵 2-3 hari untuk complete migration  
**Impact:** 🟢 High (~71% code reduction)
