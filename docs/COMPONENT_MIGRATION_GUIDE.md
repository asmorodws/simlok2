# Component Migration Guide

## 🎯 Overview

Struktur component telah di-refactor menggunakan **Atomic Design Pattern** untuk better organization, reusability, dan maintainability.

**PENTING**: UI/tampilan TIDAK berubah sama sekali. Hanya struktur internal dan import paths yang berbeda.

## 📊 New Structure

```
src/components/
├── atoms/           → Button, Input, Label, Badge (basic elements)
├── molecules/       → FormField, DatePicker, StatusBadge (combinations)
├── organisms/       → Forms, Tables, Modals (complex components)
├── features-v2/     → Complete features (business logic)
├── shared/          → Utilities, HOCs, guards
└── legacy/          → Old structure (will be removed)
```

## 🔄 Migration Examples

### Example 1: Basic Components (Atoms)

**Before:**
```typescript
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/Input';
import { Badge } from '@/components/ui/badge/Badge';
```

**After (Option 1 - Recommended):**
```typescript
import { Button, Input, Badge } from '@/components/atoms';
```

**After (Option 2 - Specific import):**
```typescript
import { Button } from '@/components/atoms';
import { Input } from '@/components/atoms';
import { Badge } from '@/components/atoms';
```

### Example 2: Form Components (Molecules)

**Before:**
```typescript
import DatePicker from '@/components/form/DatePicker';
import PhoneInput from '@/components/form/PhoneInput';
import StatusBadge from '@/components/ui/badge/StatusBadge';
```

**After:**
```typescript
import { DatePicker, PhoneInput, StatusBadge } from '@/components/molecules';
```

### Example 3: Complex Components (Organisms)

**Before:**
```typescript
import UserTable from '@/components/features/user/table/UserTable';
import Modal from '@/components/ui/modal/Modal';
import SidebarLayout from '@/components/layout/SidebarLayout';
```

**After:**
```typescript
import { UserTable, Modal, SidebarLayout } from '@/components/organisms';
```

### Example 4: Feature Components

**Before:**
```typescript
import RoleSubmissionsManagement from '@/components/features/submission/management/RoleSubmissionsManagement';
import QRScanner from '@/components/features/scan/QRScanner';
import NotificationsBell from '@/components/features/notification/NotificationsBell';
```

**After:**
```typescript
import { 
  RoleSubmissionsManagement, 
  QRScanner, 
  NotificationsBell 
} from '@/components/features-v2';
```

### Example 5: Shared Components

**Before:**
```typescript
import RoleGate from '@/components/shared/security/RoleGate';
import ErrorBoundary from '@/components/ui/error/ErrorBoundary';
```

**After:**
```typescript
import { RoleGate, ErrorBoundary } from '@/components/shared';
```

## 📝 Complete Import Mapping

### Atoms
| Old Import | New Import |
|------------|------------|
| `@/components/ui/button/Button` | `@/components/atoms` |
| `@/components/form/Input` | `@/components/atoms` |
| `@/components/form/Label` | `@/components/atoms` |
| `@/components/form/TextArea` | `@/components/atoms` |
| `@/components/form/Checkbox` | `@/components/atoms` |
| `@/components/ui/badge/Badge` | `@/components/atoms` |
| `@/components/ui/loading/LoadingSpinner` | `@/components/atoms` |

### Molecules
| Old Import | New Import |
|------------|------------|
| `@/components/form/DatePicker` | `@/components/molecules` |
| `@/components/form/PhoneInput` | `@/components/molecules` |
| `@/components/form/TimePicker` | `@/components/molecules` |
| `@/components/ui/badge/StatusBadge` | `@/components/molecules` |
| `@/components/ui/table/TableActionButton` | `@/components/molecules` |

### Organisms
| Old Import | New Import |
|------------|------------|
| `@/components/features/submission/form/UnifiedSubmissionForm` | `@/components/organisms` |
| `@/components/features/user/table/UserTable` | `@/components/organisms` |
| `@/components/layout/SidebarLayout` | `@/components/organisms` |
| `@/components/ui/modal/Modal` | `@/components/organisms` |
| `@/components/ui/card/StatCard` | `@/components/organisms` |

## 🛠️ Migration Steps

### Step 1: Update Imports in Your Files

Use find and replace in your IDE:

**VS Code:**
1. Press `Ctrl+Shift+H` (or `Cmd+Shift+H` on Mac)
2. Enable regex mode
3. Find: `from ['"]@/components/ui/button/Button['"]`
4. Replace: `from '@/components/atoms'`

**Or use sed command:**
```bash
# Example: Update Button imports
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/components/ui/button/Button'|from '@/components/atoms'|g"
```

### Step 2: Verify No Breaking Changes

```bash
# Run type check
npm run typecheck

# Run linter
npm run lint

# Run tests
npm run test
```

### Step 3: Test in Browser

```bash
npm run dev
```

Visit all major pages and verify:
- ✅ All pages load correctly
- ✅ No console errors
- ✅ UI looks exactly the same
- ✅ All interactions work

## 📋 Automated Migration Script

Create a migration script:

```bash
#!/bin/bash
# migrate-components.sh

echo "🚀 Starting component migration..."

# Atoms
echo "📦 Migrating atoms..."
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  -e "s|from '@/components/ui/button/Button'|from '@/components/atoms'|g" \
  -e "s|from '@/components/form/Input'|from '@/components/atoms'|g" \
  -e "s|from '@/components/form/Label'|from '@/components/atoms'|g" \
  -e "s|from '@/components/ui/badge/Badge'|from '@/components/atoms'|g" \
  {} \;

# Molecules
echo "🔬 Migrating molecules..."
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  -e "s|from '@/components/form/DatePicker'|from '@/components/molecules'|g" \
  -e "s|from '@/components/form/PhoneInput'|from '@/components/molecules'|g" \
  {} \;

# Organisms
echo "🦠 Migrating organisms..."
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  -e "s|from '@/components/layout/SidebarLayout'|from '@/components/organisms'|g" \
  -e "s|from '@/components/ui/modal/Modal'|from '@/components/organisms'|g" \
  {} \;

echo "✅ Migration complete!"
echo "🧪 Running tests..."
npm run typecheck && npm run lint

echo "✨ Done! Please test the application."
```

Run it:
```bash
chmod +x migrate-components.sh
./migrate-components.sh
```

## ⚠️ Common Issues & Solutions

### Issue 1: TypeScript Errors

**Problem:** `Cannot find module '@/components/atoms'`

**Solution:** 
```bash
# Clear TypeScript cache
rm -rf .next node_modules/.cache
npm run typecheck
```

### Issue 2: Default vs Named Exports

**Problem:** `export 'Button' was not found in '@/components/atoms'`

**Solution:** Check if component uses default export:
```typescript
// If old component uses default export
export default Button;

// The barrel export should be:
export { default as Button } from './Button';
```

### Issue 3: Circular Dependencies

**Problem:** Build errors about circular dependencies

**Solution:** 
- Don't import from parent folder in child components
- Use explicit imports instead of barrel exports in some cases

## 🧪 Testing Checklist

After migration, test these areas:

### Pages to Test:
- [ ] Login page (`/login`)
- [ ] Dashboard (all roles)
- [ ] Submissions list
- [ ] Create submission
- [ ] Edit submission
- [ ] User management
- [ ] QR Scanner
- [ ] Notifications
- [ ] Profile page

### Features to Test:
- [ ] Form validation
- [ ] File uploads
- [ ] Modals open/close
- [ ] Table sorting/filtering
- [ ] Date pickers
- [ ] Notifications
- [ ] Real-time updates
- [ ] Role-based access

### UI to Verify:
- [ ] Buttons render correctly
- [ ] Forms look the same
- [ ] Tables display properly
- [ ] Modals position correctly
- [ ] Colors unchanged
- [ ] Spacing unchanged
- [ ] Responsive design works

## 📚 Benefits After Migration

### Before:
```typescript
// 😫 Long import paths
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/Input';
import DatePicker from '@/components/form/DatePicker';
import UserTable from '@/components/features/user/table/UserTable';
import Modal from '@/components/ui/modal/Modal';
```

### After:
```typescript
// 😊 Clean, organized imports
import { Button, Input } from '@/components/atoms';
import { DatePicker } from '@/components/molecules';
import { UserTable, Modal } from '@/components/organisms';
```

### Benefits:
1. **Shorter imports** - Less typing, cleaner code
2. **Better organization** - Easy to find components
3. **Clear hierarchy** - Understand component complexity
4. **Better reusability** - Atoms can be used anywhere
5. **Easier testing** - Test smaller units
6. **Better documentation** - Clear component purpose

## 🎯 Next Steps

1. **Phase 1** (Current): Barrel exports created ✅
2. **Phase 2** (Next): Update imports across codebase
3. **Phase 3** (After): Remove old structure
4. **Phase 4** (Future): Add Storybook documentation

## 📞 Need Help?

If you encounter issues:

1. Check TypeScript errors: `npm run typecheck`
2. Check linting: `npm run lint`
3. Review this guide
4. Check component README: `src/components/README.md`

---

**Last Updated**: January 29, 2026  
**Status**: ✅ Ready for Use  
**Breaking Changes**: None (backward compatible)
