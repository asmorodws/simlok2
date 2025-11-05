# 🚀 Performance Optimization - Implementation Plan

## Priority Matrix

| Priority | Task | Impact | Effort | Risk |
|----------|------|--------|--------|------|
| P0 (Critical) | Add database indexes | VERY HIGH | LOW | LOW |
| P0 (Critical) | Fix race condition in approval | VERY HIGH | MEDIUM | MEDIUM |
| P0 (Critical) | Atomic SIMLOK number generation | VERY HIGH | MEDIUM | LOW |
| P0 (Critical) | Remove `ignoreBuildErrors` | HIGH | LOW | LOW |
| P1 (High) | Optimize query patterns (groupBy) | HIGH | MEDIUM | LOW |
| P1 (High) | Implement Redis caching | HIGH | HIGH | MEDIUM |
| P1 (High) | Configure connection pool | MEDIUM | LOW | LOW |
| P2 (Medium) | Component optimization (memo) | MEDIUM | MEDIUM | LOW |
| P2 (Medium) | Virtual scrolling for tables | MEDIUM | MEDIUM | LOW |
| P2 (Medium) | Code splitting | MEDIUM | LOW | LOW |
| P3 (Low) | Bundle optimization | LOW | MEDIUM | LOW |
| P3 (Low) | Image optimization | LOW | LOW | LOW |

---

## Week 1: Critical Database & Race Condition Fixes

### Day 1: Database Indexes

#### Migration File
```prisma
// prisma/migrations/YYYYMMDDHHMMSS_add_performance_indexes/migration.sql

-- Submission indexes
CREATE INDEX idx_submission_user_id ON Submission(user_id);
CREATE INDEX idx_submission_vendor_name ON Submission(vendor_name);
CREATE INDEX idx_submission_simlok_number ON Submission(simlok_number);
CREATE INDEX idx_submission_user_approval ON Submission(user_id, approval_status);
CREATE INDEX idx_submission_created_approval ON Submission(created_at, approval_status);

-- User indexes
CREATE INDEX idx_user_verification_status ON User(verification_status);
CREATE INDEX idx_user_active_role ON User(isActive, role);
CREATE INDEX idx_user_role_verification ON User(role, verification_status);

-- Session indexes (already exist, verify)
-- CREATE INDEX idx_session_expires ON Session(expires);
-- CREATE INDEX idx_session_last_activity ON Session(lastActivityAt);
```

#### Schema Update
```prisma
// prisma/schema.prisma

model Submission {
  // ... existing fields ...
  
  @@index([review_status])
  @@index([approval_status])
  @@index([created_at])
  @@index([approved_by_final_id])
  @@index([user_id])                    // NEW
  @@index([vendor_name])                // NEW
  @@index([simlok_number])              // NEW
  @@index([user_id, approval_status])   // NEW
  @@index([created_at, approval_status]) // NEW
}

model User {
  // ... existing fields ...
  
  @@index([verification_status])        // NEW
  @@index([isActive, role])             // NEW
  @@index([role, verification_status])  // NEW
}
```

#### Testing
```bash
# 1. Create migration
npx prisma migrate dev --name add_performance_indexes

# 2. Test query performance
# Compare BEFORE/AFTER with EXPLAIN
```

---

### Day 2: Optimistic Locking for Submissions

#### Schema Update
```prisma
// Add version field
model Submission {
  // ... existing fields ...
  version Int @default(0)  // NEW - for optimistic locking
  
  @@index([review_status])
  // ... other indexes ...
}
```

#### Migration
```bash
npx prisma migrate dev --name add_submission_version_field
```

#### Update Approval API
```typescript
// src/app/api/submissions/[id]/approve/route.ts

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // IMPORTANT: Client must send current version
    const { version, ...updateData } = body;
    
    if (typeof version !== 'number') {
      return NextResponse.json(
        { error: 'Version field is required for concurrent update protection' },
        { status: 400 }
      );
    }

    try {
      // Optimistic lock: update only if version matches
      const updated = await prisma.submission.update({
        where: { 
          id,
          version  // This ensures only current version can update
        },
        data: {
          ...updateData,
          version: { increment: 1 },  // Increment version
          approved_at: new Date(),
          approved_by_final_id: session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              officer_name: true,
              vendor_name: true,
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        submission: formatSubmissionDates(updated)
      });

    } catch (error: any) {
      // P2025 = Record not found (version mismatch)
      if (error.code === 'P2025') {
        return NextResponse.json(
          { 
            error: 'CONFLICT',
            message: 'This submission was modified by another user. Please refresh and try again.',
            code: 'VERSION_CONFLICT'
          },
          { status: 409 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### Update Frontend Modal
```typescript
// src/components/approver/ApproverSubmissionDetailModal.tsx

const handleApprove = async () => {
  try {
    setIsSubmitting(true);

    const response = await fetch(`/api/submissions/${submission.id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: submission.version,  // SEND CURRENT VERSION
        approval_status: 'APPROVED',
        simlok_date: approvalData.simlok_date,
        simlok_number: approvalData.simlok_number,
        note_for_vendor: approvalData.note_for_vendor,
      }),
    });

    const data = await response.json();

    if (response.status === 409) {
      // Version conflict - another user already modified
      toast.error(data.message || 'Submission was modified by another user');
      
      // Refresh submission data
      await refetchSubmission();
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || 'Approval failed');
    }

    toast.success('Submission approved successfully');
    onClose();
    onSuccess?.();

  } catch (error) {
    console.error('Approval error:', error);
    toast.error('Failed to approve submission');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### Day 3: Atomic SIMLOK Number Generation

#### Create Sequence Table
```prisma
// prisma/schema.prisma

model SimlokSequence {
  year        Int @id
  last_number Int @default(0)
  updated_at  DateTime @updatedAt
}
```

#### Migration
```bash
npx prisma migrate dev --name add_simlok_sequence_table
```

#### Atomic Generator Function
```typescript
// src/lib/simlok-generator.ts - NEW FILE

import { prisma } from '@/lib/singletons';

/**
 * Generates next SIMLOK number atomically using database sequence
 * Thread-safe and prevents race conditions
 * 
 * @param year - Year for SIMLOK number (e.g., 2024)
 * @returns Generated SIMLOK number (e.g., "2024/0001/SMKT/OPR")
 */
export async function generateSimlokNumber(year: number): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    // Find or create sequence for year
    let sequence = await tx.simlokSequence.findUnique({
      where: { year }
    });

    if (!sequence) {
      // Create new sequence starting from 0
      sequence = await tx.simlokSequence.create({
        data: { year, last_number: 0 }
      });
    }

    // Atomic increment - this is the critical part that prevents race conditions
    const updated = await tx.simlokSequence.update({
      where: { year },
      data: { 
        last_number: { increment: 1 },
      },
    });

    // Format number with leading zeros
    const paddedNumber = String(updated.last_number).padStart(4, '0');
    
    return `${year}/${paddedNumber}/SMKT/OPR`;
  });
}

/**
 * Preview next SIMLOK number without incrementing sequence
 * Used for UI preview only
 * 
 * @param year - Year for SIMLOK number
 * @returns Next SIMLOK number that would be generated
 */
export async function previewNextSimlokNumber(year: number): Promise<string> {
  const sequence = await prisma.simlokSequence.findUnique({
    where: { year }
  });

  const nextNumber = (sequence?.last_number ?? 0) + 1;
  const paddedNumber = String(nextNumber).padStart(4, '0');
  
  return `${year}/${paddedNumber}/SMKT/OPR`;
}

/**
 * Get current SIMLOK sequence info for a year
 * Useful for admin dashboard
 */
export async function getSimlokSequenceInfo(year: number) {
  const sequence = await prisma.simlokSequence.findUnique({
    where: { year }
  });

  return {
    year,
    lastNumber: sequence?.last_number ?? 0,
    nextNumber: (sequence?.last_number ?? 0) + 1,
    updatedAt: sequence?.updated_at,
  };
}
```

#### Update Approval API to Use Atomic Generator
```typescript
// src/app/api/submissions/[id]/approve/route.ts

import { generateSimlokNumber } from '@/lib/simlok-generator';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // ... authentication checks ...

    const { id } = await params;
    const body = await request.json();
    
    // Generate SIMLOK number atomically
    const simlokNumber = await generateSimlokNumber(new Date().getFullYear());

    // Update submission
    const updated = await prisma.submission.update({
      where: { 
        id,
        version: body.version,
        approval_status: 'PENDING_APPROVAL'  // Ensure still pending
      },
      data: {
        approval_status: 'APPROVED',
        simlok_number: simlokNumber,  // Use atomic generated number
        simlok_date: new Date(body.simlok_date),
        approved_at: new Date(),
        approved_by_final_id: session.user.id,
        note_for_vendor: body.note_for_vendor,
        version: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true, submission: updated });

  } catch (error) {
    // Handle errors...
  }
}
```

#### Update Preview API
```typescript
// src/app/api/submissions/simlok/next-number/route.ts

import { previewNextSimlokNumber } from '@/lib/simlok-generator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const nextNumber = await previewNextSimlokNumber(year);

    return NextResponse.json({
      success: true,
      year,
      nextSimlokNumber: nextNumber,
    });

  } catch (error) {
    console.error('Error generating next SIMLOK number:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Day 4: Remove ignoreBuildErrors & Fix TypeScript

```typescript
// next.config.ts

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.w3schools.com',
        pathname: '/howto/**',
      },
    ],
  },
  
  // ✅ FIXED: Enforce TypeScript checking
  typescript: {
    ignoreBuildErrors: false,  // Changed from true
  },
  
  // ... rest of config
};
```

```bash
# Find all TypeScript errors
npx tsc --noEmit

# Fix errors one by one
# Common issues:
# - Missing type annotations
# - Unused variables
# - Incorrect type assignments
# - Missing null checks
```

---

### Day 5: Optimize Query Patterns (groupBy)

#### Before: Dashboard Stats (Multiple Queries)
```typescript
// src/app/api/dashboard/stats/route.ts - BEFORE

const totalPending = await prisma.user.count({
  where: { verification_status: 'PENDING' }
});

const totalVerified = await prisma.user.count({
  where: { verification_status: 'VERIFIED' }
});

const totalRejected = await prisma.user.count({
  where: { verification_status: 'REJECTED' }
});

// ❌ 3 separate database queries
```

#### After: Single groupBy Query
```typescript
// src/app/api/dashboard/stats/route.ts - AFTER

const verificationStats = await prisma.user.groupBy({
  by: ['verification_status'],
  where: { isActive: true },
  _count: { id: true },
});

// Convert to object for easier access
const stats = verificationStats.reduce((acc, curr) => {
  acc[curr.verification_status] = curr._count.id;
  return acc;
}, {} as Record<string, number>);

const totalPending = stats.PENDING || 0;
const totalVerified = stats.VERIFIED || 0;
const totalRejected = stats.REJECTED || 0;

// ✅ Only 1 database query - 3x faster
```

#### Vendor Dashboard Stats
```typescript
// src/app/api/vendor/dashboard/stats/route.ts - AFTER

async function fetchVendorStats(userId: string) {
  // Single groupBy query instead of 3+ separate counts
  const [statusStats, totalQrScans] = await Promise.all([
    prisma.submission.groupBy({
      by: ['approval_status'],
      where: { user_id: userId },
      _count: { id: true },
    }),
    prisma.qrScan.count({
      where: {
        submission: { user_id: userId }
      }
    })
  ]);

  const stats = statusStats.reduce((acc, curr) => {
    acc[curr.approval_status] = curr._count.id;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalSubmissions: Object.values(stats).reduce((sum, count) => sum + count, 0),
    approvedCount: stats.APPROVED || 0,
    pendingCount: stats.PENDING_APPROVAL || 0,
    rejectedCount: stats.REJECTED || 0,
    totalQrScans,
  };
}
```

---

## Week 2: Redis Caching Implementation

### Day 1: Setup Redis Cache Wrapper

```typescript
// src/lib/redis-cache.ts - NEW FILE

import { redisPub as redis } from '@/lib/singletons';

export class RedisCache {
  /**
   * Get value from Redis cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in Redis cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete specific cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Redis DELETE error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache by pattern (e.g., "user:*")
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error(`Redis INVALIDATE error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Invalidate multiple patterns at once
   */
  async invalidateMultiple(patterns: string[]): Promise<void> {
    try {
      const allKeysArrays = await Promise.all(
        patterns.map(pattern => redis.keys(pattern))
      );
      
      const keys = allKeysArrays.flat();
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis INVALIDATE MULTIPLE error:', error);
    }
  }

  /**
   * Wrapper for cache-aside pattern
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<{ data: T; cached: boolean }> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return { data: cached, cached: true };
    }

    // Cache miss - fetch fresh data
    const data = await fetchFn();

    // Store in cache
    await this.set(key, data, ttlSeconds);

    return { data, cached: false };
  }
}

export const redisCache = new RedisCache();

/**
 * Cache key builders
 */
export const CacheKeys = {
  // Dashboard stats
  dashboardStats: (role: string) => `dashboard:${role}:stats`,
  
  // Submissions
  submission: (id: string) => `submission:${id}`,
  submissionList: (userId: string, page: number, filters: string) => 
    `submissions:${userId}:${page}:${filters}`,
  
  // User stats
  userStats: (userId: string) => `user:${userId}:stats`,
  
  // QR Scans
  qrScans: (submissionId: string) => `qr:scans:${submissionId}`,
  
  // Notifications
  notifications: (userId: string, page: number) => 
    `notifications:${userId}:${page}`,
} as const;

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  TEN_MINUTES: 600,
  THIRTY_MINUTES: 1800,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
} as const;
```

### Day 2-3: Implement Caching in API Routes

```typescript
// src/app/api/dashboard/approver-stats/route.ts - WITH REDIS

import { redisCache, CacheKeys, CacheTTL } from '@/lib/redis-cache';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Use Redis cache
    const { data: dashboardStats, cached } = await redisCache.remember(
      CacheKeys.dashboardStats('approver'),
      CacheTTL.ONE_MINUTE,
      async () => {
        return await fetchApproverStats();
      }
    );

    return NextResponse.json(dashboardStats, {
      headers: {
        'X-Cache': cached ? 'HIT' : 'MISS',
        'Cache-Control': 'private, max-age=60',
      }
    });

  } catch (error) {
    console.error("[APPROVER_DASHBOARD_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
```

### Day 4: Cache Invalidation Strategy

```typescript
// src/lib/cache-invalidation.ts - NEW FILE

import { redisCache, CacheKeys } from '@/lib/redis-cache';

/**
 * Invalidate all caches related to a submission update
 */
export async function invalidateSubmissionCaches(
  submissionId: string,
  userId?: string
) {
  const patterns = [
    `dashboard:*:stats`,              // All dashboard stats
    CacheKeys.submission(submissionId), // Specific submission
    userId ? `submissions:${userId}:*` : 'submissions:*', // Submission lists
  ];

  await redisCache.invalidateMultiple(patterns);
}

/**
 * Invalidate user-related caches
 */
export async function invalidateUserCaches(userId: string) {
  const patterns = [
    CacheKeys.userStats(userId),
    `submissions:${userId}:*`,
    `notifications:${userId}:*`,
  ];

  await redisCache.invalidateMultiple(patterns);
}

/**
 * Invalidate notification caches
 */
export async function invalidateNotificationCaches(userId: string) {
  const patterns = [
    `notifications:${userId}:*`,
  ];

  await redisCache.invalidateMultiple(patterns);
}
```

```typescript
// Usage in API routes

// After approving submission:
export async function PATCH(request: NextRequest, { params }: any) {
  // ... approval logic ...

  const updated = await prisma.submission.update({ ... });

  // Invalidate caches
  await invalidateSubmissionCaches(updated.id, updated.user_id);

  return NextResponse.json(updated);
}
```

---

## Testing Checklist

### Database Indexes
- [ ] Run EXPLAIN on submission list query
- [ ] Verify query time reduced by >5x
- [ ] Check index usage with `SHOW INDEX FROM Submission`

### Optimistic Locking
- [ ] Test concurrent approval (2 users, same submission)
- [ ] Verify version conflict error returned
- [ ] Verify UI shows conflict message

### Atomic SIMLOK Generation
- [ ] Test concurrent approvals (2+ simultaneous)
- [ ] Verify no duplicate SIMLOK numbers
- [ ] Verify sequence increments correctly

### Redis Caching
- [ ] Verify cache HIT on second request
- [ ] Verify cache invalidation after update
- [ ] Test horizontal scaling (multiple Next.js instances)

---

## Rollback Plan

If issues occur:

1. **Database Indexes**: Safe to keep, only improve performance
2. **Optimistic Locking**: Can revert migration, remove version field
3. **Atomic SIMLOK**: Can revert to old logic, delete sequence table
4. **Redis Cache**: Can fall back to in-memory cache
5. **TypeScript Fixes**: Can temporarily re-enable `ignoreBuildErrors`

---

## Success Metrics

Track before/after:

```typescript
// Performance tracking middleware
// src/middleware/performance-tracker.ts

export function trackPerformance() {
  const metrics = {
    apiResponseTimes: [],
    cacheHitRate: 0,
    dbQueryTimes: [],
  };

  // Log to monitoring service (e.g., Sentry, DataDog)
}
```

Expected improvements:
- API response time: 300ms → 50-100ms (3-6x faster)
- Dashboard load: 2-3s → 800ms-1s (3x faster)
- Cache hit rate: 40% → 80% (2x better)
- Concurrent users: 30 → 200+ (6x more)

---

## Next Steps After Week 1

1. Review metrics and adjust caching TTLs
2. Implement Week 2 optimizations (Component, Bundle)
3. Load testing with k6 or Artillery
4. Set up monitoring dashboards
5. Document lessons learned
