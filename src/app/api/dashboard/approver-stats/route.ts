/**
 * @deprecated Use /api/dashboard/stats instead
 * This endpoint redirects to the unified stats endpoint
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { withCache } from "@/lib/cache/apiCache";
import { CacheKeys, CacheTTL } from "@/lib/cache/cache";
import { 
  successResponse, 
  internalErrorResponse 
} from "@/lib/api/apiResponse";
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { NextResponse } from 'next/server';
import { dashboardService } from '@/services/DashboardService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const userOrError = requireSessionWithRole(
      session,
      RoleGroups.APPROVERS,
      'Only approvers, admins, and super admins can access this dashboard'
    );
    if (userOrError instanceof NextResponse) return userOrError;

    // Use cache for dashboard stats
    const { data: dashboardStats, cached } = await withCache(
      CacheKeys.APPROVER_STATS,
      CacheTTL.ONE_MINUTE,
      async () => {
        return await dashboardService.getApproverStats();
      }
    );

    return successResponse(dashboardStats, { cached });
  } catch (error) {
    return internalErrorResponse('APPROVER_DASHBOARD_STATS', error);
  }
}
