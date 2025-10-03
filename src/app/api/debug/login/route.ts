import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/singletons";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('Test Login: Attempting login for:', email);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    
    console.log('Test Login: Login successful for user:', user.id, user.officer_name);
    
    // Get user's submissions
    const submissions = await prisma.submission.findMany({
      where: { user_id: user.id },
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
      take: 5
    });
    
    console.log('Test Login: Found', submissions.length, 'submissions');
    if (submissions.length > 0) {
      console.log('Test Login: Sample submission:', JSON.stringify(submissions[0], null, 2));
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        officer_name: user.officer_name,
        vendor_name: user.vendor_name,
        role: user.role
      },
      submissions,
      submission_count: submissions.length
    });
    
  } catch (error) {
    console.error("Test login error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}