import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'VERIFIER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get today's date range
    const today = new Date();
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
      // Total scans by this verifier
      prisma.qrScan.count({
        where: {
          scanned_by: session.user.id
        }
      }),
      
      // Today's scans by this verifier
      prisma.qrScan.count({
        where: {
          scanned_by: session.user.id,
          scanned_at: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      }),
      
      // Total submissions
      prisma.submission.count(),
      
      // Approved submissions
      prisma.submission.count({
        where: {
          approval_status: 'APPROVED'
        }
      }),
      
      // Pending submissions
      prisma.submission.count({
        where: {
          approval_status: 'PENDING'
        }
      }),
      
      // Rejected submissions
      prisma.submission.count({
        where: {
          approval_status: 'REJECTED'
        }
      })
    ]);

    const stats = {
      totalScans,
      todayScans,
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      rejectedSubmissions
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching verifier stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}