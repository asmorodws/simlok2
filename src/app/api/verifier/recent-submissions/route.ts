import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'VERIFIER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch recent submissions with related data
    const submissions = await db.submission.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        created_at: 'desc'
      },
      select: {
        id: true,
        vendor_name: true,
        officer_name: true,
        job_description: true,
        work_location: true,
        implementation: true,
        approval_status: true,
        simlok_number: true,
        simlok_date: true,
        created_at: true,
        qrcode: true
      }
    });

    // Get total count for pagination
    const totalCount = await db.submission.count();

    return NextResponse.json({
      submissions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching recent submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent submissions' },
      { status: 500 }
    );
  }
}
