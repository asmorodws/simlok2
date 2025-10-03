import { NextResponse } from "next/server";
import { prisma } from "@/lib/singletons";

export async function GET() {
  try {
    // Get first vendor user for testing
    const vendorUser = await prisma.user.findFirst({
      where: { role: "VENDOR" }
    });
    
    if (!vendorUser) {
      return NextResponse.json({ error: "No vendor found" }, { status: 404 });
    }

    console.log('Debug: Found vendor user:', vendorUser.id, vendorUser.officer_name);

    // Get submissions for this vendor
    const submissions = await prisma.submission.findMany({
      where: { user_id: vendorUser.id },
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
      take: 5
    });

    console.log('Debug: Found submissions:', submissions.length);
    if (submissions.length > 0) {
      const firstSubmission = submissions[0];
      console.log('Debug: First submission fields:', Object.keys(firstSubmission!));
      console.log('Debug: Sample submission data:', JSON.stringify(firstSubmission, null, 2));
    }

    return NextResponse.json({
      vendor: {
        id: vendorUser.id,
        name: vendorUser.officer_name,
        vendor_name: vendorUser.vendor_name
      },
      submissions,
      count: submissions.length,
      fields: submissions.length > 0 ? Object.keys(submissions[0]!) : []
    });

  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}