import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/singletons";

export async function GET(request: NextRequest) {
  try {
    console.log('Session Test: Starting session check...');
    
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('Session Test: No session found');
      return NextResponse.json({ 
        error: "No session", 
        authenticated: false,
        session: null 
      }, { status: 401 });
    }
    
    console.log('Session Test: Session found:', {
      userId: session.user?.id,
      email: session.user?.email,
      role: session.user?.role,
      officer_name: session.user?.officer_name
    });
    
    if (session.user.role !== "VENDOR") {
      console.log('Session Test: User is not vendor, role:', session.user.role);
      return NextResponse.json({ 
        error: "Not a vendor", 
        authenticated: true,
        session: session.user,
        isVendor: false 
      }, { status: 403 });
    }
    
    console.log('Session Test: Valid vendor session, fetching submissions...');
    
    // Test the same query as the real API
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search');
    const status = searchParams.get('status');

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

    const totalCount = await prisma.submission.count({ where });
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

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

    console.log('Session Test: Query results:', {
      totalCount,
      submissionsFound: submissions.length,
      userId,
      whereClause: where
    });
    
    if (submissions.length > 0) {
      const firstSubmission = submissions[0];
      console.log('Session Test: First submission sample:', {
        id: firstSubmission!.id,
        job_description: firstSubmission!.job_description,
        working_hours: firstSubmission!.working_hours,
        officer_name: firstSubmission!.officer_name,
        approval_status: firstSubmission!.approval_status
      });
    }

    return NextResponse.json({
      authenticated: true,
      isVendor: true,
      session: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        officer_name: session.user.officer_name,
        vendor_name: session.user.vendor_name
      },
      query: {
        userId,
        totalCount,
        submissionsFound: submissions.length,
        page,
        limit,
        sortBy,
        sortOrder,
        search,
        status,
        where
      },
      submissions: submissions.slice(0, 3), // Just first 3 for debugging
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error("Session test error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error),
        authenticated: false
      },
      { status: 500 }
    );
  }
}