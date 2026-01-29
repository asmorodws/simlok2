import { prisma } from '@/lib/database/singletons';

/**
 * Service for dashboard statistics and analytics
 */
class DashboardService {
  /**
   * Get visitor dashboard statistics (read-only view of all data)
   */
  async getVisitorStats() {
    const submissionWhereClause = {};

    // Get today's date range in Jakarta timezone
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const today = new Date(jakartaNow);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Execute all queries in parallel
    const [
      totalSubmissions,
      submissionsByApprovalStatus,
      submissionsByReviewStatus,
      totalQrScans,
      todayQrScans,
      totalUsers,
      totalVerifiedUsers,
      pendingUserVerifications,
    ] = await Promise.all([
      prisma.submission.count({ where: submissionWhereClause }),
      prisma.submission.groupBy({
        by: ['approval_status'],
        where: submissionWhereClause,
        _count: { id: true },
      }),
      prisma.submission.groupBy({
        by: ['review_status'],
        where: submissionWhereClause,
        _count: { id: true },
      }),
      prisma.qrScan.count(),
      prisma.qrScan.count({
        where: {
          scanned_at: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          OR: [{ verified_at: { not: null } }, { verification_status: 'VERIFIED' }],
        },
      }),
      prisma.user.count({
        where: {
          AND: [
            { verified_at: null },
            { verification_status: { notIn: ['VERIFIED', 'REJECTED'] } },
            { rejection_reason: null },
          ],
        },
      }),
    ]);

    // Process submission stats
    const approvalStatusMap: Record<string, number> = {};
    submissionsByApprovalStatus.forEach((item) => {
      if (item.approval_status) {
        approvalStatusMap[item.approval_status] = item._count.id;
      }
    });

    const reviewStatusMap: Record<string, number> = {};
    submissionsByReviewStatus.forEach((item) => {
      if (item.review_status) {
        reviewStatusMap[item.review_status] = item._count.id;
      }
    });

    return {
      submissions: {
        total: totalSubmissions,
        byApprovalStatus: approvalStatusMap,
        byReviewStatus: reviewStatusMap,
      },
      qrScans: {
        total: totalQrScans,
        today: todayQrScans,
      },
      users: {
        total: totalUsers,
        verified: totalVerifiedUsers,
        pending: pendingUserVerifications,
      },
    };
  }

  /**
   * Get reviewer dashboard statistics (submission review focus)
   */
  async getReviewerStats(userRole: string) {
    // Role-based filtering
    let submissionWhereClause = {};
    let userWhereClause: any = {};

    if (userRole === 'REVIEWER') {
      userWhereClause = { role: 'VENDOR' };
    } else if (userRole === 'ADMIN') {
      userWhereClause = { role: { not: 'SUPER_ADMIN' } };
    }

    // Execute queries in parallel
    const [
      totalSubmissions,
      submissionsByReviewStatus,
      submissionsByApprovalStatus,
      pendingUserVerifications,
      totalVerifiedUsers,
    ] = await Promise.all([
      prisma.submission.count({ where: submissionWhereClause }),
      prisma.submission.groupBy({
        by: ['review_status'],
        where: submissionWhereClause,
        _count: { id: true },
      }),
      prisma.submission.groupBy({
        by: ['approval_status'],
        where: submissionWhereClause,
        _count: { id: true },
      }),
      prisma.user.count({
        where: {
          AND: [
            { verified_at: null },
            { verification_status: { notIn: ['VERIFIED', 'REJECTED'] } },
            { rejection_reason: null },
            userWhereClause,
          ],
        },
      }),
      prisma.user.count({
        where: {
          AND: [
            {
              OR: [{ verified_at: { not: null } }, { verification_status: 'VERIFIED' }],
            },
            userWhereClause,
          ],
        },
      }),
    ]);

    // Process stats
    const reviewStatusMap: Record<string, number> = {};
    submissionsByReviewStatus.forEach((item) => {
      if (item.review_status) {
        reviewStatusMap[item.review_status] = item._count.id;
      }
    });

    const approvalStatusMap: Record<string, number> = {};
    submissionsByApprovalStatus.forEach((item) => {
      if (item.approval_status) {
        approvalStatusMap[item.approval_status] = item._count.id;
      }
    });

    return {
      submissions: {
        total: totalSubmissions,
        byReviewStatus: reviewStatusMap,
        byApprovalStatus: approvalStatusMap,
        pendingReview: reviewStatusMap['PENDING_REVIEW'] || 0,
        meetsRequirements: reviewStatusMap['MEETS_REQUIREMENTS'] || 0,
        notMeetsRequirements: reviewStatusMap['NOT_MEETS_REQUIREMENTS'] || 0,
      },
      users: {
        pendingVerification: pendingUserVerifications,
        verified: totalVerifiedUsers,
      },
    };
  }

  /**
   * Get admin dashboard statistics (user management focus)
   */
  async getAdminStats(userRole: string) {
    // Role-based filtering
    const userWhereClause = userRole === 'ADMIN' ? { role: { not: 'SUPER_ADMIN' as const } } : {};

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Execute queries in parallel
    const [
      totalUsers,
      totalPending,
      totalVerified,
      totalRejected,
      todayRegistrations,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count({ where: userWhereClause }),
      prisma.user.count({
        where: {
          AND: [
            { verified_at: null },
            { verification_status: { notIn: ['VERIFIED', 'REJECTED'] } },
            { rejection_reason: null },
            userWhereClause,
          ],
        },
      }),
      prisma.user.count({
        where: {
          AND: [
            {
              OR: [{ verified_at: { not: null } }, { verification_status: 'VERIFIED' }],
            },
            userWhereClause,
          ],
        },
      }),
      prisma.user.count({
        where: {
          AND: [
            {
              OR: [{ rejection_reason: { not: null } }, { verification_status: 'REJECTED' }],
            },
            userWhereClause,
          ],
        },
      }),
      prisma.user.count({
        where: {
          AND: [
            {
              created_at: {
                gte: today,
                lt: tomorrow,
              },
            },
            userWhereClause,
          ],
        },
      }),
      prisma.user.findMany({
        where: userWhereClause,
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          officer_name: true,
          email: true,
          vendor_name: true,
          role: true,
          verification_status: true,
          verified_at: true,
          created_at: true,
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        pending: totalPending,
        verified: totalVerified,
        rejected: totalRejected,
        todayRegistrations,
      },
      recentUsers,
    };
  }

  /**
   * Get visitor charts data (12-month trends)
   */
  async getVisitorCharts() {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Get data for last 12 months in parallel
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
          approval_status: 'APPROVED',
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
      }),
    ]);

    // Initialize month labels and data arrays
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = now.getMonth();
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
      const monthDiff =
        (date.getFullYear() - oneYearAgo.getFullYear()) * 12 +
        (date.getMonth() - oneYearAgo.getMonth());
      if (monthDiff >= 0 && monthDiff < 12) {
        submissionsMonthly[monthDiff] += item._count.id;
      }
    });

    // Process approved submissions data
    approvedData.forEach((item: any) => {
      const date = new Date(item.created_at);
      const monthDiff =
        (date.getFullYear() - oneYearAgo.getFullYear()) * 12 +
        (date.getMonth() - oneYearAgo.getMonth());
      if (monthDiff >= 0 && monthDiff < 12) {
        approvedMonthly[monthDiff] += item._count.id;
      }
    });

    // Process new users per month
    usersData.forEach((item: any) => {
      const date = new Date(item.created_at);
      const monthDiff =
        (date.getFullYear() - oneYearAgo.getFullYear()) * 12 +
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

    return {
      lineChart: {
        labels: monthLabels,
        series: [
          { name: 'Total Pengajuan', data: submissionsMonthly },
          { name: 'Disetujui', data: approvedMonthly },
        ],
      },
      barChart: {
        labels: monthLabels,
        series: [{ name: 'Jumlah User', data: usersMonthly }],
      },
    };
  }

  /**
   * Get approver dashboard statistics
   * Approvers only see submissions that meet requirements
   */
  async getApproverStats() {
    const submissionWhereClause = {
      review_status: 'MEETS_REQUIREMENTS' as const
    };

    // Parallelize all statistics queries
    const [
      totalSubmissions,
      submissionsByApprovalStatus,
      submissionsByReviewStatus,
      pendingApprovalMeetsCount
    ] = await Promise.all([
      prisma.submission.count({
        where: submissionWhereClause
      }),
      prisma.submission.groupBy({
        by: ['approval_status'],
        where: submissionWhereClause,
        _count: {
          id: true
        }
      }),
      prisma.submission.groupBy({
        by: ['review_status'],
        where: submissionWhereClause,
        _count: {
          id: true
        }
      }),
      prisma.submission.count({
        where: {
          ...submissionWhereClause,
          approval_status: 'PENDING_APPROVAL',
          review_status: 'MEETS_REQUIREMENTS'
        }
      })
    ]);

    // Process submission stats
    const approvalStatusStats = submissionsByApprovalStatus.reduce((acc, item) => {
      acc[item.approval_status] = item._count?.id ?? 0;
      return acc;
    }, {} as Record<string, number>);

    const reviewStatusStats = submissionsByReviewStatus.reduce((acc, item) => {
      acc[item.review_status] = item._count?.id ?? 0;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalSubmissions,
      pending_approval_meets: pendingApprovalMeetsCount,
      pending_approval_not_meets: 0,
      approved: approvalStatusStats.APPROVED || 0,
      rejected: approvalStatusStats.REJECTED || 0,
      byApprovalStatus: {
        PENDING: approvalStatusStats.PENDING_APPROVAL || 0,
        IN_REVIEW: approvalStatusStats.IN_REVIEW || 0,
        APPROVED: approvalStatusStats.APPROVED || 0,
        REJECTED: approvalStatusStats.REJECTED || 0,
        REVISION_REQUIRED: approvalStatusStats.REVISION_REQUIRED || 0,
      },
      byReviewStatus: {
        PENDING_REVIEW: 0,
        MEETS_REQUIREMENTS: reviewStatusStats.MEETS_REQUIREMENTS || 0,
        NOT_MEETS_REQUIREMENTS: 0,
      }
    };
  }

  /**
   * Get verifier dashboard statistics
   * Includes scan counts and submission overviews
   */
  async getVerifierStats(userId: string) {
    // Get today's date range (Jakarta timezone)
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const today = new Date(jakartaNow);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Fetch stats in parallel
    const [
      totalScans,
      todayScans,
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      rejectedSubmissions
    ] = await Promise.all([
      prisma.qrScan.count({
        where: {
          scanned_by: userId
        }
      }),
      prisma.qrScan.count({
        where: {
          scanned_by: userId,
          scanned_at: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      }),
      prisma.submission.count(),
      prisma.submission.count({
        where: {
          approval_status: 'APPROVED'
        }
      }),
      prisma.submission.count({
        where: {
          approval_status: 'PENDING_APPROVAL'
        }
      }),
      prisma.submission.count({
        where: {
          approval_status: 'REJECTED'
        }
      })
    ]);

    return {
      totalScans,
      todayScans,
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      rejectedSubmissions
    };
  }

  /**
   * Get submission statistics based on user role
   */
  async getSubmissionStats(userId: string, userRole: string) {
    // Build where clause based on user role
    let whereClause: any = {};
    
    if (userRole === 'VENDOR') {
      whereClause = { user_id: userId };
    } else if (userRole === 'APPROVER') {
      whereClause = { review_status: 'MEETS_REQUIREMENTS' };
    }
    // REVIEWER, ADMIN, SUPER_ADMIN, VERIFIER can see all submissions

    // Get date ranges in Jakarta timezone
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const thirtyDaysAgo = new Date(jakartaNow);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const today = new Date(jakartaNow);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Parallelize all statistics queries
    const [
      totalSubmissions,
      submissionsByStatus,
      recentActivity,
      todaySubmissions
    ] = await Promise.all([
      prisma.submission.count({
        where: whereClause
      }),
      prisma.submission.groupBy({
        by: ['approval_status'],
        where: whereClause,
        _count: {
          id: true
        }
      }),
      prisma.submission.count({
        where: {
          ...whereClause,
          created_at: {
            gte: thirtyDaysAgo
          }
        }
      }),
      prisma.submission.count({
        where: {
          ...whereClause,
          created_at: {
            gte: today,
            lt: tomorrow
          }
        }
      })
    ]);

    // Convert to readable format
    const statusStats = submissionsByStatus.reduce((acc, item) => {
      acc[item.approval_status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

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
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
