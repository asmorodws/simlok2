import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'VERIFIER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get today's date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch statistics
    const [
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      todayVerified
    ] = await Promise.all([
      // Total submissions
      db.submission.count(),
      
      // Pending submissions
      db.submission.count({
        where: { approval_status: 'PENDING' }
      }),
      
      // Approved submissions
      db.submission.count({
        where: { approval_status: 'APPROVED' }
      }),
      
      // Rejected submissions
      db.submission.count({
        where: { approval_status: 'REJECTED' }
      }),
      
      // Today's verified submissions (approved or rejected)
      db.submission.count({
        where: {
          AND: [
            {
              OR: [
                { approval_status: 'APPROVED' },
                { approval_status: 'REJECTED' }
              ]
            },
            {
              created_at: {
                gte: today,
                lt: tomorrow
              }
            }
          ]
        }
      })
    ]);

    const stats = {
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      todayVerified
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching verifier stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
