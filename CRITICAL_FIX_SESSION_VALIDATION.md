# Critical Fix: Session Validation Before Verification-Pending Access

## 🐛 **BUG yang Ditemukan:**
Ketika session dihapus dari database, user dengan JWT token lama masih bisa akses `/verification-pending` tanpa validasi session terlebih dahulu!

### Skenario Bug:
```
1. User login → Session dibuat di DB
2. Admin/System hapus session dari DB (atau expired)
3. User masih punya JWT token di browser
4. User akses /verification-pending
5. ❌ BUG: Langsung di-allow karena punya token
   (Session tidak divalidasi dengan database!)
```

## 🔧 **Root Cause:**

### Old Flow (❌ BUGGY):
```typescript
// 1. Check if has token
if (!token) redirect("/login");

// 2. Special handling for /verification-pending
if (pathname === "/verification-pending") {
  if (!token) redirect("/login");
  return NextResponse.next(); // ← ALLOW ACCESS tanpa validasi session!
}

// 3. Validate session (TERLAMBAT! sudah allow di step 2)
const validation = await SessionService.validateSession(sessionToken);
```

**Problem:** `/verification-pending` di-allow SEBELUM session divalidasi dengan database!

## ✅ **Solution:**

### New Flow (✅ FIXED):
```typescript
// 1. Check if has token
if (!token) redirect("/login");

// 2. Validate session FIRST (untuk SEMUA authenticated paths)
const sessionToken = token.sessionToken;

if (!sessionToken) {
  // Old session detected
  return clearAndRedirect("/login");
}

const validation = await SessionService.validateSession(sessionToken);

if (!validation.isValid) {
  // Session invalid/deleted/expired
  return clearAndRedirect("/login");
}

// 3. NOW allow /verification-pending (session sudah tervalidasi)
if (pathname === "/verification-pending") {
  return NextResponse.next(); // ✅ SAFE: Session sudah valid
}

// 4. Continue with other protected route checks...
```

## 🎯 **Key Changes:**

### 1. Session Validation MOVED EARLIER
```typescript
// OLD POSITION (WRONG):
if (pathname === "/verification-pending") {
  return NextResponse.next(); // ← No validation!
}
// ... later ...
const validation = await SessionService.validateSession(...);

// NEW POSITION (CORRECT):
const validation = await SessionService.validateSession(...);
if (!validation.isValid) {
  return redirect("/login");
}
// ... then ...
if (pathname === "/verification-pending") {
  return NextResponse.next(); // ✅ Already validated
}
```

### 2. Validation Applies to ALL Authenticated Paths
```typescript
// Validates session for:
// - /verification-pending ✅ (NEW!)
// - /dashboard ✅
// - /vendor/* ✅
// - /approver/* ✅
// - All protected routes ✅
```

## 🧪 **Test Scenarios:**

### Test 1: Session Deleted from DB
```bash
# Setup
1. User login successfully
2. Session created in DB
3. Admin manually deletes session from DB:
   DELETE FROM Session WHERE userId = 'USER_ID';

# Test
4. User tries to access /verification-pending

# Expected Result:
✅ Middleware validates session
✅ Session not found in DB
✅ validation.isValid = false
✅ Redirect to /login with message "Session not found"
✅ Cookies cleared
❌ NOT allowed to access /verification-pending
```

### Test 2: Session Expired
```bash
# Setup
1. User login successfully
2. Wait 24+ hours (or manually set expires to past)
   UPDATE Session SET expires = NOW() - INTERVAL 1 DAY;

# Test
3. User tries to access /verification-pending

# Expected Result:
✅ Middleware validates session
✅ Session expired detected
✅ validation.isValid = false, reason = "Session expired"
✅ Redirect to /login
❌ NOT allowed to access /verification-pending
```

### Test 3: User Deactivated
```bash
# Setup
1. User login successfully
2. Admin deactivates user:
   UPDATE User SET isActive = false WHERE id = 'USER_ID';

# Test
3. User tries to access /verification-pending

# Expected Result:
✅ Middleware validates session
✅ User.isActive = false detected
✅ validation.isValid = false, reason = "User account is deactivated"
✅ Session deleted from DB
✅ Redirect to /login
❌ NOT allowed to access /verification-pending
```

### Test 4: Old Session (No sessionToken)
```bash
# Setup
1. User has old JWT token (from before refactoring)
2. Token doesn't have sessionToken field

# Test
3. User tries to access /verification-pending

# Expected Result:
✅ Middleware checks for sessionToken
✅ sessionToken not found
✅ Redirect to /login with message "Old session detected"
✅ All cookies cleared
✅ All user sessions cleaned from DB
❌ NOT allowed to access /verification-pending
```

### Test 5: Valid Session + Unverified User ✅
```bash
# Setup
1. User login successfully
2. User not verified yet (verified_at = null)

# Test
3. User tries to access /verification-pending

# Expected Result:
✅ Middleware validates session → Valid
✅ Check pathname = /verification-pending
✅ Allow access (user can see verification status)
✅ SUCCESS!
```

## 📊 **Execution Flow:**

```
Request to /verification-pending
  ↓
1. Is it public path? (/login, /signup, /)
   ├─ YES: Allow ✅
   └─ NO: Continue
       ↓
2. Get JWT token from cookie
       ↓
3. Has token?
   ├─ NO: Redirect /login ❌
   └─ YES: Continue
       ↓
4. Extract sessionToken from JWT
       ↓
5. Has sessionToken?
   ├─ NO: Old session → Clear & Redirect /login ❌
   └─ YES: Continue
       ↓
6. Validate session with database
   (Check: exists, not expired, user active, etc.)
       ↓
7. Session valid?
   ├─ NO: Clear & Redirect /login ❌
   └─ YES: Continue
       ↓
8. Is pathname = /verification-pending?
   ├─ YES: Allow access ✅
   └─ NO: Continue with role checks
       ↓
9. Check user role & verification...
```

## 🔒 **Security Impact:**

### Before Fix:
- ❌ **Session Bypass:** User dengan deleted session bisa akses /verification-pending
- ❌ **Deactivated User:** User yang di-deactivate masih bisa lihat verification status
- ❌ **Expired Session:** User dengan expired session masih bisa akses
- ❌ **No Database Sync:** JWT token valid = akses granted (tanpa cek DB)

### After Fix:
- ✅ **Real-time Validation:** Setiap request divalidasi dengan database
- ✅ **Immediate Revocation:** Deleted session = immediate logout
- ✅ **User State Check:** Deactivated/deleted user = access denied
- ✅ **Expiry Enforcement:** Expired session = auto-logout
- ✅ **Defense in Depth:** Multiple layers of validation

## 📝 **Code Changes:**

### Line Order Changed:
```diff
export async function middleware(req: NextRequest) {
  // ... get token ...
  
- // OLD: Check /verification-pending BEFORE validation
- if (pathname === "/verification-pending") {
-   if (!token) return redirect("/login");
-   return NextResponse.next(); // ❌ No validation!
- }
  
  // Validate session against database
  const validation = await SessionService.validateSession(sessionToken);
  
  if (!validation.isValid) {
    return redirect("/login"); // Clear & redirect
  }
  
+ // NEW: Check /verification-pending AFTER validation
+ if (pathname === "/verification-pending") {
+   return NextResponse.next(); // ✅ Already validated!
+ }
  
  // Continue with other checks...
}
```

## ⚠️ **Breaking Changes:**

### None! This is a bug fix, not a feature change.

### User Impact:
- Users with invalid/deleted sessions will be logged out immediately
- No change for users with valid sessions
- Better security = better user experience

## 🚀 **Deployment:**

### Pre-Deploy Checklist:
- [x] TypeScript compilation: No errors
- [x] Test with deleted session
- [x] Test with expired session
- [x] Test with valid session
- [x] Test with old session (no sessionToken)

### Post-Deploy Monitoring:
```bash
# Monitor logs for session validation
tail -f logs/middleware.log | grep "Session validation"

# Check for redirects to login
tail -f logs/access.log | grep "session_expired=true"

# Monitor database for orphaned sessions
SELECT COUNT(*) FROM Session WHERE expires < NOW();
```

## 📈 **Performance:**

### Impact: Minimal
- Session validation already happens for protected routes
- Just moved earlier in the execution flow
- Same number of DB queries
- Same validation logic

### Optimization:
- Session validation results could be cached (future enhancement)
- Use Redis for session lookup (future enhancement)

## 📚 **Related Files:**

- `middleware.ts` - Main fix applied here
- `src/services/session.service.ts` - Session validation logic
- `MIDDLEWARE_VERIFICATION_FIX.md` - Previous fix documentation

## 🎯 **Summary:**

| Issue | Before | After |
|-------|--------|-------|
| Session deleted → Access /verification-pending | ✅ Allowed (BUG!) | ❌ Redirect /login |
| Session expired → Access /verification-pending | ✅ Allowed (BUG!) | ❌ Redirect /login |
| User deactivated → Access /verification-pending | ✅ Allowed (BUG!) | ❌ Redirect /login |
| Valid session → Access /verification-pending | ✅ Allowed | ✅ Allowed |
| No session → Access /verification-pending | ❌ Redirect /login | ❌ Redirect /login |

---

**Fixed:** October 20, 2025  
**Critical Bug:** Session validation bypassed for /verification-pending  
**Solution:** Validate session BEFORE allowing access to any authenticated path  
**Status:** ✅ Fixed & Tested  
**Severity:** HIGH (Security vulnerability)
