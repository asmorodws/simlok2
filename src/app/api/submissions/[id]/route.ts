import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateSIMLOKPDF } from '@/utils/pdf/simlokTemplate';
import type { SubmissionPDFData } from '@/types';
import { SubmissionService } from '@/services/SubmissionService';
import { RouteParams } from '@/types';

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
    const shouldClearCache = searchParams.get('clearCache') === 'true';

    // Clear image cache if requested (for PDF generation)
    if (shouldClearCache && isPdfRequest) {
      try {
        const { clearImageCache } = await import('@/utils/pdf/imageLoader');
        clearImageCache();
        console.log('API: Cleared image cache for fresh PDF generation');
      } catch (error) {
        console.warn('API: Failed to clear image cache:', error);
      }
    }

    // Use SubmissionService to get submission with RBAC
    const submission = await SubmissionService.getSubmissionById(
      id,
      session.user.id,
      session.user.role
    );

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // If PDF is requested, generate and return PDF
    if (isPdfRequest) {
      return generatePDF(submission);
    }

    // Return formatted submission (service already formats dates)
    const response = NextResponse.json({ submission });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return response;
  } catch (error: any) {
    console.error('Error fetching submission:', error);
    
    // Handle specific error messages from service
    if (error.message && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate PDF
async function generatePDF(submission: any) {
  try {
    console.log('PDF Generation Debug:', {
      submissionId: submission.id,
      approval_status: submission.approval_status,
      simlok_number: submission.simlok_number,
      has_simlok_number: !!submission.simlok_number,
      worker_list_count: submission.worker_list?.length || 0,
      worker_list_data: submission.worker_list?.map((w: any) => ({
        id: w.id,
        name: w.worker_name,
        has_photo: !!w.worker_photo,
        has_hsse_doc: !!w.hsse_pass_document_upload
      }))
    });

    // Allow PDF generation for any submission
    // If no simlok_number, use a placeholder or generate temporary one
    const pdfData = { ...submission };
    
    if (!submission.simlok_number) {
      console.log('PDF Generation: Using placeholder simlok_number');
      // Create a temporary/placeholder SIMLOK number for PDF preview - use Jakarta time
      const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const now = new Date(jakartaNow);
      const year = now.getFullYear();
      // const month = String(now.getMonth() + 1).padStart(2, '0');
      pdfData.simlok_number = `[DRAFT]/S00330/${year}-S0`;
      // TIDAK set simlok_date agar tetap null/undefined di PDF preview
      // pdfData.simlok_date = now;  // DIHAPUS: ini menyebabkan tanggal auto-fill
    }

    // Generate PDF using the template with potentially modified data
    const pdfBytes = await generateSIMLOKPDF(pdfData as SubmissionPDFData);

    // Generate filename based on simlok_number only (no vendor name)
    let filename: string;
    if (pdfData.simlok_number && !pdfData.simlok_number.startsWith('[DRAFT]')) {
      // For approved submissions with real SIMLOK numbers
      // Clean simlok number: replace special chars with underscore
      const cleanSimlokNumber = pdfData.simlok_number.replace(/[\[\]/\\]/g, '_');
      filename = `SIMLOK_${cleanSimlokNumber}.pdf`;
    } else if (pdfData.simlok_number && pdfData.simlok_number.startsWith('[DRAFT]')) {
      // For draft submissions
      const cleanSimlokNumber = pdfData.simlok_number.replace(/[\[\]/\\]/g, '_');
      filename = `SIMLOK_${cleanSimlokNumber}.pdf`;
    } else {
      // Fallback for submissions without simlok_number
      filename = `SIMLOK_${submission.id}.pdf`;
    }

    // Return PDF response with proper cache control and filename
    // Use both filename and filename* for better browser compatibility
    const encodedFilename = encodeURIComponent(filename);
    
    console.log('PDF Generation: Setting filename:', filename);
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // Use 'inline' to show in browser, but filename still applies when user clicks download
        'Content-Disposition': `inline; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Add custom header for debugging (can be removed in production)
        'X-PDF-Filename': filename,
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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Handle REVIEWER updates
    if (session.user.role === 'REVIEWER') {
      const updateData: any = {};
      
      if (body.implementation_start_date) {
        updateData.implementation_start_date = new Date(body.implementation_start_date);
      }
      if (body.implementation_end_date) {
        updateData.implementation_end_date = new Date(body.implementation_end_date);
      }
      if (body.implementation) updateData.implementation = body.implementation;
      if (body.content) updateData.content = body.content;
      if (body.signer_position) updateData.signer_position = body.signer_position;
      if (body.signer_name) updateData.signer_name = body.signer_name;
      if (body.working_hours) updateData.working_hours = body.working_hours;
      if (body.worker_count !== undefined) updateData.worker_count = body.worker_count;
      if (body.simja_number) updateData.simja_number = body.simja_number;
      if (body.simja_date) updateData.simja_date = new Date(body.simja_date);
      if (body.sika_number) updateData.sika_number = body.sika_number;
      if (body.sika_date) updateData.sika_date = new Date(body.sika_date);
      if (body.worker_list) updateData.worker_list = body.worker_list;

      const updated = await SubmissionService.updateAsReviewer(id, updateData);
      return NextResponse.json(updated);
    }

    // Handle APPROVER updates
    if (session.user.role === 'APPROVER') {
      const updateData: any = {};
      
      if (body.implementation_start_date) {
        updateData.implementation_start_date = new Date(body.implementation_start_date);
      }
      if (body.implementation_end_date) {
        updateData.implementation_end_date = new Date(body.implementation_end_date);
      }
      if (body.implementation) updateData.implementation = body.implementation;
      if (body.content) updateData.content = body.content;
      if (body.signer_position) updateData.signer_position = body.signer_position;
      if (body.signer_name) updateData.signer_name = body.signer_name;
      if (body.working_hours) updateData.working_hours = body.working_hours;
      if (body.worker_count !== undefined) updateData.worker_count = body.worker_count;
      if (body.simja_number) updateData.simja_number = body.simja_number;
      if (body.simja_date) updateData.simja_date = new Date(body.simja_date);
      if (body.sika_number) updateData.sika_number = body.sika_number;
      if (body.sika_date) updateData.sika_date = new Date(body.sika_date);

      const updated = await SubmissionService.updateAsApprover(id, updateData);
      return NextResponse.json(updated);
    }

    // Handle VERIFIER (admin approval workflow)
    if (session.user.role === 'VERIFIER') {
      if (!body.status_approval_admin || !['APPROVED', 'REJECTED'].includes(body.status_approval_admin)) {
        return NextResponse.json({ 
          error: 'Invalid approval status. Must be APPROVED or REJECTED' 
        }, { status: 400 });
      }

      const updateData: any = {
        approval_status: body.status_approval_admin,
        simlok_date: body.tanggal_simlok ? new Date(body.tanggal_simlok) : undefined,
      };

      if (body.status_approval_admin === 'APPROVED') {
        updateData.implementation = body.pelaksanaan;
        updateData.content = body.content;
        updateData.signer_position = body.jabatan_signer;
        updateData.signer_name = body.nama_signer;
        
        if (body.implementation_start_date) {
          updateData.implementation_start_date = new Date(body.implementation_start_date);
        }
        if (body.implementation_end_date) {
          updateData.implementation_end_date = new Date(body.implementation_end_date);
        }
      }

      try {
        const updatedSubmission = await SubmissionService.updateAsVerifier(
          id,
          session.user.id,
          updateData
        );
        return NextResponse.json(updatedSubmission);
      } catch (error: any) {
        if (error.message?.includes('session is no longer valid')) {
          return NextResponse.json({ 
            error: error.message,
            code: 'INVALID_SESSION'
          }, { status: 401 });
        }
        throw error;
      }
    }

    // Handle VENDOR updates
    if (session.user.role === 'VENDOR') {
      const updateData: any = {};
      const allowedFields = [
        'vendor_name', 'based_on', 'officer_name', 'job_description', 
        'work_location', 'working_hours', 'holiday_working_hours', 'work_facilities', 'worker_count',
        'simja_number', 'simja_date', 'sika_number', 'sika_date', 'worker_names',
        'sika_document_upload', 'simja_document_upload'
      ];

      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      });

      if (body.simja_date) updateData.simja_date = new Date(body.simja_date);
      if (body.sika_date) updateData.sika_date = new Date(body.sika_date);
      if (body.workers) updateData.workers = body.workers;

      try {
        const updatedSubmission = await SubmissionService.updateAsVendor(
          id,
          session.user.id,
          updateData
        );
        return NextResponse.json(updatedSubmission);
      } catch (error: any) {
        if (error.message?.includes('not found') || error.message?.includes('Access denied')) {
          return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error.message?.includes('Can only edit')) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
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

    // Use SubmissionService to delete with cleanup
    const result = await SubmissionService.deleteSubmissionWithCleanup(
      id,
      session.user.id,
      session.user.role
    );

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error deleting submission:', error);
    
    // Handle specific error messages from service
    if (error.message) {
      if (error.message.includes('Access denied') || error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes('Cannot delete') || error.message.includes('Can only delete')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes('Invalid role')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error. Please try again later.' 
    }, { status: 500 });
  }
}

// PATCH /api/submissions/[id] - Update submission (alias for PUT for compatibility)
export async function PATCH(request: NextRequest, params: RouteParams) {
  // Just call the PUT method for compatibility
  return PUT(request, params);
}
