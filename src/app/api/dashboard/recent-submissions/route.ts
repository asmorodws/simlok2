import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/singletons";
import { 
  successResponse,
  internalErrorResponse 
} from "@/lib/api/apiResponse";
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { PAGINATION } from '@/lib/constants';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Use helper for session and role validation
    const userOrError = requireSessionWithRole(
      session,
      RoleGroups.ADMINS,
      'Only admins and super admins can access recent submissions'
    );
    if (userOrError instanceof NextResponse) return userOrError;

    // Get recent submissions based on user role
    let whereClause = {};
    
    if (userOrError.role === 'ADMIN') {
      // ADMIN can see all submissions
      whereClause = {};
    } else if (userOrError.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN can see all submissions
      whereClause = {};
    }

    const recentSubmissions = await prisma.submission.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc'
      },
      take: PAGINATION.DASHBOARD_RECENT_LIMIT,
      select: {
        id: true,
        simlok_number: true,
        vendor_name: true,
        officer_name: true,
        approval_status: true,
        created_at: true,
        user: {
          select: {
            officer_name: true,
            vendor_name: true
          }
        }
      }
    });

    return successResponse(recentSubmissions);

  } catch (error) {
    return internalErrorResponse('DASHBOARD_RECENT_SUBMISSIONS', error);
  }
}