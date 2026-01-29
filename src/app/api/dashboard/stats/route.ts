import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';
import { withCache, withUserCache } from '@/lib/cache/apiCache';
import { CacheKeys, CacheTTL } from '@/lib/cache/cache';
import { dashboardService } from '@/services/DashboardService';

/**
 * Unified Dashboard Stats API
 * Returns appropriate statistics based on user role
 * 
 * Supports: VISITOR, VENDOR, REVIEWER, APPROVER, VERIFIER, ADMIN, SUPER_ADMIN
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, id: userId } = session.user;

    // Route to appropriate stats based on role
    switch (role) {
      case 'VISITOR':
        return await getVisitorStats();

      case 'VENDOR':
        return await getVendorStats(userId);

      case 'REVIEWER':
        return await getReviewerStats(role);

      case 'APPROVER':
        return await getApproverStats();

      case 'VERIFIER':
        return await getVerifierStats(userId);

      case 'ADMIN':
      case 'SUPER_ADMIN':
        return await getAdminStats(role);

      default:
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (error) {
    console.error('[DASHBOARD_STATS]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function getVisitorStats() {
  const { data: stats, cached } = await withCache(
    CacheKeys.VISITOR_STATS,
    CacheTTL.FIVE_MINUTES,
    async () => {
      return await dashboardService.getVisitorStats();
    }
  );

  return NextResponse.json(stats, {
    headers: { 'X-Cache': cached ? 'HIT' : 'MISS' }
  });
}

async function getVendorStats(userId: string) {
  const { data: stats, cached } = await withUserCache(
    'vendor:stats',
    userId,
    CacheTTL.ONE_MINUTE,
    async () => {
      return await dashboardService.getSubmissionStats(userId, 'VENDOR');
    }
  );

  return NextResponse.json({ statistics: stats }, {
    headers: { 'X-Cache': cached ? 'HIT' : 'MISS' }
  });
}

async function getReviewerStats(role: string) {
  const { data: stats, cached } = await withCache(
    CacheKeys.REVIEWER_STATS,
    CacheTTL.ONE_MINUTE,
    async () => {
      return await dashboardService.getReviewerStats(role);
    }
  );

  return NextResponse.json(stats, {
    headers: { 'X-Cache': cached ? 'HIT' : 'MISS' }
  });
}

async function getApproverStats() {
  const { data: stats, cached } = await withCache(
    CacheKeys.APPROVER_STATS,
    CacheTTL.ONE_MINUTE,
    async () => {
      return await dashboardService.getApproverStats();
    }
  );

  return NextResponse.json(stats, {
    headers: { 'X-Cache': cached ? 'HIT' : 'MISS' }
  });
}

async function getVerifierStats(userId: string) {
  const { data: stats, cached } = await withUserCache(
    'verifier:stats',
    userId,
    CacheTTL.ONE_MINUTE * 2,
    async () => {
      return await dashboardService.getVerifierStats(userId);
    }
  );

  return NextResponse.json(stats, {
    headers: { 'X-Cache': cached ? 'HIT' : 'MISS' }
  });
}

async function getAdminStats(role: string) {
  const stats = await dashboardService.getAdminStats(role);

  return NextResponse.json({
    totalUsers: stats.users.total,
    totalPending: stats.users.pending,
    totalVerified: stats.users.verified,
    totalRejected: stats.users.rejected,
    todayRegistrations: stats.users.todayRegistrations,
    recentUsers: stats.recentUsers,
    pendingVerifications: stats.users.pending,
  });
}
