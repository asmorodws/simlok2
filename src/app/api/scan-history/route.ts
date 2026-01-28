import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';
import { formatScansDates, formatSubmissionDates } from '@/lib/helpers/timezone';
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { parsePagination, createPaginationMeta } from '@/lib/api/paginationHelpers';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check session and role in one call
    const userOrError = requireSessionWithRole(
      session, 
      RoleGroups.SCAN_VIEWERS,
      'Only reviewers, approvers, admins, and super admins can access scan history'
    );
    if (userOrError instanceof NextResponse) return userOrError;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams, { defaultLimit: 20 });
    
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const verifier = searchParams.get('verifier');
    const submissionId = searchParams.get('submissionId');
    const search = searchParams.get('search');

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
      select: {
        id: true,
        submission_id: true,
        scanned_by: true,
        scanner_name: true,
        scan_location: true,
        scanned_at: true,
        submission: {
          select: {
            id: true,
            simlok_number: true,
            vendor_name: true,
            officer_name: true,
            job_description: true,
            work_location: true,
            working_hours: true,
            implementation: true,
            worker_count: true,
            implementation_start_date: true,
            implementation_end_date: true,
            review_status: true,
            approval_status: true,
            created_at: true,
            // Vendor contact information (denormalized from user)
            user_email: true,
            user_phone_number: true,
            user_address: true,
            user_vendor_name: true,
            user_officer_name: true,
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

    // Format scanned timestamps and nested submission dates to Jakarta timezone
    const formattedScans = scans.map(s => ({
      ...s,
      scanned_at: (s.scanned_at ? new Date(s.scanned_at) : null) ? formatScansDates([s])[0].scanned_at : s.scanned_at,
      submission: s.submission ? formatSubmissionDates(s.submission) : s.submission
    }));

    return NextResponse.json({
      scans: formattedScans,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      pagination: createPaginationMeta(page, limit, total),
    });

  } catch (error) {
    console.error('Error fetching scan history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}