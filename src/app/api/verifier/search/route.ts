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
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        submissions: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        }
      });
    }

    const searchTerm = query.trim();

    // Build search conditions
    const whereConditions = {
      OR: [
        {
          simlok_number: {
            contains: searchTerm,
            mode: 'insensitive' as const
          }
        },
        {
          vendor_name: {
            contains: searchTerm,
            mode: 'insensitive' as const
          }
        },
        {
          officer_name: {
            contains: searchTerm,
            mode: 'insensitive' as const
          }
        },
        {
          job_description: {
            contains: searchTerm,
            mode: 'insensitive' as const
          }
        },
        {
          work_location: {
            contains: searchTerm,
            mode: 'insensitive' as const
          }
        },
        {
          id: {
            contains: searchTerm,
            mode: 'insensitive' as const
          }
        }
      ]
    };

    // Search submissions
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
          created_at: true,
          qrcode: true
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
      query: searchTerm
    });

  } catch (error) {
    console.error('Error searching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to search submissions' },
      { status: 500 }
    );
  }
}
