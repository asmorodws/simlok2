/**
 * Dashboard Service
 * Business logic for dashboard statistics and analytics
 */

import { prisma } from '@/lib/singletons';
import { logger } from '@/lib/logger';
import { UserRole } from '@/types/enums';

// ==================== TYPE DEFINITIONS ====================

export interface UserStats {
  totalUsers: number;
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
  todayRegistrations: number;
  recentUsers?: any[];
}

export interface SubmissionStats {
  total: number;
  byStatus: {
    PENDING: number;
    IN_REVIEW: number;
    APPROVED: number;
    REJECTED: number;
    REVISION_REQUIRED: number;
  };
  recentActivity: number;
  todaySubmissions: number;
}

export interface VerifierStats {
  totalScans: number;
  uniqueSubmissions: number;
  todayScans: number;
  recentScans?: any[];
}

// ==================== DASHBOARD SERVICE ====================

export class DashboardService {
  /**
   * Get user statistics for admin dashboard
   */
  static async getUserStats(userRole: UserRole, includeRecentUsers: boolean = false): Promise<UserStats> {
    try {
      // Determine user where clause based on role
      // SUPER_ADMIN can see all users, others cannot
      const userWhereClause = {};

      // Get total users count
      const totalUsers = await prisma.user.count({
        where: userWhereClause
      });

      // Get pending verifications count
      const totalPending = await prisma.user.count({
        where: {
          AND: [
            { verified_at: null },
            { verification_status: { notIn: ['VERIFIED', 'REJECTED'] } },
            { rejection_reason: null },
            userWhereClause
          ]
        }
      });

      // Get verified users count
      const totalVerified = await prisma.user.count({
        where: {
          AND: [
            {
              OR: [
                { verified_at: { not: null } },
                { verification_status: 'VERIFIED' }
              ]
            },
            userWhereClause
          ]
        }
      });

      // Get rejected users count
      const totalRejected = await prisma.user.count({
        where: {
          AND: [
            {
              OR: [
                { rejection_reason: { not: null } },
                { verification_status: 'REJECTED' }
              ]
            },
            userWhereClause
          ]
        }
      });

      // Get today's registrations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayRegistrations = await prisma.user.count({
        where: {
          AND: [
            {
              created_at: {
                gte: today,
                lt: tomorrow
              }
            },
            userWhereClause
          ]
        }
      });

      // Get recent users if requested
      let recentUsers;
      if (includeRecentUsers) {
        recentUsers = await prisma.user.findMany({
          where: userWhereClause,
          orderBy: { created_at: 'desc' },
          take: 5,
          select: {
            id: true,
            email: true,
            officer_name: true,
            vendor_name: true,
            phone_number: true,
            address: true,
            role: true,
            verified_at: true,
            verification_status: true,
            rejection_reason: true,
            rejected_at: true,
            created_at: true,
            isActive: true
          }
        });
      }

      logger.info('DashboardService', 'User statistics retrieved', {
        role: userRole,
        totalUsers,
        totalPending,
        totalVerified,
        totalRejected
      });

      return {
        totalUsers,
        totalPending,
        totalVerified,
        totalRejected,
        todayRegistrations,
        ...(recentUsers && { recentUsers })
      };
    } catch (error) {
      logger.error('DashboardService', 'Error fetching user statistics', error);
      throw error;
    }
  }

  /**
   * Get submission statistics for dashboard
   */
  static async getSubmissionStats(userRole: UserRole, userId?: string): Promise<SubmissionStats> {
    try {
      // Determine where clause based on user role
      let whereClause: any = {};
      
      if (userRole === UserRole.VENDOR) {
        if (!userId) {
          throw new Error('User ID required for vendor statistics');
        }
        whereClause = { user_id: userId };
      }
      // For other roles (REVIEWER, APPROVER, ADMIN, SUPER_ADMIN, VERIFIER), show all submissions

      // Get total submissions count
      const totalSubmissions = await prisma.submission.count({
        where: whereClause
      });

      // Get submissions by status
      const submissionsByStatus = await prisma.submission.groupBy({
        by: ['approval_status'],
        where: whereClause,
        _count: { id: true }
      });

      // Convert to readable format
      const statusStats = submissionsByStatus.reduce((acc, item) => {
        acc[item.approval_status] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      // Get recent activity (last 30 days) - Jakarta timezone
      const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const thirtyDaysAgo = new Date(jakartaNow);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentActivity = await prisma.submission.count({
        where: {
          ...whereClause,
          created_at: { gte: thirtyDaysAgo }
        }
      });

      // Get today's submissions (Jakarta timezone)
      const today = new Date(jakartaNow);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaySubmissions = await prisma.submission.count({
        where: {
          ...whereClause,
          created_at: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      logger.info('DashboardService', 'Submission statistics retrieved', {
        role: userRole,
        userId,
        total: totalSubmissions,
        today: todaySubmissions
      });

      return {
        total: totalSubmissions,
        byStatus: {
          PENDING: statusStats.PENDING || 0,
          IN_REVIEW: statusStats.IN_REVIEW || 0,
          APPROVED: statusStats.APPROVED || 0,
          REJECTED: statusStats.REJECTED || 0,
          REVISION_REQUIRED: statusStats.REVISION_REQUIRED || 0
        },
        recentActivity,
        todaySubmissions
      };
    } catch (error) {
      logger.error('DashboardService', 'Error fetching submission statistics', error);
      throw error;
    }
  }

  /**
   * Get verifier statistics
   */
  static async getVerifierStats(verifierId: string, includeRecentScans: boolean = false): Promise<VerifierStats> {
    try {
      // Get total scans by this verifier
      const totalScans = await prisma.qrScan.count({
        where: { scanned_by: verifierId }
      });

      // Get unique submissions scanned
      const uniqueSubmissions = await prisma.qrScan.groupBy({
        by: ['submission_id'],
        where: { scanned_by: verifierId },
        _count: { id: true }
      });

      // Get today's scans (Jakarta timezone)
      const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const today = new Date(jakartaNow);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayScans = await prisma.qrScan.count({
        where: {
          scanned_by: verifierId,
          scanned_at: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      // Get recent scans if requested
      let recentScans;
      if (includeRecentScans) {
        recentScans = await prisma.qrScan.findMany({
          where: { scanned_by: verifierId },
          orderBy: { scanned_at: 'desc' },
          take: 10,
          include: {
            submission: {
              select: {
                id: true,
                vendor_name: true,
                work_location: true
              }
            }
          }
        });
      }

      logger.info('DashboardService', 'Verifier statistics retrieved', {
        verifierId,
        totalScans,
        uniqueSubmissions: uniqueSubmissions.length,
        todayScans
      });

      return {
        totalScans,
        uniqueSubmissions: uniqueSubmissions.length,
        todayScans,
        ...(recentScans && { recentScans })
      };
    } catch (error) {
      logger.error('DashboardService', 'Error fetching verifier statistics', error);
      throw error;
    }
  }

  /**
   * Get vendor dashboard statistics (submissions only)
   */
  static async getVendorStats(vendorId: string): Promise<SubmissionStats> {
    return this.getSubmissionStats(UserRole.VENDOR, vendorId);
  }

  /**
   * Get visitor dashboard statistics (read-only view of all data)
   */
  static async getVisitorStats() {
    try {
      // Execute all database queries in parallel
      const [
        totalSubmissions,
        submissionsByApprovalStatus,
        submissionsByReviewStatus,
        totalQrScans,
        todayQrScans,
        totalUsers,
        totalVerifiedUsers,
        pendingUserVerifications
      ] = await Promise.all([
        // Submission statistics
        prisma.submission.count(),

        prisma.submission.groupBy({
          by: ['approval_status'],
          _count: { id: true }
        }),

        prisma.submission.groupBy({
          by: ['review_status'],
          _count: { id: true }
        }),

        // QR scan statistics
        prisma.qrScan.count(),

        // Today's QR scans (Jakarta timezone)
        (async () => {
          const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
          const today = new Date(jakartaNow);
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
          
          return prisma.qrScan.count({
            where: {
              scanned_at: {
                gte: todayStart,
                lt: todayEnd
              }
            }
          });
        })(),

        // User statistics
        prisma.user.count(),

        prisma.user.count({
          where: {
            OR: [
              { verified_at: { not: null } },
              { verification_status: 'VERIFIED' }
            ]
          }
        }),

        prisma.user.count({
          where: {
            AND: [
              { verified_at: null },
              { verification_status: { notIn: ['VERIFIED', 'REJECTED'] } },
              { rejection_reason: null }
            ]
          }
        })
      ]);

      // Process stats
      const reviewStatusStats = submissionsByReviewStatus?.reduce((acc, item) => {
        if (item?.review_status && item?._count?.id) {
          acc[item.review_status] = item._count.id;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const approvalStatusStats = submissionsByApprovalStatus?.reduce((acc, item) => {
        if (item?.approval_status && item?._count?.id) {
          acc[item.approval_status] = item._count.id;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const stats = {
        submissions: {
          total: totalSubmissions || 0,
          byReviewStatus: {
            PENDING_REVIEW: reviewStatusStats.PENDING_REVIEW || 0,
            MEETS_REQUIREMENTS: reviewStatusStats.MEETS_REQUIREMENTS || 0,
            NOT_MEETS_REQUIREMENTS: reviewStatusStats.NOT_MEETS_REQUIREMENTS || 0,
          },
          byApprovalStatus: {
            PENDING: approvalStatusStats.PENDING || 0,
            APPROVED: approvalStatusStats.APPROVED || 0,
            REJECTED: approvalStatusStats.REJECTED || 0,
          }
        },
        users: {
          total: totalUsers || 0,
          pendingVerifications: pendingUserVerifications || 0,
          totalVerified: totalVerifiedUsers || 0
        },
        qrScans: {
          total: totalQrScans || 0,
          today: todayQrScans || 0
        }
      };

      logger.info('DashboardService', 'Visitor statistics retrieved', {
        totalSubmissions,
        totalUsers,
        totalQrScans
      });

      return stats;
    } catch (error) {
      logger.error('DashboardService', 'Error fetching visitor statistics', error);
      throw error;
    }
  }

  /**
   * Get visitor charts data (12-month historical data)
   */
  static async getVisitorCharts() {
    try {
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      // Get data for the last 12 months
      const [submissionsData, approvedData, usersData, baselineUsers] = await Promise.all([
        prisma.submission.groupBy({
          by: ['created_at'],
          where: { created_at: { gte: oneYearAgo } },
          _count: { id: true },
        }),

        prisma.submission.groupBy({
          by: ['created_at'],
          where: { 
            created_at: { gte: oneYearAgo },
            approval_status: 'APPROVED'
          },
          _count: { id: true },
        }),

        prisma.user.groupBy({
          by: ['created_at'],
          where: { created_at: { gte: oneYearAgo } },
          _count: { id: true },
        }),

        prisma.user.count({
          where: { created_at: { lt: oneYearAgo } },
        })
      ]);

      // Group data by month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = now.getMonth();

      // Initialize arrays
      const submissionsMonthly: number[] = new Array(12).fill(0);
      const approvedMonthly: number[] = new Array(12).fill(0);
      const newUsersMonthly: number[] = new Array(12).fill(0);
      const usersMonthly: number[] = new Array(12).fill(0);
      const monthLabels: string[] = [];

      // Generate month labels
      for (let i = 0; i < 12; i++) {
        const monthIndex = (currentMonth + i + 1) % 12;
        monthLabels.push(monthNames[monthIndex]!);
      }

      // Process submissions data
      submissionsData.forEach((item: any) => {
        const date = new Date(item.created_at);
        const monthDiff = (date.getFullYear() - oneYearAgo.getFullYear()) * 12 + 
                          (date.getMonth() - oneYearAgo.getMonth());
        if (monthDiff >= 0 && monthDiff < 12) {
          submissionsMonthly[monthDiff] += item._count.id;
        }
      });

      // Process approved submissions data
      approvedData.forEach((item: any) => {
        const date = new Date(item.created_at);
        const monthDiff = (date.getFullYear() - oneYearAgo.getFullYear()) * 12 + 
                          (date.getMonth() - oneYearAgo.getMonth());
        if (monthDiff >= 0 && monthDiff < 12) {
          approvedMonthly[monthDiff] += item._count.id;
        }
      });

      // Process users data
      usersData.forEach((item: any) => {
        const date = new Date(item.created_at);
        const monthDiff = (date.getFullYear() - oneYearAgo.getFullYear()) * 12 + 
                          (date.getMonth() - oneYearAgo.getMonth());
        if (monthDiff >= 0 && monthDiff < 12) {
          newUsersMonthly[monthDiff] += item._count.id;
        }
      });

      // Calculate cumulative user count
      let cumulativeCount = baselineUsers;
      for (let i = 0; i < 12; i++) {
        cumulativeCount += newUsersMonthly[i] || 0;
        usersMonthly[i] = cumulativeCount;
      }

      const chartData = {
        lineChart: {
          labels: monthLabels,
          series: [
            { name: 'Total Pengajuan', data: submissionsMonthly },
            { name: 'Disetujui', data: approvedMonthly },
          ],
        },
        barChart: {
          labels: monthLabels,
          series: [
            { name: 'Jumlah User', data: usersMonthly },
          ],
        },
      };

      logger.info('DashboardService', 'Visitor charts data retrieved', {
        months: monthLabels.length
      });

      return chartData;
    } catch (error) {
      logger.error('DashboardService', 'Error fetching visitor charts data', error);
      throw error;
    }
  }
}

export default DashboardService;
