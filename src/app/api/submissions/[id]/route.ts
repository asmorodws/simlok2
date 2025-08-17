import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { SubmissionApprovalData } from '@/types/submission';
import { generateSIMLOKPDF, type SubmissionPDFData } from '@/utils/pdf/simlokTemplate';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/submissions/[id] - Get single submission with optional PDF generation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isPdfRequest = searchParams.get('format') === 'pdf';

    // Fetch submission with user and approved by user details
    const submission = await prisma.submission.findFirst({
      where: { 
        id,
        // Vendors can only see their own submissions
        ...(session.user.role === 'VENDOR' ? { userId: session.user.id } : {})
      },
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
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === 'VENDOR' && submission.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If PDF is requested, generate and return PDF
    if (isPdfRequest) {
      return generatePDF(submission);
    }

    // Return regular JSON response
    return NextResponse.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate PDF
async function generatePDF(submission: any) {
  try {
    // Only allow PDF generation for APPROVED submissions
    if (submission.status_approval_admin !== 'APPROVED') {
      return NextResponse.json({ error: 'PDF only available for approved submissions' }, { status: 400 });
    }

    // Generate PDF using the template
    const pdfBytes = await generateSIMLOKPDF(submission as SubmissionPDFData);

    // Return PDF response
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="SIMLOK_${submission.nomor_simlok?.replace(/\//g, '_')}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// PUT /api/submissions/[id] - Update submission (Admin for approval, Vendor for editing PENDING submissions)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('PUT /api/submissions/[id] - Session:', {
      userId: session?.user?.id,
      role: session?.user?.role,
      email: session?.user?.email
    });
    
    if (!session?.user) {
      console.log('PUT /api/submissions/[id] - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    console.log('PUT /api/submissions/[id] - Submission ID:', id);

    // First, fetch the existing submission
    const existingSubmission = await prisma.submission.findFirst({
      where: { 
        id,
        // Vendors can only edit their own submissions
        ...(session.user.role === 'VENDOR' ? { userId: session.user.id } : {})
      }
    });

    console.log('PUT /api/submissions/[id] - Existing submission:', {
      found: !!existingSubmission,
      status: existingSubmission?.status_approval_admin,
      userId: existingSubmission?.userId
    });

    if (!existingSubmission) {
      console.log('PUT /api/submissions/[id] - Submission not found or access denied');
      return NextResponse.json({ error: 'Submission not found or access denied' }, { status: 404 });
    }

    // Check permissions based on role
    if (session.user.role === 'VENDOR') {
      // Vendors can only edit PENDING submissions and only their own
      if (existingSubmission.userId !== session.user.id) {
        console.log('PUT /api/submissions/[id] - Access denied: not owner');
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      
      if (existingSubmission.status_approval_admin !== 'PENDING') {
        console.log('PUT /api/submissions/[id] - Cannot edit non-pending submission');
        return NextResponse.json({ 
          error: 'Can only edit pending submissions' 
        }, { status: 400 });
      }
    }

    const body = await request.json();
    console.log('PUT /api/submissions/[id] - Request body keys:', Object.keys(body));

    let updateData: any = {};

    // Handle different types of updates based on user role
    if (session.user.role === 'ADMIN' || session.user.role === 'VERIFIER') {
      // Admin/Verifier updating approval status
      if (body.status_approval_admin && ['APPROVED', 'REJECTED'].includes(body.status_approval_admin)) {
        console.log('PUT /api/submissions/[id] - Admin/Verifier approval update');
        console.log('PUT /api/submissions/[id] - Session user ID:', session.user.id);
        console.log('PUT /api/submissions/[id] - Session user role:', session.user.role);
        
        const approvalData: any = {
          status_approval_admin: body.status_approval_admin,
          keterangan: body.keterangan,
          nomor_simlok: body.nomor_simlok,
          tanggal_simlok: body.tanggal_simlok ? new Date(body.tanggal_simlok) : undefined,
          tembusan: body.tembusan,
        };

        // Only add fields that are provided and valid
        Object.entries(approvalData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            updateData[key] = value;
          }
        });

        // If approving, add additional fields
        if (body.status_approval_admin === 'APPROVED') {
          updateData.pelaksanaan = body.pelaksanaan;
          updateData.lain_lain = body.lain_lain;
          updateData.content = body.content;
          updateData.jabatan_signer = body.jabatan_signer;
          updateData.nama_signer = body.nama_signer;
          
          // Verify the user exists before setting approved_by_admin
          const adminUser = await prisma.user.findUnique({
            where: { id: session.user.id }
          });
          
          if (adminUser) {
            updateData.approved_by_admin = session.user.id;
          } else {
            console.log('PUT /api/submissions/[id] - Admin user not found:', session.user.id);
            return NextResponse.json({ 
              error: 'Admin user not found. Please login again.' 
            }, { status: 400 });
          }
        }
      } else {
        console.log('PUT /api/submissions/[id] - Invalid approval status:', body.status_approval_admin);
        return NextResponse.json({ 
          error: 'Invalid approval status. Must be APPROVED or REJECTED' 
        }, { status: 400 });
      }
    } else if (session.user.role === 'VENDOR') {
      // Vendor updating their submission
      console.log('PUT /api/submissions/[id] - Vendor update');
      
      // Only allow vendor to update certain fields and only if submission is PENDING
      const allowedFields = [
        'nama_vendor', 'berdasarkan', 'nama_petugas', 'pekerjaan', 
        'lokasi_kerja', 'jam_kerja', 'sarana_kerja', 'nomor_simja', 
        'tanggal_simja', 'nomor_sika', 'tanggal_sika', 'nama_pekerja',
        'upload_doc_sika', 'upload_doc_simja', 'upload_doc_id_card'
      ];

      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      });

      // Handle date fields
      if (body.tanggal_simja) {
        updateData.tanggal_simja = new Date(body.tanggal_simja);
      }
      if (body.tanggal_sika) {
        updateData.tanggal_sika = new Date(body.tanggal_sika);
      }
    } else {
      console.log('PUT /api/submissions/[id] - Invalid role:', session.user.role);
      return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }

    console.log('PUT /api/submissions/[id] - Update data keys:', Object.keys(updateData));

    // Perform the update
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: updateData,
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
      }
    });

    console.log('PUT /api/submissions/[id] - Update successful');
    return NextResponse.json(updatedSubmission);

  } catch (error) {
    console.error('PUT /api/submissions/[id] - Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/submissions/[id] - Delete submission (only vendors can delete their PENDING submissions)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Only vendors can delete their own submissions and only if PENDING
    if (session.user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Only vendors can delete submissions' }, { status: 403 });
    }

    const existingSubmission = await prisma.submission.findFirst({
      where: { 
        id,
        userId: session.user.id // Ensure it's their submission
      }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (existingSubmission.status_approval_admin !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Can only delete pending submissions' 
      }, { status: 400 });
    }

    await prisma.submission.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Submission deleted successfully' });

  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
