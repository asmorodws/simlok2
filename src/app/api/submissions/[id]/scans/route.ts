import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';
import { formatScansDates } from '@/lib/helpers/timezone';
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check session and role in one call
    const userOrError = requireSessionWithRole(
      session,
      RoleGroups.SCAN_VIEWERS
    );
    if (userOrError instanceof NextResponse) return userOrError;

    const resolvedParams = await params;
    const submissionId = resolvedParams.id;

    // Get scan history for the specific submission
    const scans = await prisma.qrScan.findMany({
      where: {
        submission_id: submissionId
      },
      select: {
        id: true,
        submission_id: true,
        scanned_by: true,
        scanner_name: true,
        scan_location: true,
        scanned_at: true,
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: {
        scanned_at: 'desc'
      }
    });

    // Convert scan timestamps to Asia/Jakarta for API consumers
    const formattedScans = formatScansDates(scans);
    const totalScans = formattedScans.length;
    const lastScan = formattedScans[0] || null;

    return NextResponse.json({
      scans: formattedScans,
      totalScans,
      lastScan,
      hasBeenScanned: totalScans > 0
    });

  } catch (error) {
    console.error('Error fetching submission scan history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}