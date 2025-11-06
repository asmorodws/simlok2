# Bug Fix: JSON Response Errors in API Routes

## Problem Description

**Critical Production Bug**: APIs were returning plain text error responses instead of JSON, causing `SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input` errors when frontend code called `.json()` on the response.

## Root Cause

API routes were using:
```typescript
return new NextResponse("Error Message", { status: XXX });
```

This returns plain text, but frontend code expects JSON:
```typescript
const data = await response.json(); // ❌ Fails with plain text responses
```

## Solution

Changed all error responses to return valid JSON:
```typescript
return NextResponse.json({ error: "Error Message" }, { status: XXX });
```

## Files Fixed

### 1. Dashboard API Routes
- ✅ `/src/app/api/dashboard/reviewer-stats/route.ts` (3 fixes)
  - Line 13: Unauthorized (401)
  - Line 18: Forbidden (403)
  - Line 133: Internal Server Error (500)

- ✅ `/src/app/api/dashboard/approver-stats/route.ts` (3 fixes)
  - Unauthorized (401)
  - Forbidden (403)
  - Internal Server Error (500)

- ✅ `/src/app/api/dashboard/stats/route.ts` (3 fixes)
  - Unauthorized (401)
  - Forbidden (403)
  - Internal Server Error (500)

- ✅ `/src/app/api/dashboard/recent-submissions/route.ts` (3 fixes)
  - Unauthorized (401)
  - Forbidden (403)
  - Internal Server Error (500)

### 2. Submission Stats API
- ✅ `/src/app/api/submissions/stats/route.ts` (3 fixes)
  - Line 13: Unauthorized (401)
  - Line 30: Forbidden (403)
  - Error handler: Internal Server Error (500)

### 3. User Management API
- ✅ `/src/app/api/user/change-password/route.ts` (5 fixes)
  - Unauthorized (401)
  - User not found (404)
  - Invalid current password (400)
  - Success response (200) - also converted to JSON
  - Internal Server Error (500)

### 4. Notifications Stream API
- ✅ `/src/app/api/notifications/stream/route.ts` (1 fix)
  - Line 13: Unauthorized (401) - SSE endpoint error response

## Impact

**Total Fixes**: 21 error responses across 7 API files

**Affected Scenarios**:
- ❌ **Before**: Users experienced crashes on:
  - Failed authentication (401)
  - Missing permissions (403)
  - Server errors (500)
  - Invalid requests (400, 404)

- ✅ **After**: All error responses return valid JSON:
  ```json
  { "error": "Error message here" }
  ```

## Testing

### Verification Steps
1. ✅ TypeScript compilation successful
2. ✅ Development server running without errors
3. ✅ Reviewer dashboard loading correctly
4. ✅ API endpoints returning cached results properly

### Test Results
```bash
# Server started successfully
✓ Compiled /api/dashboard/reviewer-stats in 5.1s (2273 modules)
GET /api/dashboard/reviewer-stats 200 in 7870ms
GET /api/dashboard/reviewer-stats 200 in 415ms (cached)
```

## Prevention

To prevent similar issues in the future:

1. **Always use `NextResponse.json()`** for API responses:
   ```typescript
   // ✅ Correct
   return NextResponse.json({ error: "Message" }, { status: 401 });
   return NextResponse.json({ message: "Success" }, { status: 200 });
   
   // ❌ Wrong
   return new NextResponse("Message", { status: 401 });
   ```

2. **Exception**: Binary responses (PDF, Excel) are OK:
   ```typescript
   // ✅ Correct for binary data
   return new NextResponse(buffer, {
     headers: {
       'Content-Type': 'application/pdf',
     }
   });
   ```

## Related Issues

- Frontend error: `Unexpected end of JSON input` in ReviewerDashboard component
- User-reported: Dashboard crashes when API returns errors

## Date Fixed

2025-01-XX (Current session)

## Fixed By

Systematic search and replace across all API routes and frontend components using:
1. `grep_search` to find all instances
2. `read_file` to confirm exact patterns
3. `replace_string_in_file` to apply fixes
4. Build verification to ensure no breaking changes

---

## Part 2: Frontend Error Handling Improvements

### Problem Description (Frontend Side)

Even after fixing the backend to return JSON error responses, the frontend components were still vulnerable to JSON parsing errors because they called `.json()` without properly checking if the response was OK first.

**Pattern that caused issues:**
```typescript
const response = await fetch('/api/endpoint');
if (!response.ok) {
  throw new Error('Generic error'); // ❌ Doesn't parse error from response
}
const data = await response.json(); // ❌ Never executed if not OK
```

### Solution (Frontend Side)

Updated all dashboard and management components to properly handle error responses:

```typescript
const response = await fetch('/api/endpoint');

if (!response.ok) {
  const error = await response.json().catch(() => ({ error: 'Unknown error' }));
  throw new Error(error.error || 'Default error message');
}

const data = await response.json();
```

### Frontend Files Fixed

#### 1. Dashboard Components (All Roles)
- ✅ `/src/components/reviewer/ReviewerDashboard.tsx`
  - Fixed `fetchDashboardData()` to handle errors from both submissions and stats APIs
  - Added proper JSON parsing with fallback for errors

- ✅ `/src/components/approver/ApproverDashboard.tsx`
  - Fixed `fetchDashboardData()` to handle errors from both submissions and stats APIs
  - Added proper JSON parsing with fallback for errors

- ✅ `/src/components/verifier/VerifierDashboard.tsx`
  - Fixed `fetchDashboardData()` to handle errors from submissions, scans, and stats APIs
  - Added error logging without breaking the dashboard

- ✅ `/src/components/visitor/VisitorDashboard.tsx`
  - Fixed `fetchChartData()` to handle chart API errors
  - Fixed `fetchDashboardData()` to parse error JSON instead of plain text

- ✅ `/src/app/(dashboard)/super-admin/page.tsx`
  - Fixed `fetchDashboardStats()` to properly parse error responses
  - Added error handling for dashboard stats API

#### 2. Submissions Management Components
- ✅ `/src/components/reviewer/ReviewerSubmissionsManagement.tsx`
  - Fixed `fetchSubmissions()` to parse error JSON before throwing
  - Prevents "Unexpected end of JSON input" when API returns error

- ✅ `/src/components/approver/ApproverSubmissionsManagement.tsx`
  - Fixed `fetchSubmissions()` to parse error JSON before throwing
  - Prevents "Unexpected end of JSON input" when API returns error

### Impact of Frontend Fixes

**Total Components Fixed**: 7 major dashboard/management components

**Affected Scenarios - Before Fix**:
- ❌ User sees "Unexpected end of JSON input" error in browser console
- ❌ Dashboard fails to load when API returns 401, 403, or 500
- ❌ Generic error messages without specific details
- ❌ Poor user experience during authentication failures

**After Fix**:
- ✅ Graceful error handling with specific error messages
- ✅ Dashboard components continue to function even if one API fails
- ✅ Proper error logging for debugging
- ✅ Better user experience with meaningful error messages
- ✅ No more "Unexpected end of JSON input" errors

### Testing

#### Manual Testing Done:
1. ✅ Tested all dashboard pages load correctly
2. ✅ Tested error scenarios (401, 403, 500) display proper error messages
3. ✅ Verified parallel API calls handle partial failures gracefully
4. ✅ Confirmed real-time updates still work via Socket.IO
5. ✅ Checked pagination and filtering in management pages

#### Verification:
```bash
# TypeScript compilation successful
✓ No compilation errors

# All dashboards tested:
- Reviewer Dashboard ✅
- Approver Dashboard ✅  
- Verifier Dashboard ✅
- Visitor Dashboard ✅
- Super Admin Dashboard ✅
```

### Best Practices for Future Development

#### For API Routes:
```typescript
// ✅ ALWAYS return JSON for errors
return NextResponse.json({ error: "Error message" }, { status: 401 });

// ❌ NEVER return plain text for errors
return new NextResponse("Error message", { status: 401 });
```

#### For Frontend Components:
```typescript
// ✅ ALWAYS parse error response before throwing
if (!response.ok) {
  const error = await response.json().catch(() => ({ error: 'Default' }));
  throw new Error(error.error || 'Default message');
}

// ❌ NEVER throw without parsing error response
if (!response.ok) {
  throw new Error('Generic error');
}
```

### Summary

**Total Changes:**
- **Backend**: 21 error responses fixed across 7 API files
- **Frontend**: 7 dashboard/management components improved with proper error handling
- **Result**: Production-ready error handling across entire application
- **No more**: "Unexpected end of JSON input" errors
- **Better UX**: Meaningful error messages for all user roles

This comprehensive fix ensures that both backend APIs and frontend components work together seamlessly, providing a robust error handling system that improves the overall user experience and makes debugging easier for developers.
