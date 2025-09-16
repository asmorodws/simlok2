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
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status') || 'ALL';
    const dateRange = url.searchParams.get('dateRange') || 'ALL';
    const search = url.searchParams.get('search') || '';

    // Build where conditions
    const whereConditions: any = {};

    // Status filter
    if (status !== 'ALL') {
      whereConditions.approval_status = status;
    }

    // Date range filter
    if (dateRange !== 'ALL') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'TODAY':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          whereConditions.created_at = {
            gte: startDate
          };
          break;
        case 'WEEK':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          whereConditions.created_at = {
            gte: startDate
          };
          break;
        case 'MONTH':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          whereConditions.created_at = {
            gte: startDate
          };
          break;
      }
    }

    // Search filter
    if (search.trim()) {
      whereConditions.OR = [
        {
          simlok_number: {
            contains: search,
            mode: 'insensitive' as const
          }
        },
        {
          vendor_name: {
            contains: search,
            mode: 'insensitive' as const
          }
        },
        {
          officer_name: {
            contains: search,
            mode: 'insensitive' as const
          }
        },
        {
          job_description: {
            contains: search,
            mode: 'insensitive' as const
          }
        },
        {
          work_location: {
            contains: search,
            mode: 'insensitive' as const
          }
        }
      ];
    }

    // Fetch submissions with pagination
    const [submissions, totalCount] = await Promise.all([
      db.submission.findMany({
        where: whereConditions,
        take: limit,
        skip: offset,
        orderBy: [
          {
            approval_status: 'asc' // Show pending first
          },
          {
            created_at: 'desc'
          }
        ],
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
          created_at: true
        }
      }),
      db.submission.count({
        where: whereConditions
      })
    ]);

    return NextResponse.json({
      submissions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      filters: {
        status,
        dateRange,
        search
      }
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
