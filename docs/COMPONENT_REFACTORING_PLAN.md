# Component Architecture Refactoring Plan

## 🎯 Tujuan
Membuat ulang struktur component menggunakan Atomic Design Pattern tanpa mengubah tampilan UI.

## 📊 Analisis Struktur Saat Ini

### Masalah yang Ditemukan:
1. **Duplikasi folder role-based** (`admin/`, `approver/`, `reviewer/`, etc) dengan `features/`
2. **Inkonsistensi lokasi** - `form/` terpisah dari `ui/`
3. **Tidak ada hierarchy pattern** yang jelas
4. **Mixed responsibilities** - beberapa component terlalu besar

## 🏗️ Struktur Baru (Atomic Design)

```
src/components/
├── atoms/                          # Basic building blocks
│   ├── Button/
│   ├── Input/
│   ├── Label/
│   ├── TextArea/
│   ├── Checkbox/
│   ├── Badge/
│   ├── Icon/
│   └── Spinner/
│
├── molecules/                      # Simple component combinations
│   ├── FormField/                 # Label + Input + Error
│   ├── SearchBar/
│   ├── DatePicker/
│   ├── PhoneInput/
│   ├── FileUploadCard/
│   ├── StatusBadge/
│   ├── ActionButton/
│   └── NotificationItem/
│
├── organisms/                      # Complex UI components
│   ├── forms/
│   │   ├── SubmissionForm/
│   │   ├── LoginForm/
│   │   ├── SignUpForm/
│   │   └── UserForm/
│   ├── tables/
│   │   ├── SubmissionTable/
│   │   ├── UserTable/
│   │   └── ScanHistoryTable/
│   ├── modals/
│   │   ├── SubmissionDetailModal/
│   │   ├── UserVerificationModal/
│   │   ├── PDFPreviewModal/
│   │   └── ConfirmModal/
│   ├── navigation/
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   └── TabNavigation/
│   └── cards/
│       ├── StatCard/
│       ├── SubmissionCard/
│       ├── UserProfileCard/
│       └── NotificationCard/
│
├── templates/                      # Page-level layouts
│   ├── DashboardLayout/
│   ├── AuthLayout/
│   ├── SubmissionLayout/
│   └── ScannerLayout/
│
├── features/                       # Feature-specific compositions
│   ├── auth/
│   │   ├── LoginPage/
│   │   └── SignUpPage/
│   ├── submissions/
│   │   ├── SubmissionList/
│   │   ├── SubmissionCreate/
│   │   └── SubmissionDetail/
│   ├── users/
│   │   ├── UserList/
│   │   └── UserManagement/
│   ├── scanner/
│   │   ├── QRScanner/
│   │   └── ScanHistory/
│   ├── notifications/
│   │   ├── NotificationBell/
│   │   └── NotificationPanel/
│   └── dashboard/
│       ├── RoleDashboard/
│       └── StatsDashboard/
│
└── shared/                         # Shared utilities & HOCs
    ├── RoleGate/
    ├── ErrorBoundary/
    ├── LoadingBoundary/
    └── ProtectedRoute/
```

## 🔄 Migration Strategy

### Phase 1: Setup New Structure (No Breaking Changes)
1. Create new folder structure
2. Keep old structure intact
3. Create index.ts barrel exports

### Phase 2: Create Atoms
1. Move basic UI components to `atoms/`
2. Ensure consistent API
3. Add proper TypeScript types

### Phase 3: Build Molecules
1. Combine atoms into molecules
2. Extract reusable patterns
3. Reduce duplication

### Phase 4: Restructure Organisms
1. Refactor complex components
2. Better separation of concerns
3. Extract business logic to hooks

### Phase 5: Update Features
1. Compose using new components
2. Maintain UI consistency
3. Update imports

### Phase 6: Cleanup
1. Remove old structure
2. Update all imports
3. Run full test suite

## 📋 Component Mapping

### Atoms (Basic Elements)
```
OLD → NEW
-------------------------------------------
ui/button/Button.tsx → atoms/Button/
ui/badge/Badge.tsx → atoms/Badge/
form/Input.tsx → atoms/Input/
form/Label.tsx → atoms/Label/
form/TextArea.tsx → atoms/TextArea/
form/Checkbox.tsx → atoms/Checkbox/
ui/loading/LoadingSpinner.tsx → atoms/Spinner/
```

### Molecules (Combinations)
```
OLD → NEW
-------------------------------------------
form/DatePicker.tsx → molecules/DatePicker/
form/PhoneInput.tsx → molecules/PhoneInput/
ui/badge/StatusBadge.tsx → molecules/StatusBadge/
ui/table/TableActionButton.tsx → molecules/ActionButton/
```

### Organisms (Complex Components)
```
OLD → NEW
-------------------------------------------
features/submission/form/UnifiedSubmissionForm.tsx 
  → organisms/forms/SubmissionForm/

features/user/table/UserTable.tsx 
  → organisms/tables/UserTable/

features/submission/modal/ApproverSubmissionDetailModal.tsx
  → organisms/modals/SubmissionDetailModal/ApproverView.tsx

layout/SidebarLayout.tsx 
  → organisms/navigation/Sidebar/
```

### Features (Page Compositions)
```
OLD → NEW
-------------------------------------------
features/submission/management/RoleSubmissionsManagement.tsx
  → features/submissions/SubmissionList/

features/auth/SignInForm.tsx
  → features/auth/LoginPage/

features/dashboard/RoleDashboard.tsx
  → features/dashboard/RoleDashboard/
```

## ✅ Benefits

1. **Better Organization** - Clear hierarchy and purpose
2. **Reusability** - Atoms and molecules can be reused anywhere
3. **Maintainability** - Easy to find and update components
4. **Scalability** - Easy to add new features
5. **Testing** - Easier to test isolated components
6. **Documentation** - Clear component responsibilities

## 🚨 Important Rules

1. **NO UI CHANGES** - Maintain exact same appearance
2. **Keep Props Interface** - Don't break existing usage
3. **Maintain Functionality** - All features must work
4. **Backward Compatibility** - Support old imports temporarily
5. **Test After Each Phase** - Ensure nothing breaks

## 📝 Next Steps

1. ✅ Review and approve this plan
2. Create atoms structure
3. Migrate basic components
4. Build molecules
5. Refactor organisms
6. Update features
7. Cleanup old structure
8. Full testing
9. Documentation update

---

**Status**: 📋 Planning Phase  
**Estimated Time**: 4-6 hours  
**Risk Level**: Medium (requires careful testing)
