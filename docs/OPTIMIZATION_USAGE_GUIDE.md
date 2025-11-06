# Optimization Utilities - Usage Guide

Quick reference for using the optimization libraries in your API endpoints.

---

## 📚 Import Examples

### Basic Response Caching
```typescript
import { 
  responseCache, 
  CacheTTL, 
  CacheTags, 
  generateCacheKey 
} from '@/lib/response-cache';
```

### Database Query Optimization
```typescript
import { 
  submissionSelectList,
  submissionSelectDetail,
  userSelectMinimal,
  getPaginationParams,
  buildRoleBasedWhereClause,
  parallelQueries,
  batchCreateWithRetry,
} from '@/lib/db-optimizer';
```

### Connection Pool & Transactions
```typescript
import { 
  withTransaction,
  batchOperation,
  checkDatabaseConnection,
} from '@/lib/connection-pool';
```

---

## 🎯 Common Patterns

### Pattern 1: Cached GET Endpoint (List View)

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Generate cache key from request params
  const cacheKey = generateCacheKey('my-entity-list', {
    userId: session.user.id,
    role: session.user.role,
    page: request.nextUrl.searchParams.get('page'),
  });
  
  // Try cache first
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return cached; // Return cached response
  }
  
  // Fetch from database with optimized select
  const items = await prisma.myEntity.findMany({
    select: submissionSelectList, // Only needed fields
    where: buildRoleBasedWhereClause(session.user.role, session.user.id),
    ...getPaginationParams(page, limit),
  });
  
  const response = NextResponse.json({ items });
  
  // Cache the response
  responseCache.set(
    cacheKey,
    response,
    CacheTTL.MEDIUM, // 1 minute
    [CacheTags.SUBMISSIONS, `user:${session.user.id}`]
  );
  
  return response;
}
```

### Pattern 2: Cached GET Endpoint (Detail View)

```typescript
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  const cacheKey = generateCacheKey('my-entity-detail', { id });
  
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const item = await prisma.myEntity.findUnique({
    where: { id },
    select: submissionSelectDetail, // All fields for detail view
  });
  
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  const response = NextResponse.json({ item });
  
  responseCache.set(
    cacheKey,
    response,
    CacheTTL.LONG, // 5 minutes
    [CacheTags.SUBMISSION_DETAIL, `submission:${id}`]
  );
  
  return response;
}
```

### Pattern 3: POST with Cache Invalidation

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await request.json();
  
  // Create entity
  const item = await prisma.myEntity.create({
    data: {
      ...body,
      user_id: session.user.id,
    },
  });
  
  // Batch create related documents
  if (body.documents?.length > 0) {
    await prisma.document.createMany({
      data: body.documents.map(doc => ({
        ...doc,
        entity_id: item.id,
      })),
      skipDuplicates: true,
    });
  }
  
  // Async notification (non-blocking)
  notifyAdmin(item.id).catch(err => 
    console.error('Notification failed:', err)
  );
  
  // Invalidate related caches
  responseCache.invalidateByTags([
    CacheTags.SUBMISSIONS,
    CacheTags.SUBMISSION_STATS,
    CacheTags.DASHBOARD,
    `user:${session.user.id}`,
  ]);
  
  return NextResponse.json({ item }, { status: 201 });
}
```

### Pattern 4: PATCH/PUT with Cache Invalidation

```typescript
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const body = await request.json();
  
  // Update entity
  const updated = await prisma.myEntity.update({
    where: { id },
    data: body,
  });
  
  // Invalidate caches
  responseCache.invalidateByTags([
    CacheTags.SUBMISSIONS,
    CacheTags.SUBMISSION_DETAIL,
    `submission:${id}`,
    `user:${updated.user_id}`,
    CacheTags.DASHBOARD,
  ]);
  
  return NextResponse.json({ item: updated });
}
```

### Pattern 5: Dashboard Stats with Parallel Queries

```typescript
export async function GET() {
  const session = await getServerSession(authOptions);
  
  const cacheKey = generateCacheKey('dashboard-stats', {
    role: session.user.role,
  });
  
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Run multiple queries in parallel
  const [
    totalUsers,
    totalSubmissions,
    pendingCount,
    approvedCount,
  ] = await parallelQueries([
    () => prisma.user.count(),
    () => prisma.submission.count(),
    () => prisma.submission.count({ 
      where: { approval_status: 'PENDING_APPROVAL' } 
    }),
    () => prisma.submission.count({ 
      where: { approval_status: 'APPROVED' } 
    }),
  ]);
  
  const response = NextResponse.json({
    totalUsers,
    totalSubmissions,
    pendingCount,
    approvedCount,
  });
  
  // Cache for longer (stats change less frequently)
  responseCache.set(
    cacheKey,
    response,
    CacheTTL.VERY_LONG, // 15 minutes
    [CacheTags.DASHBOARD]
  );
  
  return response;
}
```

### Pattern 6: Transaction with Retry

```typescript
import { withTransaction } from '@/lib/connection-pool';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = await withTransaction(async (tx) => {
    // Create parent
    const parent = await tx.submission.create({
      data: {
        ...body.submission,
      },
    });
    
    // Create children in same transaction
    await tx.worker.createMany({
      data: body.workers.map(w => ({
        ...w,
        submission_id: parent.id,
      })),
    });
    
    return parent;
  });
  
  // Invalidate cache
  responseCache.invalidateByTags([CacheTags.SUBMISSIONS]);
  
  return NextResponse.json({ result });
}
```

### Pattern 7: Batch Operations

```typescript
import { batchOperation } from '@/lib/connection-pool';

// Process items in batches of 100
const results = await batchOperation(
  largeArrayOfItems,
  async (batch) => {
    return await prisma.myEntity.createMany({
      data: batch,
      skipDuplicates: true,
    });
  },
  100 // batch size
);
```

---

## 🏷️ Available Cache Tags

Use these tags for cache invalidation:

```typescript
CacheTags.SUBMISSIONS         // All submission lists
CacheTags.SUBMISSION_DETAIL   // Individual submission details
CacheTags.SUBMISSION_STATS    // Submission statistics
CacheTags.USER                // User data
CacheTags.NOTIFICATIONS       // Notification lists
CacheTags.DASHBOARD           // Dashboard stats
CacheTags.APPROVER_STATS      // Approver statistics
CacheTags.REVIEWER_STATS      // Reviewer statistics
CacheTags.VENDOR_STATS        // Vendor statistics

// Dynamic tags
`user:${userId}`              // User-specific data
`submission:${submissionId}`  // Specific submission
```

---

## ⏱️ Cache TTL Guidelines

Choose appropriate TTL based on data volatility:

```typescript
CacheTTL.SHORT       // 30 seconds  - Frequently changing data
CacheTTL.MEDIUM      // 1 minute    - List views, moderate changes
CacheTTL.LONG        // 5 minutes   - Detail views, infrequent changes
CacheTTL.VERY_LONG   // 15 minutes  - Statistics, rare changes
```

---

## 🔍 Field Selectors

Use these to reduce data transfer:

```typescript
// Minimal user info (id, name, email, vendor)
select: { user: { select: userSelectMinimal } }

// List view (excludes support_documents, heavy text fields)
select: submissionSelectList

// Detail view (includes all fields)
select: submissionSelectDetail
```

---

## 🚫 Common Mistakes to Avoid

### ❌ Don't: Fetch all fields in list views
```typescript
const submissions = await prisma.submission.findMany({
  include: {
    user: true,
    worker_list: true,
    support_documents: true, // Heavy!
  }
});
```

### ✅ Do: Use optimized selectors
```typescript
const submissions = await prisma.submission.findMany({
  select: submissionSelectList, // Minimal fields only
});
```

---

### ❌ Don't: Block response with notifications
```typescript
await notifyUser(userId, message); // Blocks!
return response;
```

### ✅ Do: Fire and forget
```typescript
notifyUser(userId, message).catch(err => console.error(err));
return response; // Returns immediately
```

---

### ❌ Don't: Sequential queries
```typescript
const total = await prisma.submission.count();
const pending = await prisma.submission.count({ 
  where: { approval_status: 'PENDING' } 
});
```

### ✅ Do: Parallel queries
```typescript
const [total, pending] = await parallelQueries([
  () => prisma.submission.count(),
  () => prisma.submission.count({ where: { approval_status: 'PENDING' } }),
]);
```

---

### ❌ Don't: Forget cache invalidation
```typescript
await prisma.submission.update({ where: { id }, data: body });
return response; // Stale cache!
```

### ✅ Do: Invalidate after mutations
```typescript
await prisma.submission.update({ where: { id }, data: body });
responseCache.invalidateByTags([
  CacheTags.SUBMISSIONS,
  `submission:${id}`,
]);
return response;
```

---

## 🧪 Testing Cache

### Check if cache is working:

```typescript
// First request - should be MISS
const response1 = await fetch('/api/submissions');
console.log(response1.headers.get('X-Cache')); // MISS

// Second request - should be HIT
const response2 = await fetch('/api/submissions');
console.log(response2.headers.get('X-Cache')); // HIT
```

### Verify cache invalidation:

```typescript
// Create new submission
await fetch('/api/submissions', { method: 'POST', body: data });

// Next list request should be MISS (cache invalidated)
const response = await fetch('/api/submissions');
console.log(response.headers.get('X-Cache')); // MISS
```

---

## 📊 Monitoring

### Check cache statistics:

```typescript
import { responseCache } from '@/lib/response-cache';

// Get cache stats
const stats = responseCache.getStats();
console.log(`Cache size: ${stats.size}/${stats.maxSize}`);
console.log(`Hit ratio: ${stats.hitRatio}%`);
```

### Monitor slow queries:

Check console logs for:
```
⚠️ Slow query detected (1234ms): SELECT * FROM ...
```

---

## 🔧 Debugging Tips

### Enable verbose cache logging:

In `src/lib/response-cache.ts`, uncomment debug logs:
```typescript
console.log('✅ Cache HIT:', key);
console.log('❌ Cache MISS:', key);
console.log('🗑️ Invalidated:', count, 'entries with tag:', tag);
```

### Check what's in cache:

```typescript
import { responseCache } from '@/lib/response-cache';

// Log all cache keys
console.log('Current cache keys:', Array.from(responseCache['cache'].keys()));
```

### Force cache clear:

```typescript
// Clear specific tags
responseCache.invalidateByTags([CacheTags.SUBMISSIONS]);

// Clear everything (for testing)
responseCache['cache'].clear();
```

---

## 📝 Quick Checklist

When creating a new API endpoint:

- [ ] Add response caching for GET requests
- [ ] Use optimized field selectors (`submissionSelectList`, etc.)
- [ ] Invalidate cache after POST/PATCH/DELETE
- [ ] Make notifications async (fire-and-forget)
- [ ] Use parallel queries for independent operations
- [ ] Add appropriate cache tags
- [ ] Choose correct TTL based on data volatility
- [ ] Test cache hit/miss with X-Cache header
- [ ] Verify cache invalidation works

---

## 🆘 Need Help?

Check the full documentation:
- [API_OPTIMIZATION_SUMMARY.md](./API_OPTIMIZATION_SUMMARY.md) - Complete optimization guide
- [response-cache.ts](../src/lib/response-cache.ts) - Cache implementation
- [db-optimizer.ts](../src/lib/db-optimizer.ts) - Query optimization utilities
- [connection-pool.ts](../src/lib/connection-pool.ts) - Transaction and batch operations
