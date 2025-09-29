import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/singletons";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {
      user_id: userId
    };

    if (search) {
      where.OR = [
        { job_description: { contains: search } },
        { work_location: { contains: search } },
        { vendor_name: { contains: search } },
        { officer_name: { contains: search } },
        { simlok_number: { contains: search } }
      ];
    }

    if (status) {
      where.approval_status = status;
    }

    // Get total count for pagination
    const totalCount = await prisma.submission.count({ where });
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get submissions without updated_at field
    const submissions = await prisma.submission.findMany({
      where,
      select: {
        id: true,
        job_description: true,
        work_location: true,
        approval_status: true,
        simlok_number: true,
        simlok_date: true,
        created_at: true,
        vendor_name: true,
        officer_name: true,
        based_on: true,
        working_hours: true,
        implementation: true,
        work_facilities: true,
        worker_names: true,
        content: true,
        notes: true,
        simja_number: true,
        simja_date: true,
        sika_number: true,
        sika_date: true,
        other_notes: true,
        sika_document_upload: true,
        simja_document_upload: true,
        qrcode: true,
        signer_position: true,
        signer_name: true,
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true
          }
        },
        approved_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder as 'asc' | 'desc'
      },
      skip,
      take: limit
    });

    // Get statistics
    const stats = await prisma.submission.groupBy({
      by: ['approval_status'],
      where: { user_id: userId },
      _count: {
        approval_status: true
      }
    });

    const statistics = {
      total: totalCount,
      pending: stats.find(s => s.approval_status === 'PENDING')?._count.approval_status || 0,
      approved: stats.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
      rejected: stats.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0
    };

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: totalPages
      },
      statistics
    });

  } catch (error) {
    console.error("Vendor submissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
