# Implementation Plan - Consistent UI Design System

## Overview
Rencana implementasi untuk menerapkan design system yang konsisten ke semua halaman role di aplikasi SIMLOK.

## Phase 1: Core Components ✅
- [x] **PageHeader** - Header halaman konsisten
- [x] **PageContainer** - Container wrapper
- [x] **StatsGrid** - Grid statistik  
- [x] **DataTable** - Tabel data dengan pagination
- [x] **StatusBadge** - Badge status konsisten
- [x] **ActionButton** - Tombol aksi standar
- [x] **LoadingState** - Loading state konsisten
- [x] **EmptyState** - Empty state konsisten
- [x] **SearchInput** - Input pencarian konsisten

## Phase 2: Templates ✅
- [x] **DashboardTemplate** - Template dashboard untuk semua role
- [x] **ListPageTemplate** - Template halaman list/tabel

## Phase 3: Dashboard Pages Refactoring

### Super Admin Dashboard
**File**: `/src/app/(dashboard)/super-admin/page.tsx`
**Status**: 🔄 In Progress

**Changes Needed**:
- Replace custom layout with `DashboardTemplate`
- Use `StatsGrid` for statistics
- Use `DataTable` for user list
- Apply consistent spacing and colors

**Before**:
```tsx
<div className="space-y-6">
  <div>...</div>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">...</div>
  <div className="bg-white shadow rounded-lg">
    <table>...</table>
  </div>
</div>
```

**After**:
```tsx
<DashboardTemplate
  role="SUPER_ADMIN"
  stats={statsData}
  tables={tablesConfig}
/>
```

### Admin Dashboard ✅
**File**: `/src/app/(dashboard)/admin/page.tsx`
**Status**: ✅ Completed

**Example Implementation**: 
- Created `AdminDashboardNew.tsx` using `DashboardTemplate`
- Consistent statistics display
- Consistent table layout
- Proper action buttons

### Vendor Dashboard ✅
**File**: `/src/app/(dashboard)/vendor/page.tsx`
**Status**: ✅ Completed

**Example Implementation**:
- Created `VendorDashboardNew.tsx` using `DashboardTemplate`
- Role-specific statistics
- Submission management table
- Consistent action buttons

### Reviewer Dashboard
**File**: `/src/app/(dashboard)/reviewer/page.tsx`
**Status**: ⏳ Pending

**Changes Needed**:
- Implement using `DashboardTemplate`
- Review-specific statistics
- Pending submissions table
- Action buttons for approve/reject

### Approver Dashboard
**File**: `/src/app/(dashboard)/approver/page.tsx`  
**Status**: ⏳ Pending

**Changes Needed**:
- Implement using `DashboardTemplate`
- Approval-specific statistics
- Submissions awaiting approval
- Bulk approval actions

### Verifier Dashboard
**File**: `/src/app/(dashboard)/verifier/page.tsx`
**Status**: ⏳ Pending

**Changes Needed**:
- Implement using `DashboardTemplate`
- Verification-specific statistics  
- Documents to verify table
- QR scanning integration

## Phase 4: List/Table Pages Refactoring

### Admin Users Management
**File**: `/src/app/(dashboard)/admin/users/page.tsx`
**Status**: ⏳ Pending

**Changes Needed**:
- Use `ListPageTemplate`
- Implement search and filters
- Consistent action buttons
- Bulk operations

### Admin Submissions Management
**File**: `/src/app/(dashboard)/admin/submissions/page.tsx`
**Status**: ⏳ Pending

**Changes Needed**:
- Use `ListPageTemplate`
- Status filters
- Export functionality
- Bulk status updates

### Vendor Submissions List
**File**: `/src/app/(dashboard)/vendor/submissions/page.tsx`
**Status**: ⏳ Pending

**Changes Needed**:
- Use `ListPageTemplate`
- Status-based filtering
- Create new submission action
- Edit/Delete actions for pending

### Reviewer Submissions List
**File**: `/src/app/(dashboard)/reviewer/submissions/page.tsx`
**Status**: ⏳ Pending

**Changes Needed**:
- Use `ListPageTemplate`
- Review status filters
- Bulk review actions
- Priority indicators

### Approver Submissions List
**File**: `/src/app/(dashboard)/approver/submissions/page.tsx`
**Status**: ⏳ Pending

**Changes Needed**:
- Use `ListPageTemplate`
- Approval workflow
- Bulk approve/reject
- Comments system

## Phase 5: Forms Refactoring

### Submission Forms
**Files**: 
- `/src/components/vendor/SubmissionForm.tsx`
- `/src/app/(dashboard)/vendor/submissions/create/page.tsx`

**Status**: ⏳ Pending

**Changes Needed**:
- Consistent form layout
- Standardized input components
- Error handling
- Loading states

### User Management Forms
**Files**:
- `/src/components/admin/UserModal.tsx`
- Various user edit forms

**Status**: ⏳ Pending

**Changes Needed**:
- Consistent modal layout
- Form validation display
- Action button standardization

## Phase 6: Detail Pages

### Submission Detail Pages
**Files**:
- `/src/app/(dashboard)/*/submissions/[id]/page.tsx`

**Status**: ⏳ Pending

**Changes Needed**:
- Consistent detail layout
- Action buttons per role
- Status flow visualization
- Document preview consistency

## Phase 7: Color Theme Implementation

### Global CSS Updates
**File**: `/src/app/globals.css`
**Status**: ✅ Partial

**Completed**:
- Added comprehensive color palette
- Typography scale
- Spacing system  
- Shadow system

**Remaining**:
- Dark mode support (optional)
- Custom component theming
- Animation utilities

### Component Theme Consistency
**Status**: ⏳ Pending

**Changes Needed**:
- Ensure all components use theme colors
- Remove hardcoded colors
- Implement hover states consistently
- Focus states accessibility

## Phase 8: Mobile Responsiveness

### Responsive Design Audit
**Status**: ⏳ Pending

**Areas to Check**:
- Table overflow on mobile
- Action button stacking  
- Statistics grid layout
- Modal responsiveness
- Navigation improvements

### Mobile-First Improvements
**Status**: ⏳ Pending

**Changes Needed**:
- Optimize table display for mobile
- Improve touch targets
- Streamline mobile workflows
- Consider mobile-specific components

## Implementation Priority

### High Priority (Week 1-2)
1. **Dashboard Pages**: Complete all role dashboards
2. **List Pages**: Admin and Vendor submission lists
3. **Color Consistency**: Remove all hardcoded colors

### Medium Priority (Week 3-4)  
1. **Forms**: Standardize all form layouts
2. **Detail Pages**: Consistent detail page layouts
3. **Mobile**: Basic responsiveness fixes

### Low Priority (Week 5+)
1. **Advanced Features**: Bulk operations, advanced filtering
2. **Performance**: Component optimization
3. **Accessibility**: WCAG compliance improvements

## Testing Strategy

### Component Testing
- [ ] Test all new components in isolation
- [ ] Verify responsive behavior
- [ ] Check accessibility standards
- [ ] Cross-browser compatibility

### Integration Testing  
- [ ] Test role-specific flows
- [ ] Verify data consistency
- [ ] Check real-time updates
- [ ] Performance impact assessment

### User Acceptance Testing
- [ ] Role-based testing scenarios
- [ ] Mobile device testing
- [ ] Workflow efficiency evaluation
- [ ] Visual consistency review

## Migration Strategy

### Gradual Migration Approach
1. **Create new components** alongside existing ones
2. **Test thoroughly** in isolation
3. **Replace incrementally** page by page
4. **Maintain backward compatibility** during transition
5. **Monitor performance** throughout migration

### Rollback Plan
- Keep original components available
- Use feature flags for new components  
- Database backup before major changes
- Staged deployment with monitoring

## Success Metrics

### Visual Consistency
- [ ] All pages use standardized components
- [ ] Consistent color usage across application
- [ ] Typography hierarchy properly implemented
- [ ] Spacing system applied uniformly

### Developer Experience
- [ ] Reduced code duplication
- [ ] Faster development of new features
- [ ] Easier maintenance and updates
- [ ] Clear component documentation

### User Experience  
- [ ] Improved task completion time
- [ ] Reduced user confusion
- [ ] Better mobile experience
- [ ] Increased user satisfaction scores

## Documentation

### Component Documentation
- [ ] Storybook setup for components
- [ ] Usage examples for each component
- [ ] Props documentation
- [ ] Best practices guide

### Migration Guide
- [ ] Step-by-step migration instructions
- [ ] Before/after code examples  
- [ ] Common gotchas and solutions
- [ ] Performance considerations

---

## Next Steps
1. Start with Super Admin Dashboard refactoring
2. Create comprehensive component tests
3. Document component usage patterns
4. Begin gradual migration of other pages
5. Monitor user feedback throughout process