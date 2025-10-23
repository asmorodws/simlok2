# Auto-Session pada Signup

## Fitur Baru
Ketika user berhasil melakukan registrasi, sistem akan **otomatis membuat session** sehingga user langsung diarahkan ke halaman `/verification-pending` tanpa perlu login manual.

## Cara Kerja

### 1. Proses Registrasi (`/api/auth/signup`)
```
User mengisi form signup
    ↓
Validasi data (Zod schema)
    ↓
Verify Turnstile (production only)
    ↓
Hash password (bcrypt)
    ↓
Buat user baru di database
    ↓
✨ BUAT SESSION DI DATABASE ✨
    ↓
Generate JWT token (NextAuth format)
    ↓
Set cookie session
    ↓
Return response dengan sessionCreated=true
```

### 2. Session Creation Details

**Database Session:**
- Disimpan di table `Session`
- Terhubung dengan `userId`
- Expires dalam 24 jam
- Tracking IP address & User Agent

**JWT Token:**
- Contains: `sub`, `sessionToken`, `email`, `role`
- Signed dengan NEXTAUTH_SECRET
- Set sebagai cookie: `next-auth.session-token`
- HttpOnly, SameSite=Lax

### 3. Frontend Handling (`/signup`)

```typescript
// Jika sessionCreated = true
if (data.sessionCreated && data.redirectTo === "/verification-pending") {
  // Langsung redirect (session sudah ada di cookie)
  router.push("/verification-pending");
}

// Fallback: jika session creation gagal
else {
  // Coba auto-login dengan credentials
  signIn("credentials", { email, password });
}
```

## Keamanan

### ✅ Proteksi yang Diterapkan:
1. **Rate Limiting** - Max 5 registrasi per 15 menit per IP
2. **Turnstile Verification** - Captcha cloudflare (production only)
3. **Password Strength** - Min 8 char, harus ada huruf besar, kecil, angka
4. **Session Tracking** - IP & User Agent disimpan
5. **Session Expiry** - Auto-expire 24 jam
6. **Database Validation** - Setiap request divalidasi ke database

### 🔒 Session Limitations:
- Max 5 concurrent sessions per user
- Idle timeout: 2 jam
- Absolute timeout: 7 hari
- Auto-cleanup expired sessions

## Testing

### Test Case 1: Successful Registration
```bash
# Register user baru
POST /api/auth/signup
{
  "officer_name": "Test User",
  "email": "test@example.com",
  "password": "Test1234",
  "vendor_name": "Test Vendor",
  "address": "Test Address",
  "phone_number": "08123456789"
}

# Expected:
✅ User created in database
✅ Session created in database
✅ JWT cookie set in browser
✅ Response: { sessionCreated: true, redirectTo: "/verification-pending" }
✅ Frontend redirects to /verification-pending
✅ User can access /verification-pending immediately
```

### Test Case 2: Registration with Session Failure
```bash
# Jika session creation gagal (database error, etc)

# Expected:
✅ User created in database
❌ Session NOT created
✅ Response: { sessionCreated: false, redirectTo: "/login" }
✅ Frontend attempts auto-login
✅ If auto-login success → redirect to /verification-pending
✅ If auto-login fails → show error, redirect to /login after 2s
```

### Test Case 3: Middleware Validation
```bash
# User dengan session baru akses /verification-pending

# Middleware checks:
1. Cookie ada? ✅
2. JWT valid? ✅
3. sessionToken di JWT? ✅
4. Session di database? ✅
5. Session not expired? ✅
6. User active? ✅
7. User verified? ❌ (belum verified)

# Result: ✅ Allow access to /verification-pending
```

## Error Handling

### Scenario 1: Session Creation Failed
```typescript
// Backend tetap return success registration
// Frontend fallback ke auto-login
// User tetap bisa akses dengan login manual
```

### Scenario 2: Cookie Not Set
```typescript
// Frontend check sessionCreated flag
// Jika false, attempt signIn()
// Jika signIn gagal, redirect ke /login
```

### Scenario 3: Session Invalid
```typescript
// Middleware validate session
// Jika invalid, clear cookie & redirect /login
// User harus login manual
```

## Migration Notes

### Before:
```
Register → Success → Manual Login → /verification-pending
```

### After:
```
Register → Success → Auto Session → /verification-pending
         └→ (fallback) → Auto Login → /verification-pending
```

## Database Schema

Session table sudah ada dan digunakan:
```prisma
model Session {
  id              String   @id @default(cuid())
  sessionToken    String   @unique
  userId          String
  expires         DateTime
  createdAt       DateTime?
  lastActivityAt  DateTime?
  ipAddress       String?
  userAgent       String?
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Monitoring

Check session creation di logs:
```bash
# Successful session creation
📝 Creating session for new user: user@example.com
✅ Session created for new user: abc123def4...
✅ New vendor registered: user@example.com (Vendor Name)

# Failed session creation
📝 Creating session for new user: user@example.com
❌ Failed to create session for new user: [error details]
✅ New vendor registered: user@example.com (Vendor Name)
```

Check database:
```sql
-- List recent sessions
SELECT s.*, u.email, u.vendor_name 
FROM Session s
JOIN User u ON s.userId = u.id
WHERE s.createdAt > NOW() - INTERVAL 1 HOUR
ORDER BY s.createdAt DESC;
```

## Troubleshooting

### Problem: User tidak redirect ke /verification-pending
**Diagnosis:**
1. Check browser console untuk error
2. Check network tab: apakah cookie di-set?
3. Check server logs: apakah session created?

**Solution:**
- Clear browser cookies
- Coba login manual
- Check NEXTAUTH_SECRET di .env

### Problem: Session expired immediately
**Diagnosis:**
1. Check JWT expiry time
2. Check database session expires
3. Check middleware validation

**Solution:**
- Verify SESSION_MAX_AGE config
- Check server time vs database time
- Review middleware validation logic

---

**Status:** ✅ Implemented & Tested
**Date:** October 23, 2025
