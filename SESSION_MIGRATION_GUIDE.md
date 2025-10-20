# Session Migration & Troubleshooting Guide

## 🔄 Migrasi dari Session Lama ke Baru

### Masalah yang Terjadi:
1. ✅ **Session lama masih tersimpan di browser** - JWT token tanpa `sessionToken`
2. ✅ **User bisa akses dashboard meski tidak ada session di DB** - Token lama valid tapi tidak tracked
3. ✅ **Redirect ke /verification-pending bukan /login** - Middleware tidak handle session lama dengan baik

### Solusi yang Diterapkan:

#### 1. **Middleware Update** - Auto-Clear Old Sessions
```typescript
// Jika JWT token tidak punya sessionToken, ini adalah session lama
if (!sessionToken) {
  console.log('Old session detected, forcing logout');
  
  // Clear ALL auth cookies
  response.cookies.set('next-auth.session-token', '', { maxAge: 0 });
  response.cookies.set('__Secure-next-auth.session-token', '', { maxAge: 0 });
  // ... clear other cookies
  
  // Clean up database sessions
  await SessionService.deleteAllUserSessions(userId);
  
  // Redirect to login with message
  return redirect('/login?session_expired=true&reason=...');
}
```

#### 2. **Login Page Update** - Show Session Expired Message
```typescript
// Deteksi parameter dari middleware
const sessionExpired = searchParams.get('session_expired');
const reason = searchParams.get('reason');

if (sessionExpired === 'true') {
  setError(decodeURIComponent(reason));
  clearOldSessions(); // Clear cookies di client side
}
```

#### 3. **Session Utils** - Clear Old Sessions Helper
```typescript
// Clear semua cookies NextAuth lama
clearOldSessions();

// Force logout dengan cleanup lengkap
forceLogout(reason);
```

#### 4. **Database Cleanup Script**
```bash
# Clear all old sessions from database
npx tsx scripts/clear-old-sessions.ts
```

---

## 🚀 Deployment Checklist

### Before Deploy:
- [x] Run migrations: `npx prisma migrate deploy`
- [x] Generate Prisma client: `npx prisma generate`
- [x] Build application: `npm run build`
- [x] Test TypeScript: `npx tsc --noEmit`

### After Deploy:
1. **Clear all old sessions:**
   ```bash
   npx tsx scripts/clear-old-sessions.ts
   ```
   Output:
   ```
   ✅ Deleted X old sessions from database
   ✅ Reset session fields for Y users
   ✅ Deleted Z refresh tokens
   ```

2. **Verify middleware is working:**
   - Try to access dashboard without login → Should redirect to /login
   - Login with new credentials → Should create session in DB
   - Refresh page → Session should persist
   - Check database → Session record should exist

3. **Test session expiry:**
   - Login
   - Wait 24+ hours or manually expire in DB
   - Try to access protected route → Should auto-logout

4. **Setup cron job for cleanup:**
   ```bash
   # Run every hour
   0 * * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/session/cleanup
   ```

---

## 🔍 Troubleshooting

### Problem: User masih bisa akses dashboard setelah deploy

**Symptoms:**
- User bisa masuk dashboard
- Tidak ada session di database
- Di-refresh malah ke /verification-pending

**Solution:**
```bash
# 1. Clear all sessions in database
npx tsx scripts/clear-old-sessions.ts

# 2. User harus clear browser cookies manually atau
#    - Open browser DevTools (F12)
#    - Application > Cookies > Clear all
#    - Or Ctrl+Shift+Delete > Clear cookies

# 3. Login ulang dengan credentials
```

**Prevention:**
Middleware sekarang otomatis detect dan clear old sessions.

---

### Problem: Redirect loop antara /login dan /dashboard

**Symptoms:**
- User login tapi langsung logout
- Infinite redirect
- Console log: "No session token found"

**Solution:**
```typescript
// Check if JWT callback is creating session properly
// In auth.ts, ensure:
if (user) {
  const sessionData = await SessionService.createSession(user.id);
  token.sessionToken = sessionData.sessionToken; // ← IMPORTANT
}
```

**Verification:**
```sql
-- Check if session was created
SELECT * FROM Session WHERE userId = 'USER_ID' ORDER BY createdAt DESC LIMIT 1;

-- Should have sessionToken, createdAt, lastActivityAt
```

---

### Problem: Session expired too quickly

**Symptoms:**
- User logout dalam < 24 jam
- Frequent "session expired" messages

**Solution:**
```bash
# Check configuration in .env
JWT_EXPIRE_TIME=86400              # 24 hours
SESSION_MAX_AGE=86400              # 24 hours
SESSION_IDLE_TIMEOUT=7200          # 2 hours
SESSION_ABSOLUTE_TIMEOUT=604800    # 7 days

# Adjust as needed:
# - Increase SESSION_IDLE_TIMEOUT if users are idle longer
# - Increase SESSION_MAX_AGE if want longer sessions
```

**Check logs:**
```
Session validation failed: Session idle timeout
Session validation failed: Session expired
```

---

### Problem: Users tidak bisa login setelah migration

**Symptoms:**
- Login form shows error
- Database error in logs
- "Cannot create session" error

**Solution:**
```bash
# 1. Verify database migration applied
npx prisma migrate status

# 2. Check if Session table has new columns
# Should have: createdAt, lastActivityAt, ipAddress, userAgent

# 3. Re-generate Prisma client
npx prisma generate

# 4. Restart application
npm run dev  # or restart production server
```

---

### Problem: Multiple active sessions per user

**Symptoms:**
- User has 10+ sessions in database
- Performance issues
- Database growing large

**Solution:**
```typescript
// SessionService already limits to 5 sessions per user
// But you can manually clean up:

// Get user's active sessions
const sessions = await SessionService.getUserSessions(userId);
console.log(`User has ${sessions.length} active sessions`);

// Clean up old sessions (keeps only 5 most recent)
await SessionService.cleanupUserSessions(userId, 5);

// Or force logout all sessions
await SessionService.deleteAllUserSessions(userId);
```

**Prevention:**
Automatic cleanup on login (already implemented).

---

### Problem: Session not updating activity

**Symptoms:**
- `lastActivityAt` not changing
- Users getting idle timeout despite being active

**Solution:**
```typescript
// Check if middleware is calling validation
// In middleware.ts:
const validation = await SessionService.validateSession(sessionToken);

// SessionService automatically updates lastActivityAt
// But throttled to every 5 minutes to reduce DB writes

// If you need real-time updates, adjust:
private static readonly ACTIVITY_UPDATE_INTERVAL = 1 * 60 * 1000; // 1 minute
```

---

### Problem: Admin can't view active sessions

**Symptoms:**
- /api/admin/active-sessions returns empty
- Shows 0 active sessions despite users online

**Solution:**
```typescript
// Check role permissions
// Only SUPER_ADMIN and ADMIN can view
const allowedRoles = ['SUPER_ADMIN', 'ADMIN'];

// Check if sessions are considered "active"
// Active = expires > now AND lastActivityAt > 5 minutes ago

// Manually check database:
SELECT COUNT(*) FROM Session 
WHERE expires > NOW() 
AND lastActivityAt > DATE_SUB(NOW(), INTERVAL 5 MINUTE);
```

---

## 🧪 Testing Guide

### Test 1: Fresh Login
```bash
1. Clear all cookies in browser
2. Go to /login
3. Enter credentials
4. Click "Login"

Expected:
✅ Redirected to dashboard
✅ Session created in database
✅ sessionToken in JWT token
✅ lastActivityAt = current time
```

### Test 2: Session Persistence
```bash
1. Login successfully
2. Refresh page multiple times
3. Navigate to different pages
4. Close browser and reopen

Expected:
✅ Still logged in
✅ No re-login required
✅ lastActivityAt updating (throttled)
```

### Test 3: Session Expiry
```bash
1. Login successfully
2. Manually update database:
   UPDATE Session SET expires = NOW() - INTERVAL 1 HOUR WHERE userId = 'USER_ID';
3. Try to access /dashboard

Expected:
✅ Redirected to /login
✅ Error: "Sesi telah berakhir"
✅ Session deleted from database
```

### Test 4: Idle Timeout
```bash
1. Login successfully
2. Don't touch anything for 2+ hours
3. Try to click something

Expected:
✅ Auto-logout
✅ Redirected to /login
✅ Error: "Session idle timeout"
```

### Test 5: User Deleted While Logged In
```bash
1. Login as user A
2. Keep browser open
3. Admin deletes user A from database
4. User A tries to navigate

Expected:
✅ Auto-logout
✅ Redirected to /login
✅ Error: "User not found"
```

### Test 6: Old Session Migration
```bash
1. Have old JWT token in cookie (no sessionToken)
2. Try to access /dashboard

Expected:
✅ Redirected to /login
✅ Error: "Sesi lama terdeteksi, silakan login kembali"
✅ All cookies cleared
✅ No session in database
```

---

## 📊 Monitoring

### Check Active Sessions
```sql
-- Count active sessions
SELECT COUNT(*) as active_sessions
FROM Session 
WHERE expires > NOW() 
AND lastActivityAt > DATE_SUB(NOW(), INTERVAL 5 MINUTE);

-- Group by user
SELECT u.officer_name, u.email, COUNT(*) as session_count
FROM Session s
JOIN User u ON s.userId = u.id
WHERE s.expires > NOW()
GROUP BY u.id
ORDER BY session_count DESC;

-- Find idle sessions (not active > 2 hours)
SELECT s.*, u.email
FROM Session s
JOIN User u ON s.userId = u.id
WHERE s.expires > NOW()
AND s.lastActivityAt < DATE_SUB(NOW(), INTERVAL 2 HOUR);
```

### API Monitoring
```bash
# Check active sessions count
curl http://localhost:3000/api/admin/active-sessions \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Force cleanup
curl -X POST http://localhost:3000/api/session/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check specific session status
curl http://localhost:3000/api/session/status \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

---

## 🔐 Security Notes

### Best Practices Implemented:
1. ✅ **Defense in Depth** - Multiple validation layers
2. ✅ **Fail Secure** - Invalid session = auto-logout
3. ✅ **Session Limits** - Max 5 sessions per user
4. ✅ **Activity Tracking** - Real-time user activity
5. ✅ **Automatic Cleanup** - Expired & idle sessions removed
6. ✅ **Admin Controls** - Force logout capability

### Recommendations:
- Run cleanup cron job hourly
- Monitor active sessions count
- Review user activity logs
- Alert on suspicious patterns (multiple IPs, etc.)
- Consider adding IP validation
- Consider adding device fingerprinting

---

## 📝 Summary

### What Changed:
- ✅ All sessions now tracked in database
- ✅ Multiple timeout layers (JWT, Idle, Absolute)
- ✅ Real-time user validation
- ✅ Old sessions automatically cleared
- ✅ Proper error messages on logout
- ✅ Admin monitoring tools

### Migration Impact:
- ⚠️ **All users must re-login** after deployment
- ⚠️ **Old JWT tokens invalidated** automatically
- ⚠️ **Session duration reduced** from 30 days to 24 hours
- ✅ **Better security** and control
- ✅ **Better user experience** with clear messages

### Next Steps:
1. Deploy to production
2. Run cleanup script
3. Monitor logs for errors
4. Setup cron job
5. Notify users about re-login requirement

---

**Last Updated:** October 20, 2025  
**Version:** 2.1.0  
**Status:** ✅ Production Ready
