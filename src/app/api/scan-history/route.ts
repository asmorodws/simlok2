import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow REVIEWER, APPROVER, ADMIN, SUPER_ADMIN to access scan history
    if (!['REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const verifier = searchParams.get('verifier');
    const submissionId = searchParams.get('submissionId');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.scanned_at = {};
      if (dateFrom) {
        where.scanned_at.gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Add 1 day to include the entire date
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        where.scanned_at.lt = endDate;
      }
    }

    if (verifier) {
      where.user = {
        officer_name: {
          contains: verifier
        }
      };
    }

    if (submissionId) {
      where.submission = {
        simlok_number: {
          contains: submissionId
        }
      };
    }

    // Add search functionality
    if (search) {
      where.OR = [
        {
          submission: {
            simlok_number: {
              contains: search
            }
          }
        },
        {
          submission: {
            vendor_name: {
              contains: search
            }
          }
        },
        {
          user: {
            officer_name: {
              contains: search
            }
          }
        },
        {
          scan_location: {
            contains: search
          }
        }
      ];
    }

    // Get total count for pagination
    const total = await prisma.qrScan.count({ where });

    // Get scan history with related data
    const scans = await prisma.qrScan.findMany({
      where,
      include: {
        submission: {
          select: {
            id: true,
            simlok_number: true,
            vendor_name: true,
            job_description: true,
            review_status: true,
            final_status: true,
          }
        },
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
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      scans,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching scan history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}