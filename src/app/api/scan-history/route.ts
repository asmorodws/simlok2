import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { parsePagination, createPaginationMeta } from '@/lib/api/paginationHelpers';
import { qrVerificationService } from '@/services/QRVerificationService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(
      session,
      RoleGroups.SCAN_VIEWERS,
      'Only reviewers, approvers, admins, and super admins can access scan history'
    );
    if (userOrError instanceof NextResponse) return userOrError;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePagination(searchParams, { defaultLimit: 20 });

    // Get scan history via service
    const result = await qrVerificationService.getScanHistoryPaginated({
      page,
      limit,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      verifier: searchParams.get('verifier') || undefined,
      submissionId: searchParams.get('submissionId') || undefined,
      search: searchParams.get('search') || undefined,
    });

    return NextResponse.json({
      ...result,
      pagination: createPaginationMeta(page, limit, result.total),
    });
  } catch (error) {
    console.error('Error fetching scan history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
