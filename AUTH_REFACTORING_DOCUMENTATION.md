# Authentication & Session Management Refactoring

## 📋 Overview
Refactoring komprehensif sistem authentication dan session management untuk mengatasi:
1. ✅ **Session tidak expired** - Sekarang ada validasi session dengan timeout
2. ✅ **User dihapus dari database tapi session masih ada** - Session divalidasi dengan database real-time
3. ✅ **Session management tidak proper** - Implementasi best practices dengan database session tracking

---

## 🏗️ Arsitektur Baru

### 1. **Session Service** (`src/services/session.service.ts`)
Service terpusat untuk semua operasi session management.

#### Features:
- ✅ **Database Session Tracking** - Semua session disimpan di database
- ✅ **Session Expiry** - 3 jenis timeout:
  - JWT Token Expiry: 24 jam
  - Idle Timeout: 2 jam (no activity)
  - Absolute Timeout: 7 hari (maksimal dari pembuatan)
- ✅ **User Validation** - Real-time check user exists & active
- ✅ **Activity Tracking** - Track last activity timestamp
- ✅ **Automatic Cleanup** - Cleanup expired & idle sessions

#### Key Methods:
```typescript
// Create new session
SessionService.createSession(userId, expiresInMs, metadata)

// Validate session
SessionService.validateSession(sessionToken)

// Refresh session (extend expiry)
SessionService.refreshSession(sessionToken)

// Force logout user
SessionService.forceLogout(userId, reason)

// Cleanup expired sessions
SessionService.cleanupExpiredSessions()

// Get active sessions count
SessionService.getActiveSessionsCount()
```

---

### 2. **Updated Database Schema**

#### Session Model Update:
```prisma
model Session {
  id             String    @id @default(cuid())
  sessionToken   String    @unique
  userId         String
  expires        DateTime
  createdAt      DateTime  @default(now())      // ✅ NEW
  lastActivityAt DateTime  @default(now())      // ✅ NEW
  ipAddress      String?                        // ✅ NEW
  userAgent      String?   @db.Text            // ✅ NEW
  user           User      @relation(...)

  @@index([expires])                            // ✅ NEW
  @@index([lastActivityAt])                     // ✅ NEW
}
```

**Migration Applied:** `20251020052929_add_session_tracking_fields`

---

### 3. **NextAuth Configuration Updates** (`src/lib/auth.ts`)

#### Changes:
```typescript
session: { 
  strategy: "jwt",
  maxAge: 24 * 60 * 60,        // 24 hours (was 30 days)
  updateAge: 2 * 60 * 60,      // Update every 2 hours
}
```

#### JWT Callback:
- ✅ Creates database session on sign-in
- ✅ Validates session on every request
- ✅ Checks if user exists & is active
- ✅ Returns empty token if invalid (forces logout)

#### Events:
- ✅ **signIn**: Creates session, updates lastActiveAt, cleanup expired
- ✅ **signOut**: Deletes all user sessions, cleanup tokens
- ✅ **session**: Validates token expiry

---

### 4. **Middleware Updates** (`middleware.ts`)

#### Session Validation Flow:
```typescript
1. Check if route is protected
2. Get JWT token from cookie
3. Extract sessionToken from JWT
4. If NO sessionToken → Redirect to /login
5. Validate session with SessionService
6. If INVALID → Clear cookies + Redirect to /login
7. If VALID → Continue to route
```

#### Auto-Logout Triggers:
- ❌ No session token in JWT
- ❌ Session not found in database
- ❌ Session expired (> 24 hours)
- ❌ Session idle (> 2 hours no activity)
- ❌ Session absolute timeout (> 7 days)
- ❌ User not found in database
- ❌ User account deactivated
- ❌ User account not verified (for certain roles)

---

## 🔌 API Endpoints

### Session Management APIs

#### 1. **Validate Session**
```http
GET /api/session/validate
```
Returns current session status and user info.

**Response:**
```json
{
  "isValid": true,
  "user": {
    "id": "...",
    "email": "...",
    "role": "VENDOR",
    "isActive": true
  },
  "session": {
    "expires": "2025-10-21T12:00:00Z",
    "lastActivity": "2025-10-20T11:55:00Z"
  }
}
```

---

#### 2. **Refresh Session**
```http
POST /api/session/refresh
```
Extends session expiry time.

**Response:**
```json
{
  "success": true,
  "message": "Session refreshed successfully",
  "expires": "2025-10-21T13:00:00Z"
}
```

---

#### 3. **Session Status**
```http
GET /api/session/status
```
Check if session is about to expire (for frontend warning).

**Response:**
```json
{
  "isExpiring": true,
  "minutesRemaining": 8,
  "expiryTime": "2025-10-20T12:08:00Z"
}
```

---

#### 4. **Cleanup Sessions** (Admin/Cron)
```http
POST /api/session/cleanup
Authorization: Bearer <CRON_SECRET>
```
Cleanup expired and idle sessions.

**Response:**
```json
{
  "success": true,
  "expiredSessionsDeleted": 15,
  "idleSessionsDeleted": 8,
  "totalDeleted": 23
}
```

---

### Admin APIs

#### 5. **Get Active Sessions**
```http
GET /api/admin/active-sessions
```
Get list of currently active sessions (SUPER_ADMIN/ADMIN only).

**Response:**
```json
{
  "success": true,
  "totalActiveSessions": 42,
  "sessions": [
    {
      "id": "...",
      "userId": "...",
      "expires": "...",
      "lastActivityAt": "...",
      "user": {
        "email": "vendor@example.com",
        "officer_name": "John Doe",
        "role": "VENDOR"
      }
    }
  ]
}
```

---

#### 6. **Force Logout User**
```http
POST /api/admin/force-logout
Content-Type: application/json

{
  "userId": "clxxxxx",
  "reason": "Admin action - security concern"
}
```
Force logout a specific user (deletes all their sessions).

---

## 🎨 Frontend Integration

### 1. **useSessionMonitor Hook**
Hook untuk monitoring session status di frontend.

```typescript
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

function MyComponent() {
  const {
    sessionStatus,      // { isExpiring, minutesRemaining, expiryTime }
    showExpiryWarning,  // boolean
    refreshSession,     // () => Promise<boolean>
    validateSession,    // () => Promise<boolean>
    dismissWarning,     // () => void
  } = useSessionMonitor();

  // Component implementation
}
```

#### Features:
- ✅ Auto-validates session every 2 minutes
- ✅ Auto-refreshes on user activity (throttled to 15 min)
- ✅ Validates when tab becomes visible again
- ✅ Shows warning when session about to expire
- ✅ Auto-logout if validation fails

---

### 2. **SessionExpiryWarning Component**
Modal warning ketika session hampir expired.

```typescript
import SessionExpiryWarning from '@/components/SessionExpiryWarning';

function Layout({ children }) {
  return (
    <>
      {children}
      <SessionExpiryWarning />
    </>
  );
}
```

#### Features:
- ✅ Shows 10 minutes before expiry
- ✅ User can extend session
- ✅ User can dismiss warning
- ✅ Beautiful HeadlessUI modal

---

## ⚙️ Configuration

### Environment Variables
```bash
# JWT & Session Configuration
JWT_EXPIRE_TIME=86400              # 24 hours
SESSION_MAX_AGE=86400              # 24 hours
SESSION_UPDATE_AGE=7200            # 2 hours
SESSION_IDLE_TIMEOUT=7200          # 2 hours
SESSION_ABSOLUTE_TIMEOUT=604800    # 7 days
WARNING_BEFORE_EXPIRY=10           # 10 minutes
AUTO_REFRESH_INTERVAL=15           # 15 minutes

# Cron Job Secret (for cleanup endpoint)
CRON_SECRET=your-secure-secret-key
```

### JWT Config (`src/utils/jwt-config.ts`)
```typescript
export const JWT_CONFIG = {
  JWT_EXPIRE_TIME: 86400,           // 24 hours
  SESSION_MAX_AGE: 86400,           // 24 hours
  SESSION_UPDATE_AGE: 7200,         // 2 hours
  SESSION_IDLE_TIMEOUT: 7200,       // 2 hours
  SESSION_ABSOLUTE_TIMEOUT: 604800, // 7 days
  WARNING_BEFORE_EXPIRY: 10,        // 10 minutes
  AUTO_REFRESH_INTERVAL: 15,        // 15 minutes
}
```

---

## 🔄 Session Lifecycle

### 1. **Login Flow**
```
User Login
  ↓
NextAuth authorize()
  ↓
JWT callback (user exists)
  ↓
SessionService.createSession()
  ↓
Store sessionToken in JWT
  ↓
Session callback
  ↓
User redirected to dashboard
```

### 2. **Request Flow** (Protected Route)
```
User requests /dashboard
  ↓
Middleware checks token
  ↓
Extract sessionToken from JWT
  ↓
SessionService.validateSession()
  ├─ Check expiry
  ├─ Check idle timeout
  ├─ Check user exists
  ├─ Check user active
  └─ Update lastActivityAt
  ↓
If valid → Continue
If invalid → Redirect to /login
```

### 3. **Auto-Refresh Flow**
```
User active (mouse move, click, etc)
  ↓
useSessionMonitor detects activity
  ↓
Check if > 15 min since last refresh
  ↓
Call /api/session/refresh
  ↓
SessionService.refreshSession()
  ↓
Extend session expiry
  ↓
Update lastActivityAt
```

### 4. **Logout Flow**
```
User clicks Logout
  ↓
signOut() event triggered
  ↓
SessionService.deleteAllUserSessions()
  ↓
TokenManager.invalidateAllUserTokens()
  ↓
Clear cookies
  ↓
Redirect to /login
```

---

## 🧹 Maintenance

### Automatic Cleanup
Setup cron job to call cleanup endpoint:

```bash
# Every hour
0 * * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/session/cleanup
```

Or use Vercel Cron:
```json
{
  "crons": [
    {
      "path": "/api/session/cleanup",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Manual Cleanup (Development)
```bash
# In development, you can call directly
curl http://localhost:3000/api/session/cleanup
```

---

## 🔒 Security Features

### 1. **Defense in Depth**
- ✅ JWT token validation
- ✅ Database session validation
- ✅ User existence check
- ✅ User active status check
- ✅ Multiple timeout layers

### 2. **Session Hijacking Prevention**
- ✅ Secure token generation (crypto.randomBytes)
- ✅ HttpOnly cookies
- ✅ Idle timeout enforcement
- ✅ Absolute timeout enforcement

### 3. **Session Fixation Prevention**
- ✅ New session on each login
- ✅ Old sessions cleaned up on login
- ✅ Session rotation on security events

### 4. **Admin Controls**
- ✅ Force logout capability
- ✅ Active session monitoring
- ✅ Session cleanup management

---

## 📊 Database Queries

### Indexes for Performance
```sql
-- Session table indexes
CREATE INDEX Session_expires_idx ON Session(expires);
CREATE INDEX Session_lastActivityAt_idx ON Session(lastActivityAt);
CREATE INDEX Session_userId_fkey ON Session(userId);
```

### Common Queries
```sql
-- Find active sessions
SELECT * FROM Session 
WHERE expires > NOW() 
AND lastActivityAt > DATE_SUB(NOW(), INTERVAL 5 MINUTE);

-- Find idle sessions
SELECT * FROM Session 
WHERE lastActivityAt < DATE_SUB(NOW(), INTERVAL 2 HOUR);

-- Count active sessions per user
SELECT userId, COUNT(*) as session_count 
FROM Session 
WHERE expires > NOW() 
GROUP BY userId;
```

---

## 🧪 Testing Scenarios

### Test Session Expiry
```typescript
// 1. Login and wait 24+ hours
// Expected: Auto-logout

// 2. Login and be idle for 2+ hours
// Expected: Auto-logout

// 3. Login and check after 7 days (even if active)
// Expected: Auto-logout

// 4. Delete user from database while logged in
// Expected: Immediate auto-logout on next request
```

### Test Session Refresh
```typescript
// 1. Login and stay active (move mouse)
// Expected: Session auto-refreshed every 15 minutes

// 2. Session near expiry (< 10 min remaining)
// Expected: Warning modal appears

// 3. Click "Extend Session" in warning
// Expected: Session extended, warning dismissed
```

### Test Admin Functions
```typescript
// 1. Admin force logout user
// Expected: User immediately logged out

// 2. View active sessions
// Expected: List of all active sessions

// 3. Cleanup sessions
// Expected: Expired and idle sessions removed
```

---

## 📝 Migration Guide

### For Existing Users
When deploying this update:

1. ✅ Run migration: `npx prisma migrate deploy`
2. ✅ All existing users will need to login again (old sessions won't have sessionToken)
3. ✅ Setup cron job for session cleanup
4. ✅ Configure environment variables

### Breaking Changes
- ❌ Session max age reduced from 30 days to 24 hours
- ❌ All users will be logged out on deployment
- ❌ Old JWT tokens without sessionToken will be invalid

---

## 🎯 Summary

### Problems Solved
✅ **Session tidak expired** → Sekarang ada 3 layer timeout (JWT, Idle, Absolute)  
✅ **User dihapus tapi session masih ada** → Real-time validation dengan database  
✅ **Session tidak proper** → Best practices implementation dengan tracking lengkap

### Key Improvements
- 🔐 **Security**: Multiple timeout layers, real-time validation
- 📊 **Monitoring**: Track all active sessions, user activity
- 🎯 **User Experience**: Auto-refresh, expiry warnings
- 🛠️ **Admin Tools**: Force logout, session management
- 🧹 **Maintenance**: Automatic cleanup, efficient queries
- 📈 **Scalability**: Indexed queries, optimized validation

### Best Practices Applied
✅ Defense in depth  
✅ Fail secure (invalid → logout)  
✅ Principle of least privilege  
✅ Automatic cleanup  
✅ Activity tracking  
✅ Admin observability  
✅ User-friendly UX  

---

## 🆘 Troubleshooting

### Issue: Users constantly logged out
**Solution:** Check `SESSION_IDLE_TIMEOUT` and `SESSION_UPDATE_AGE` settings. Increase if needed.

### Issue: Session cleanup not working
**Solution:** Verify cron job is running and `CRON_SECRET` is correct.

### Issue: "No session token" error
**Solution:** User needs to logout and login again to get new session with sessionToken.

### Issue: Performance issues
**Solution:** Verify database indexes are created. Run `EXPLAIN` on slow queries.

---

## 📚 References

- NextAuth.js Documentation: https://next-auth.js.org/
- Prisma Session Management: https://www.prisma.io/docs/concepts/components/prisma-client/
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

---

**Last Updated:** October 20, 2025  
**Version:** 2.0.0  
**Status:** ✅ Production Ready
