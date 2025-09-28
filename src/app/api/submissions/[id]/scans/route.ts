import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow REVIEWER, APPROVER, ADMIN, SUPER_ADMIN to access scan history
    if (!['REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const submissionId = resolvedParams.id;

    // Get scan history for the specific submission
    const scans = await prisma.qrScan.findMany({
      where: {
        submission_id: submissionId
      },
      include: {
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

    // Get total scan count
    const totalScans = scans.length;
    const lastScan = scans[0] || null;

    return NextResponse.json({
      scans,
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