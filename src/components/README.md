# Atomic Design Component Structure

## 📁 Struktur Folder

Struktur ini mengikuti **Atomic Design Pattern** untuk better organization dan reusability.

```
src/components/
├── atoms/           → Basic building blocks (Button, Input, Label)
├── molecules/       → Simple combinations (FormField, SearchBar)
├── organisms/       → Complex components (Forms, Tables, Modals)
├── templates/       → Page layouts
├── features-v2/     → Feature-specific pages (NEW)
├── features/        → Legacy feature components (TO BE MIGRATED)
├── shared/          → Shared utilities & HOCs
└── ui/              → Legacy UI components (TO BE MIGRATED)
```

## 🎯 Component Guidelines

### Atoms
**Purpose**: Smallest, indivisible UI elements  
**Examples**: Button, Input, Label, Badge, Icon  
**Rules**:
- No business logic
- Highly reusable
- Prop-driven
- No external dependencies

### Molecules
**Purpose**: Simple combinations of atoms  
**Examples**: FormField (Label+Input+Error), SearchBar  
**Rules**:
- Compose 2-3 atoms
- Single responsibility
- Reusable patterns
- Minimal state

### Organisms
**Purpose**: Complex UI sections  
**Examples**: Forms, Tables, Navigation, Modal dialogs  
**Rules**:
- Can contain molecules and atoms
- May have complex logic
- Feature-specific behavior
- Can use hooks and context

### Templates
**Purpose**: Page-level layouts  
**Examples**: DashboardLayout, AuthLayout  
**Rules**:
- Define page structure
- Slot-based composition
- No business logic
- Responsive design

### Features
**Purpose**: Complete feature implementations  
**Examples**: SubmissionList, UserManagement  
**Rules**:
- Use organisms, molecules, atoms
- Contain business logic
- Feature-complete
- Can use services/APIs

## 📝 Naming Conventions

### Files
```
ComponentName/
├── index.tsx          # Main component
├── ComponentName.tsx  # Alternative (if complex)
├── types.ts           # TypeScript types
├── styles.ts          # Styled components (if any)
├── hooks.ts           # Custom hooks
└── README.md          # Documentation
```

### Components
- **PascalCase**: `ButtonPrimary`, `FormField`
- **Descriptive**: Clear purpose from name
- **Consistent**: Follow existing patterns

### Props
```typescript
// ✅ Good
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  onClick?: () => void;
}

// ❌ Bad
interface BtnProps {
  type?: string;
  loading?: boolean;
}
```

## 🔄 Migration Path

### Old Location → New Location

**Atoms**:
```
ui/button/Button.tsx → atoms/Button/
ui/badge/Badge.tsx → atoms/Badge/
form/Input.tsx → atoms/Input/
form/Label.tsx → atoms/Label/
```

**Molecules**:
```
form/DatePicker.tsx → molecules/DatePicker/
form/PhoneInput.tsx → molecules/PhoneInput/
ui/badge/StatusBadge.tsx → molecules/StatusBadge/
```

**Organisms**:
```
features/submission/form/ → organisms/forms/SubmissionForm/
features/user/table/ → organisms/tables/UserTable/
layout/SidebarLayout.tsx → organisms/navigation/Sidebar/
```

## 📊 Import Examples

### Before (Old Structure)
```typescript
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/Input';
import UserTable from '@/components/features/user/table/UserTable';
```

### After (New Structure)
```typescript
import { Button } from '@/components/atoms';
import { Input } from '@/components/atoms';
import { UserTable } from '@/components/organisms';

// Or specific imports
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
```

## ✅ Best Practices

### 1. Component Composition
```typescript
// ✅ Good - Compose from smaller parts
const SubmissionForm = () => (
  <Form>
    <FormField label="Name" />
    <FormField label="Email" />
    <Button>Submit</Button>
  </Form>
);

// ❌ Bad - Monolithic component
const SubmissionForm = () => {
  // 500 lines of code...
};
```

### 2. Prop Drilling vs Context
```typescript
// ✅ Use Context for deep trees
const ThemeContext = createContext();

// ❌ Avoid excessive prop drilling
<Parent>
  <Child theme={theme}>
    <GrandChild theme={theme}>
      <GreatGrandChild theme={theme} />
```

### 3. Single Responsibility
```typescript
// ✅ Good - One purpose
const Button = ({ onClick, children }) => (
  <button onClick={onClick}>{children}</button>
);

// ❌ Bad - Multiple purposes
const ButtonWithModal = ({ onClick, showModal, modalContent }) => {
  // Handles both button AND modal logic
};
```

## 🎨 Styling Approach

### Tailwind CSS (Current)
```typescript
const Button = ({ variant }: ButtonProps) => {
  const baseClasses = 'px-4 py-2 rounded';
  const variantClasses = {
    primary: 'bg-blue-500 text-white',
    secondary: 'bg-gray-200 text-gray-800',
  };
  
  return (
    <button className={cn(baseClasses, variantClasses[variant])}>
      {children}
    </button>
  );
};
```

## 🧪 Testing Strategy

### Atoms
```typescript
describe('Button', () => {
  it('renders children', () => {});
  it('handles click events', () => {});
  it('applies variant styles', () => {});
});
```

### Organisms
```typescript
describe('SubmissionForm', () => {
  it('renders all fields', () => {});
  it('validates input', () => {});
  it('submits data correctly', () => {});
  it('handles errors', () => {});
});
```

## 📦 Barrel Exports

Each level has an `index.ts` for convenient imports:

```typescript
// atoms/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Label } from './Label';
// ... etc

// Usage
import { Button, Input, Label } from '@/components/atoms';
```

## 🚀 Quick Reference

| Level | Purpose | Size | Complexity | Examples |
|-------|---------|------|------------|----------|
| **Atom** | Basic element | 10-50 lines | Very Low | Button, Input |
| **Molecule** | Simple combo | 50-150 lines | Low | FormField, Card |
| **Organism** | Complex section | 150-500 lines | Medium-High | Table, Form |
| **Template** | Page layout | 100-300 lines | Low-Medium | Layout |
| **Feature** | Full feature | 200-1000+ lines | High | UserManagement |

## 📚 Resources

- [Atomic Design by Brad Frost](https://bradfrost.com/blog/post/atomic-web-design/)
- [React Component Patterns](https://reactpatterns.com/)
- [Component Best Practices](https://react.dev/learn/thinking-in-react)

---

**Last Updated**: January 29, 2026  
**Version**: 2.0.0  
**Status**: 🚧 In Progress
