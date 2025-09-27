/**
 * Dashboard Service
 * 
 * Centralizes all dashboard statistics and aggregation logic.
 * This service layer isolates business logic from API controllers
 * and implements comprehensive caching for performance optimization.
 * 
 * Benefits:
 * - Single source of truth for dashboard data
 * - Consistent caching across admin and vendor dashboards
 * - Easy to test and mock
 * - Performance optimized with Redis cache
 */

import { submissionRepository } from '@/server/repositories/submission/SubmissionRepository';
import { userRepository } from '@/server/repositories/user/UserRepository';
import { Cache, CacheNamespaces, CacheTTL } from '@/lib/cache';
import { prisma } from '@/lib/singletons';

export interface AdminDashboardStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalVendors: number;
  totalVerifiers: number;
  totalAdmins: number;
  pendingVerificationVendors: number;
  
  // Review workflow stats
  pendingReview: number;
  meetsRequirements: number;
  notMeetsRequirements: number;
  pendingApproval: number;
}

export interface VendorDashboardStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  
  // Review workflow stats for vendor
  pendingReview: number;
  inReview: number;
  pendingApproval: number;
}

export interface ReviewerDashboardStats {
  pendingReview: number;
  meetsRequirements: number;
  notMeetsRequirements: number;
  total: number;
  todayReviewed: number;
}

export interface ApproverDashboardStats {
  pendingApproval: number;
  approved: number;
  rejected: number;
  total: number;
  todayApproved: number;
}

export class DashboardService {
  private readonly CACHE_TTL = CacheTTL.MEDIUM; // 5 minutes

  /**
   * Get comprehensive admin dashboard statistics
   */
  async getAdminStats(): Promise<AdminDashboardStats> {
    const cacheKey = 'admin_dashboard_stats';
    
    // Try to get from cache first
    const cached = await Cache.getJSON<AdminDashboardStats>(
      cacheKey, 
      { namespace: CacheNamespaces.STATS }
    );
    
    if (cached) {
      console.log('[DashboardService] Admin stats served from cache');
      return cached;
    }

    console.log('[DashboardService] Generating fresh admin stats');

    // Get submission statistics
    const submissionStats = await submissionRepository.getStatistics();

    // Get user statistics from multiple sources
    const [userCounts, reviewStats, approvalStats] = await Promise.all([
      this.getUserStatistics(),
      this.getReviewStatistics(),
      this.getApprovalStatistics()
    ]);

    const stats: AdminDashboardStats = {
      // Basic submission stats
      totalSubmissions: submissionStats.total,
      pendingSubmissions: submissionStats.pending,
      approvedSubmissions: submissionStats.approved,
      rejectedSubmissions: submissionStats.rejected,

      // User stats
      totalVendors: userCounts.vendors,
      totalVerifiers: userCounts.verifiers,
      totalAdmins: userCounts.admins,
      pendingVerificationVendors: userCounts.pendingVendors,

      // Review workflow stats
      pendingReview: reviewStats.pending,
      meetsRequirements: reviewStats.meets,
      notMeetsRequirements: reviewStats.notMeets,
      pendingApproval: approvalStats.pending
    };

    // Cache the results
    await Cache.setJSON(
      cacheKey,
      stats,
      { 
        namespace: CacheNamespaces.STATS,
        ttl: this.CACHE_TTL 
      }
    );

    console.log('[DashboardService] Admin stats cached for', this.CACHE_TTL, 'seconds');
    return stats;
  }

  /**
   * Get vendor-specific dashboard statistics
   */
  async getVendorStats(vendorId: string): Promise<VendorDashboardStats> {
    const cacheKey = `vendor_dashboard_stats_${vendorId}`;
    
    // Try to get from cache first
    const cached = await Cache.getJSON<VendorDashboardStats>(
      cacheKey,
      { namespace: CacheNamespaces.STATS }
    );
    
    if (cached) {
      console.log(`[DashboardService] Vendor stats for ${vendorId} served from cache`);
      return cached;
    }

    console.log(`[DashboardService] Generating fresh vendor stats for ${vendorId}`);

    // Get vendor-specific submission statistics
    const submissionStats = await submissionRepository.getStatistics(vendorId);

    // Get review workflow stats for this vendor
    const [reviewStats, approvalStats] = await Promise.all([
      this.getVendorReviewStats(vendorId),
      this.getVendorApprovalStats(vendorId)
    ]);
    
    const stats: VendorDashboardStats = {
      totalSubmissions: submissionStats.total,
      pendingSubmissions: submissionStats.pending,
      approvedSubmissions: submissionStats.approved,
      rejectedSubmissions: submissionStats.rejected,
      
      // Review workflow stats
      pendingReview: reviewStats.pending,
      inReview: reviewStats.inReview,
      pendingApproval: approvalStats.pending
    };

    // Cache the results
    await Cache.setJSON(
      cacheKey,
      stats,
      { 
        namespace: CacheNamespaces.STATS,
        ttl: this.CACHE_TTL 
      }
    );

    console.log(`[DashboardService] Vendor stats for ${vendorId} cached for`, this.CACHE_TTL, 'seconds');
    return stats;
  }

  /**
   * Get reviewer dashboard statistics
   */
  async getReviewerStats(): Promise<ReviewerDashboardStats> {
    const cacheKey = 'reviewer_dashboard_stats';
    
    const cached = await Cache.getJSON<ReviewerDashboardStats>(
      cacheKey,
      { namespace: CacheNamespaces.STATS }
    );
    
    if (cached) {
      console.log('[DashboardService] Reviewer stats served from cache');
      return cached;
    }

    console.log('[DashboardService] Generating fresh reviewer stats');

    const [reviewCounts, todayReviewed] = await Promise.all([
      this.getReviewStatistics(),
      this.getTodayReviewedCount()
    ]);

    const stats: ReviewerDashboardStats = {
      pendingReview: reviewCounts.pending,
      meetsRequirements: reviewCounts.meets,
      notMeetsRequirements: reviewCounts.notMeets,
      total: reviewCounts.pending + reviewCounts.meets + reviewCounts.notMeets,
      todayReviewed
    };

    await Cache.setJSON(
      cacheKey,
      stats,
      { 
        namespace: CacheNamespaces.STATS,
        ttl: this.CACHE_TTL 
      }
    );

    return stats;
  }

  /**
   * Get approver dashboard statistics  
   */
  async getApproverStats(): Promise<ApproverDashboardStats> {
    const cacheKey = 'approver_dashboard_stats';
    
    const cached = await Cache.getJSON<ApproverDashboardStats>(
      cacheKey,
      { namespace: CacheNamespaces.STATS }
    );
    
    if (cached) {
      console.log('[DashboardService] Approver stats served from cache');
      return cached;
    }

    console.log('[DashboardService] Generating fresh approver stats');

    const [approvalCounts, todayApproved] = await Promise.all([
      this.getApprovalStatistics(),
      this.getTodayApprovedCount()
    ]);

    const stats: ApproverDashboardStats = {
      pendingApproval: approvalCounts.pending,
      approved: approvalCounts.approved,
      rejected: approvalCounts.rejected,
      total: approvalCounts.pending + approvalCounts.approved + approvalCounts.rejected,
      todayApproved
    };

    await Cache.setJSON(
      cacheKey,
      stats,
      { 
        namespace: CacheNamespaces.STATS,
        ttl: this.CACHE_TTL 
      }
    );

    return stats;
  }

  /**
   * Invalidate dashboard cache for specific scope
   */
  async invalidateCache(scope?: 'admin' | 'vendor' | 'reviewer' | 'approver', vendorId?: string): Promise<void> {
    console.log(`[DashboardService] Invalidating cache for scope: ${scope || 'all'}`);

    if (scope === 'admin') {
      await Cache.del('admin_dashboard_stats', { namespace: CacheNamespaces.STATS });
    } else if (scope === 'vendor' && vendorId) {
      await Cache.del(`vendor_dashboard_stats_${vendorId}`, { namespace: CacheNamespaces.STATS });
    } else if (scope === 'reviewer') {
      await Cache.del('reviewer_dashboard_stats', { namespace: CacheNamespaces.STATS });
    } else if (scope === 'approver') {
      await Cache.del('approver_dashboard_stats', { namespace: CacheNamespaces.STATS });
    } else {
      // Invalidate all dashboard stats cache
      await Cache.invalidateByPrefix('dashboard_stats', CacheNamespaces.STATS);
    }
  }

  /**
   * Get user statistics breakdown by role using UserRepository
   */
  private async getUserStatistics() {
    const userStats = await userRepository.getStatsByRole();

    return {
      vendors: userStats.totalVendors,
      verifiers: userStats.totalVerifiers,
      admins: userStats.totalAdmins + userStats.totalReviewers + userStats.totalApprovers + userStats.totalSuperAdmins,
      pendingVendors: userStats.pendingVerifications
    };
  }

  /**
   * Get review workflow statistics
   */
  private async getReviewStatistics() {
    const reviewCounts = await prisma.submission.groupBy({
      by: ['review_status'],
      _count: {
        review_status: true
      }
    });

    return {
      pending: reviewCounts.find(r => r.review_status === 'PENDING_REVIEW')?._count.review_status || 0,
      meets: reviewCounts.find(r => r.review_status === 'MEETS_REQUIREMENTS')?._count.review_status || 0,
      notMeets: reviewCounts.find(r => r.review_status === 'NOT_MEETS_REQUIREMENTS')?._count.review_status || 0
    };
  }

  /**
   * Get approval workflow statistics
   */
  private async getApprovalStatistics() {
    const approvalCounts = await prisma.submission.groupBy({
      by: ['final_status'],
      _count: {
        final_status: true
      }
    });

    return {
      pending: approvalCounts.find(a => a.final_status === 'PENDING_APPROVAL')?._count.final_status || 0,
      approved: approvalCounts.find(a => a.final_status === 'APPROVED')?._count.final_status || 0,
      rejected: approvalCounts.find(a => a.final_status === 'REJECTED')?._count.final_status || 0
    };
  }

  /**
   * Get vendor-specific review statistics
   */
  private async getVendorReviewStats(vendorId: string) {
    const reviewCounts = await prisma.submission.groupBy({
      by: ['review_status'],
      where: { user_id: vendorId },
      _count: {
        review_status: true
      }
    });

    return {
      pending: reviewCounts.find(r => r.review_status === 'PENDING_REVIEW')?._count.review_status || 0,
      inReview: (reviewCounts.find(r => r.review_status === 'MEETS_REQUIREMENTS')?._count.review_status || 0) +
                (reviewCounts.find(r => r.review_status === 'NOT_MEETS_REQUIREMENTS')?._count.review_status || 0)
    };
  }

  /**
   * Get vendor-specific approval statistics
   */
  private async getVendorApprovalStats(vendorId: string) {
    const count = await prisma.submission.count({
      where: {
        user_id: vendorId,
        final_status: 'PENDING_APPROVAL'
      }
    });

    return { pending: count };
  }

  /**
   * Get count of submissions reviewed today
   */
  private async getTodayReviewedCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.submission.count({
      where: {
        reviewed_at: {
          gte: today,
          lt: tomorrow
        }
      }
    });
  }

  /**
   * Get count of submissions approved today
   */
  private async getTodayApprovedCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.submission.count({
      where: {
        approved_at: {
          gte: today,
          lt: tomorrow
        },
        final_status: {
          in: ['APPROVED', 'REJECTED']
        }
      }
    });
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();