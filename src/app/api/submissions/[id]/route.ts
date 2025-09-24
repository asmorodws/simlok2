import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { generateSIMLOKPDF, type SubmissionPDFData } from '@/utils/pdf/simlokTemplate';
import { notifyVendorStatusChange } from '@/server/events';
import { cleanupSubmissionNotifications } from '@/lib/notificationCleanup';
import { generateQrString } from '@/lib/qr-security';

// Function to generate auto SIMLOK number
async function generateSimlokNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // MM format

  // Get the last SIMLOK number for current month/year
  const lastSubmission = await prisma.submission.findFirst({
    where: {
      simlok_number: {
        contains: `/${month}/${year}`
      }
    },
    orderBy: {
      simlok_number: 'desc'
    }
  });

  let nextNumber = 1;
  
  if (lastSubmission?.simlok_number) {
    // Extract number from format: number/MM/YYYY
    const match = lastSubmission.simlok_number.match(/^(\d+)\/\d{2}\/\d{4}$/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `${nextNumber}/${month}/${year}`;
}

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
        ...(session.user.role === 'VENDOR' ? { user_id: session.user.id } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        approved_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        },
        worker_list: {
          orderBy: {
            created_at: 'asc'
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === 'VENDOR' && submission.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If PDF is requested, generate and return PDF
    if (isPdfRequest) {
      return generatePDF(submission);
    }

    // Return regular JSON response
    const response = NextResponse.json(submission);
    
    // Add cache control for better performance
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    
    return response;
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate PDF
async function generatePDF(submission: any) {
  try {
    console.log('PDF Generation Debug:', {
      submissionId: submission.id,
      approval_status: submission.approval_status,
      final_status: submission.final_status,
      simlok_number: submission.simlok_number,
      has_simlok_number: !!submission.simlok_number
    });

    // Allow PDF generation for any submission
    // If no simlok_number, use a placeholder or generate temporary one
    let pdfData = { ...submission };
    
    if (!submission.simlok_number) {
      console.log('PDF Generation: Using placeholder simlok_number');
      // Create a temporary/placeholder SIMLOK number for PDF preview
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      pdfData.simlok_number = `[DRAFT]/XX/${month}/${year}`;
      pdfData.simlok_date = now;
    }

    // Generate PDF using the template with potentially modified data
    const pdfBytes = await generateSIMLOKPDF(pdfData as SubmissionPDFData);

    // Generate filename based on simlok_number (including placeholder)
    const filename = pdfData.simlok_number ? 
      `SIMLOK_${pdfData.simlok_number.replace(/[\[\]/\\]/g, '_')}.pdf` :
      `SIMLOK_PREVIEW_${submission.id}.pdf`;

    // Return PDF response
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
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
        ...(session.user.role === 'VENDOR' ? { user_id: session.user.id } : {})
      }
    });

    console.log('PUT /api/submissions/[id] - Existing submission:', {
      found: !!existingSubmission,
      status: existingSubmission?.approval_status,
      userId: existingSubmission?.user_id
    });

    if (!existingSubmission) {
      console.log('PUT /api/submissions/[id] - Submission not found or access denied');
      return NextResponse.json({ error: 'Submission not found or access denied' }, { status: 404 });
    }

    // Check permissions based on role
    if (session.user.role === 'VENDOR') {
      // Vendors can only edit PENDING submissions and only their own
      if (existingSubmission.user_id !== session.user.id) {
        console.log('PUT /api/submissions/[id] - Access denied: not owner');
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      
      if (existingSubmission.approval_status !== 'PENDING') {
        console.log('PUT /api/submissions/[id] - Cannot edit non-pending submission');
        return NextResponse.json({ 
          error: 'Can only edit pending submissions' 
        }, { status: 400 });
      }
    }

    const body = await request.json();
    console.log('PUT /api/submissions/[id] - Request body keys:', Object.keys(body));

    const updateData: any = {};
    let statusChanged = false;
    let newStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;

    // Handle different types of updates based on user role
    if (session.user.role === 'ADMIN' || session.user.role === 'VERIFIER') {
      // Admin/Verifier updating approval status
      if (body.status_approval_admin && ['APPROVED', 'REJECTED'].includes(body.status_approval_admin)) {
        console.log('PUT /api/submissions/[id] - Admin/Verifier approval update');
        console.log('PUT /api/submissions/[id] - Session user ID:', session.user.id);
        console.log('PUT /api/submissions/[id] - Session user role:', session.user.role);
        
        const approvalData: any = {
          approval_status: body.status_approval_admin,
          notes: body.keterangan,
          simlok_date: body.tanggal_simlok ? new Date(body.tanggal_simlok) : undefined,
        };

        // Track status change for notification
        if (existingSubmission.approval_status !== body.status_approval_admin) {
          statusChanged = true;
          newStatus = body.status_approval_admin;
        }

        // Only add fields that are provided and valid
        Object.entries(approvalData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            updateData[key] = value;
          }
        });

        // If approving, add additional fields
        if (body.status_approval_admin === 'APPROVED') {
          // Generate auto SIMLOK number
          const autoSimlokNumber = await generateSimlokNumber();
          updateData.simlok_number = autoSimlokNumber;
          
          updateData.implementation = body.pelaksanaan;
          updateData.other_notes = body.lain_lain;
          updateData.content = body.content;
          updateData.signer_position = body.jabatan_signer;
          updateData.signer_name = body.nama_signer;
          
          // Add implementation date range if provided
          if (body.implementation_start_date) {
            updateData.implementation_start_date = new Date(body.implementation_start_date);
          }
          if (body.implementation_end_date) {
            updateData.implementation_end_date = new Date(body.implementation_end_date);
          }
          
          // Generate secure QR code with implementation dates
          const qrString = generateQrString({
            id: id,
            implementation_start_date: body.implementation_start_date ? new Date(body.implementation_start_date) : null,
            implementation_end_date: body.implementation_end_date ? new Date(body.implementation_end_date) : null,
          });
          updateData.qrcode = qrString;
          
          // Verify the user exists before setting approved_by
          const adminUser = await prisma.user.findUnique({
            where: { id: session.user.id }
          });
          
          if (adminUser) {
            updateData.approved_by = session.user.id;
          } else {
            console.log('PUT /api/submissions/[id] - Admin user not found:', session.user.id);
            return NextResponse.json({ 
              error: 'Your session is no longer valid. Please log out and log back in to continue.',
              code: 'INVALID_SESSION'
            }, { status: 401 });
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
        'vendor_name', 'based_on', 'officer_name', 'job_description', 
        'work_location', 'working_hours', 'work_facilities', 'worker_count',
        'simja_number', 'simja_date', 'sika_number', 'sika_date', 'worker_names',
        'sika_document_upload', 'simja_document_upload'
      ];

      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      });

      // Handle date fields
      if (body.simja_date) {
        updateData.simja_date = new Date(body.simja_date);
      }
      if (body.sika_date) {
        updateData.sika_date = new Date(body.sika_date);
      }

    }

    // Perform the update
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        approved_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        }
      }
    });

    // Handle workers if provided (only for vendor updates)
    if (session.user.role === 'VENDOR' && body.workers && Array.isArray(body.workers)) {
      // Delete existing workers for this submission
      await prisma.workerList.deleteMany({
        where: {
          submission_id: id
        }
      });

      // Create new workers
      const validWorkers = body.workers.filter((worker: any) => 
        worker.worker_name && worker.worker_name.trim() !== ''
      );

      if (validWorkers.length > 0) {
        await prisma.workerList.createMany({
          data: validWorkers.map((worker: any) => ({
            worker_name: worker.worker_name.trim(),
            worker_photo: worker.worker_photo || null,
            submission_id: id
          }))
        });
      }
    }

    // Notify vendor if status changed
    if (statusChanged && newStatus && existingSubmission.user_id) {
      await notifyVendorStatusChange(
        existingSubmission.user_id,
        id,
        newStatus
      );
    }

    console.log('PUT /api/submissions/[id] - Update successful');
    return NextResponse.json(updatedSubmission);
  } catch (error) {
    console.error('PUT /api/submissions/[id] - Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/submissions/[id] - Delete submission 
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the submission first to check permissions
    const existingSubmission = await prisma.submission.findUnique({
      where: { id }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Permission checks based on role
    if (session.user.role === 'VENDOR') {
      // Vendors can only delete their own PENDING submissions
      if (existingSubmission.user_id !== session.user.id) {
        return NextResponse.json({ 
          error: 'Access denied. You can only delete your own submissions.' 
        }, { status: 403 });
      }
      
      if (existingSubmission.approval_status !== 'PENDING') {
        return NextResponse.json({ 
          error: 'Can only delete pending submissions. Approved or rejected submissions cannot be deleted.' 
        }, { status: 400 });
      }
    } else if (session.user.role === 'ADMIN') {
      // Admins can delete any submission, but warn about approved ones
      if (existingSubmission.approval_status === 'APPROVED') {
        return NextResponse.json({ 
          error: 'Cannot delete approved submissions. This would affect issued SIMLOK documents.' 
        }, { status: 400 });
      }
    } else if (session.user.role === 'VERIFIER') {
      // Verifiers can delete pending and rejected submissions
      if (existingSubmission.approval_status === 'APPROVED') {
        return NextResponse.json({ 
          error: 'Cannot delete approved submissions.' 
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid role. Only admins, verifiers, and vendors can delete submissions.' 
      }, { status: 403 });
    }

    // Clean up related notifications before deleting submission
    await cleanupSubmissionNotifications(id);

    // Delete the submission
    await prisma.submission.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: 'Submission deleted successfully',
      deletedId: id 
    });

  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ 
      error: 'Internal server error. Please try again later.' 
    }, { status: 500 });
  }
}
