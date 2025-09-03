import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SubmissionApprovalData } from '@/types/submission';
import { generateSIMLOKPDF, type SubmissionPDFData } from '@/utils/pdf/simlokTemplate';

// Function to generate auto SIMLOK number
async function generateSimlokNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // MM format

  // Get the last SIMLOK number for current month/year
  const lastSubmission = await prisma.submission.findFirst({
    where: {
      nomor_simlok: {
        contains: `/${month}/${year}`
      }
    },
    orderBy: {
      nomor_simlok: 'desc'
    }
  });

  let nextNumber = 1;
  
  if (lastSubmission?.nomor_simlok) {
    // Extract number from format: number/MM/YYYY
    const match = lastSubmission.nomor_simlok.match(/^(\d+)\/\d{2}\/\d{4}$/);
    if (match) {
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
        },
        daftarPekerja: {
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
    if (session.user.role === 'VENDOR' && submission.userId !== session.user.id) {
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
          tanggal_simlok: body.tanggal_simlok ? new Date(body.tanggal_simlok) : undefined,
          // tembusan: body.tembusan,
        };

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
          updateData.nomor_simlok = autoSimlokNumber;
          
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
        'upload_doc_sika', 'upload_doc_simja'
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

      // Handle workers update
      const { workers, ...submissionData } = body;
    }

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

    // Handle workers if provided (only for vendor updates)
    if (session.user.role === 'VENDOR' && body.workers && Array.isArray(body.workers)) {
      // Delete existing workers for this submission
      await prisma.daftarPekerja.deleteMany({
        where: {
          submission_id: id
        }
      });

      // Create new workers
      const validWorkers = body.workers.filter((worker: any) => 
        worker.nama_pekerja && worker.nama_pekerja.trim() !== ''
      );

      if (validWorkers.length > 0) {
        await prisma.daftarPekerja.createMany({
          data: validWorkers.map((worker: any) => ({
            nama_pekerja: worker.nama_pekerja.trim(),
            foto_pekerja: worker.foto_pekerja || null,
            submission_id: id
          }))
        });
      }
    }

    console.log('PUT /api/submissions/[id] - Update successful');
    return NextResponse.json(updatedSubmission);
  } catch (error) {
    console.error('PUT /api/submissions/[id] - Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/submissions/[id] - Delete submission 
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
      if (existingSubmission.userId !== session.user.id) {
        return NextResponse.json({ 
          error: 'Access denied. You can only delete your own submissions.' 
        }, { status: 403 });
      }
      
      if (existingSubmission.status_approval_admin !== 'PENDING') {
        return NextResponse.json({ 
          error: 'Can only delete pending submissions. Approved or rejected submissions cannot be deleted.' 
        }, { status: 400 });
      }
    } else if (session.user.role === 'ADMIN') {
      // Admins can delete any submission, but warn about approved ones
      if (existingSubmission.status_approval_admin === 'APPROVED') {
        return NextResponse.json({ 
          error: 'Cannot delete approved submissions. This would affect issued SIMLOK documents.' 
        }, { status: 400 });
      }
    } else if (session.user.role === 'VERIFIER') {
      // Verifiers can delete pending and rejected submissions
      if (existingSubmission.status_approval_admin === 'APPROVED') {
        return NextResponse.json({ 
          error: 'Cannot delete approved submissions.' 
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid role. Only admins, verifiers, and vendors can delete submissions.' 
      }, { status: 403 });
    }

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
