import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { SubmissionData } from '@/types/submission';

// GET /api/submissions - Get all submissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const vendorName = searchParams.get('vendor');
    const includeStats = searchParams.get('stats') === 'true';
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // Filter by role
    if (session.user.role === 'VENDOR') {
      whereClause.userId = session.user.id;
    }

    // Filter by status if provided
    if (status) {
      whereClause.status_approval_admin = status;
    }

    // Filter by vendor name if provided (admin/verifier only)
    if (vendorName && session.user.role !== 'VENDOR') {
      whereClause.nama_vendor = {
        contains: vendorName
      };
    }

    // Add search functionality
    if (search) {
      const searchConditions = [
        { nama_vendor: { contains: search } },
        { nama_petugas: { contains: search } },
        { pekerjaan: { contains: search } },
        { lokasi_kerja: { contains: search } },
        { nama_pekerja: { contains: search } }
      ];
      
      whereClause.OR = searchConditions;
    }

    // Prepare orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              nama_petugas: true,
              email: true,
              nama_vendor: true,
            }
          },
          approvedByUser: {
            select: {
              id: true,
              nama_petugas: true,
              email: true,
            }
          }
        },
        orderBy: orderBy,
        skip,
        take: limit,
      }),
      prisma.submission.count({ where: whereClause }),
    ]);

    const response: any = {
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    };

    // Include statistics for admin requests
    if (includeStats && session.user.role === 'ADMIN') {
      const statistics = await prisma.submission.groupBy({
        by: ['status_approval_admin'],
        _count: {
          status_approval_admin: true
        }
      });

      response.statistics = {
        total: total,
        pending: statistics.find(s => s.status_approval_admin === 'PENDING')?._count.status_approval_admin || 0,
        approved: statistics.find(s => s.status_approval_admin === 'APPROVED')?._count.status_approval_admin || 0,
        rejected: statistics.find(s => s.status_approval_admin === 'REJECTED')?._count.status_approval_admin || 0,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/submissions - Create new submission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only VENDOR can create submissions
    if (session.user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Only vendors can create submissions' }, { status: 403 });
    }

    const body: SubmissionData = await request.json();

    // Validate required fields
    const requiredFields = [
      'nama_vendor', 'berdasarkan', 'nama_petugas', 'pekerjaan', 
      'lokasi_kerja', 'pelaksanaan', 'jam_kerja', 'sarana_kerja', 'nama_pekerja'
    ];

    for (const field of requiredFields) {
      if (!body[field as keyof SubmissionData]) {
        return NextResponse.json({ 
          error: `Field ${field} is required` 
        }, { status: 400 });
      }
    }

    // Generate QR Code (simple implementation)
    const qrData = `${session.user.id}-${Date.now()}`;
    
    const submission = await prisma.submission.create({
      data: {
        ...body,
        userId: session.user.id,
        tanggal_simja: body.tanggal_simja ? new Date(body.tanggal_simja) : null,
        tanggal_sika: body.tanggal_sika ? new Date(body.tanggal_sika) : null,
        qrcode: qrData,
      },
      include: {
        user: {
          select: {
            id: true,
            nama_petugas: true,
            email: true,
            nama_vendor: true,
          }
        }
      }
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
