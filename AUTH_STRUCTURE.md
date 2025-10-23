# 🔐 Auth Structure - Simple & Secure

## 📁 File Structure

```
src/
├── lib/
│   └── auth.ts                    # NextAuth config (JWT + Session callbacks)
├── services/
│   └── session.service.ts         # Database session management
├── components/security/
│   └── RoleGate.tsx              # Role + Verification guard (client-side)
├── middleware.ts                  # Route protection (server-side)
└── providers/
    └── AppProvider.tsx            # SessionProvider wrapper
```

## 🔄 Auth Flow

### 1. **Login Flow**
```
User submits credentials
  ↓
Turnstile validation (production only)
  ↓
auth.ts authorize() - validates credentials
  ↓
jwt() callback - creates DB session
  ↓
User gets JWT token with sessionToken
  ↓
Middleware validates every request against DB
```

### 2. **Page Access Flow**
```
User navigates to protected page
  ↓
Middleware intercepts request
  ↓
Validates JWT token
  ↓
Validates sessionToken against database
  ↓
Checks role permissions
  ↓
Checks verification status
  ↓
Allow/Deny access
```

### 3. **Session Validation**
```
Every request:
  ↓
middleware.ts - validates session with DB
  ↓
If invalid: clear cookies, redirect to login
  ↓
If valid: allow request
```

### 4. **Logout Flow**
```
User clicks logout
  ↓
signOut() event in auth.ts
  ↓
Deletes ALL user sessions from DB
  ↓
Invalidates all refresh tokens
  ↓
Clears cookies
  ↓
Redirects to login
```

## 🛡️ Security Features

### ✅ Database as Single Source of Truth
- Session stored in database
- Every request validates against database
- JWT only contains sessionToken (identifier)
- User data fetched fresh from DB on every request

### ✅ Real-time Session Invalidation
- Delete session from DB → user immediately logged out
- No need for polling or monitoring
- Middleware handles validation on every request

### ✅ Multi-layer Protection
1. **Middleware** - Server-side validation (runs first)
2. **RoleGate** - Client-side role check (for UX)
3. **Database** - Single source of truth

### ✅ Automatic Cleanup
- Expired sessions cleaned on sign-in
- Orphaned sessions cleaned on invalid token
- All sessions deleted on sign-out

## 📝 Key Components

### 1. **middleware.ts**
```typescript
// Simple & efficient
- Validates JWT token
- Validates sessionToken against DB
- Checks role permissions
- Checks verification status
- Redirects if unauthorized
```

### 2. **auth.ts callbacks**
```typescript
jwt():
  - On sign-in: create DB session
  - On request: validate DB session
  - On error: return null (clear token)

session():
  - Fetch fresh user data from DB
  - Return null if invalid
```

### 3. **RoleGate.tsx**
```typescript
// Client-side guard
- Check authentication
- Check role permission
- Check verification status (optional)
- Auto-redirect if unauthorized
```

### 4. **SessionService**
```typescript
// Database operations
- createSession()
- validateSession()
- deleteSession()
- cleanupExpiredSessions()
```

## 🎯 Usage

### Protect a Page
```tsx
import RoleGate from '@/components/security/RoleGate';

export default function VendorPage() {
  return (
    <RoleGate allowedRoles={["VENDOR"]}>
      <YourComponent />
    </RoleGate>
  );
}
```

### Disable Verification Check
```tsx
<RoleGate allowedRoles={["VENDOR"]} requireVerification={false}>
  <YourComponent />
</RoleGate>
```

### Server-side Session Check
```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function Page() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  return <YourComponent />;
}
```

## 🔧 Configuration

### Session Settings (auth.ts)
```typescript
session: { 
  strategy: "jwt",
  maxAge: 24 * 60 * 60, // 24 hours
  updateAge: 2 * 60 * 60, // Update every 2 hours
}
```

### Protected Routes (middleware.ts)
```typescript
const protectedRoutes = [
  { prefix: "/super-admin", minRole: "SUPER_ADMIN" },
  { prefix: "/approver", minRole: "APPROVER" },
  { prefix: "/reviewer", minRole: "REVIEWER" },
  { prefix: "/verifier", minRole: "VERIFIER" },
  { prefix: "/vendor", minRole: "VENDOR" },
  { prefix: "/dashboard", minRole: "VENDOR" },
];
```

## ⚡ Performance

- **No client-side polling** - middleware handles validation
- **Minimal DB queries** - only validate on request
- **Efficient caching** - NextAuth handles JWT caching
- **Auto cleanup** - expired sessions cleaned automatically

## 🚀 Benefits

1. ✅ **Simple** - Few files, easy to understand
2. ✅ **Secure** - Database is single source of truth
3. ✅ **Fast** - No unnecessary polling or checks
4. ✅ **Reliable** - Session invalidation works immediately
5. ✅ **Maintainable** - Clean code, minimal complexity

## 🔍 Debugging

### Check Session in Browser
```javascript
// Console
fetch('/api/auth/session').then(r => r.json()).then(console.log)
```

### Check Middleware Logs
- Session validation happens on every request
- Check server console for validation errors

### Check Database
```sql
SELECT * FROM "Session" WHERE "userId" = 'user-id';
```

## 📌 Important Notes

1. **Always use middleware** - Don't bypass with manual checks
2. **Trust the database** - It's the single source of truth
3. **Keep it simple** - Don't add unnecessary complexity
4. **Test regularly** - Verify session invalidation works
5. **Monitor logs** - Check for unusual patterns

---

**Last Updated:** October 23, 2025
**Version:** 2.0 (Simplified)
