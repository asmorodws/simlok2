import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { generateSIMLOKPDF } from '@/utils/pdf/simlokTemplate';
import { clearImageCache } from '@/utils/pdf/imageLoader';
import { formatSubmissionDates } from '@/lib/timezone';
import type { SubmissionPDFData } from '@/types';
import { notifyVendorStatusChange } from '@/server/events';
import { cleanupSubmissionNotifications } from '@/lib/notificationCleanup';
import { generateQrString } from '@/lib/qr-security';

// Function to generate auto SIMLOK number
async function generateSimlokNumber(): Promise<string> {
  // Use Jakarta timezone for year
  const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const now = new Date(jakartaNow);
  const year = now.getFullYear();

  // Get the last approved submission for CURRENT YEAR to determine next auto-increment number
  // Nomor akan direset ke 1 setiap tahun baru
  const lastSubmission = await prisma.submission.findFirst({
    where: {
      simlok_number: {
        not: null,
        // Filter untuk tahun yang sama: format nomor/S00330/YYYY
        contains: `/S00330/${year}-S0`
      }
    },
    orderBy: [
      { simlok_date: 'desc' },
      { simlok_number: 'desc' }
    ]
  });

  let nextNumber = 1;
  
  if (lastSubmission?.simlok_number) {
    // Extract auto-increment number from format: number/S00330/YYYY
    const match = lastSubmission.simlok_number.match(/^(\d+)\/S00330\/\d{4}$/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  // Format: autoincrement/S00330/tahun
  // Nomor akan mulai dari 1 lagi setiap tahun baru
  return `${nextNumber}/S00330/${year}-S0`;
}

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

    // Fetch submission with user and approved by user details
    const whereClause: any = { id };
    
    // Apply role-based access control
    switch (session.user.role) {
      case 'VENDOR':
        // Vendors can only see their own submissions
        whereClause.user_id = session.user.id;
        break;
      case 'APPROVER':
        // Approvers can only see submissions that meet requirements
        whereClause.review_status = 'MEETS_REQUIREMENTS';
        break;
      case 'REVIEWER':
      case 'VERIFIER':
      case 'ADMIN':
      case 'SUPER_ADMIN':
        // These roles can see all submissions (no additional filter)
        break;
      default:
        return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }
    
    const submission = await prisma.submission.findFirst({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        worker_list: {
          orderBy: {
            created_at: 'asc'
          }
        },
        support_documents: {
          select: {
            id: true,
            document_subtype: true,
            document_type: true,
            document_number: true,
            document_date: true,
            document_upload: true,
            uploaded_at: true,
            uploaded_by: true,
          },
          orderBy: {
            uploaded_at: 'desc'
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

    // Format submission dates to Asia/Jakarta before returning
    try {
      const formatted = formatSubmissionDates(submission);
      const response = NextResponse.json({ submission: formatted });
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
      return response;
    } catch (err) {
      console.warn('Failed to format submission dates for response:', err);
      const response = NextResponse.json({ submission });
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
      return response;
    }
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
    // 🎯 CRITICAL FIX: Auto-retry with cache clearing on compression errors
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await generateSIMLOKPDF(pdfData as SubmissionPDFData);
    } catch (pdfError) {
      // Check if it's a compression error
      if (pdfError instanceof Error && 
          (pdfError.message.includes('compression method') || 
           pdfError.message.includes('flate stream'))) {
        console.warn('⚠️ Compression error detected, clearing cache and retrying...');
        clearImageCache();
        
        // Retry once with cleared cache
        try {
          pdfBytes = await generateSIMLOKPDF(pdfData as SubmissionPDFData);
          console.log('✅ PDF generated successfully after cache clear');
        } catch (retryError) {
          console.error('❌ PDF generation failed even after cache clear:', retryError);
          throw retryError;
        }
      } else {
        throw pdfError;
      }
    }

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
    
    // 🎯 PERFORMANCE: Cache approved PDFs aggressively (they don't change)
    // Draft PDFs should not be cached as they may change
    const isApproved = pdfData.simlok_number && !pdfData.simlok_number.startsWith('[DRAFT]');
    const cacheControl = isApproved 
      ? 'public, max-age=86400' // Cache for 24 hours if approved
      : 'no-store, no-cache, must-revalidate'; // Don't cache drafts
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // Use 'inline' to show in browser, but filename still applies when user clicks download
        'Content-Disposition': `inline; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': cacheControl,
        'Pragma': isApproved ? 'public' : 'no-cache',
        'Expires': isApproved ? new Date(Date.now() + 86400000).toUTCString() : '0',
        // Add custom header for debugging (can be removed in production)
        'X-PDF-Filename': filename,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // 🎯 CRITICAL FIX: Clear image cache on compression errors
    // This ensures corrupted or incompatible cached images are removed
    if (error instanceof Error && error.message.includes('compression method')) {
      console.warn('⚠️ Compression error detected, clearing image cache...');
      clearImageCache();
    }
    
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
      
      if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
        console.log('PUT /api/submissions/[id] - Cannot edit non-pending submission');
        return NextResponse.json({ 
          error: 'Can only edit pending submissions' 
        }, { status: 400 });
      }
    } else if (session.user.role === 'REVIEWER' || session.user.role === 'APPROVER') {
      // Reviewers and Approvers can edit submissions in PENDING_APPROVAL status
      if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
        console.log('PUT /api/submissions/[id] - Cannot edit non-pending submission');
        return NextResponse.json({ 
          error: 'Can only edit pending submissions' 
        }, { status: 400 });
      }
      
      // Approvers can only edit submissions that meet requirements
      if (session.user.role === 'APPROVER' && existingSubmission.review_status !== 'MEETS_REQUIREMENTS') {
        console.log('PUT /api/submissions/[id] - Approver cannot edit submission that does not meet requirements');
        return NextResponse.json({ 
          error: 'Can only edit submissions that meet requirements' 
        }, { status: 403 });
      }
    }

    const body = await request.json();
    console.log('PUT /api/submissions/[id] - Request body keys:', Object.keys(body));

    const updateData: any = {};
    let statusChanged = false;
    let newStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | undefined;

    // Handle different types of updates based on user role
    if (session.user.role === 'REVIEWER') {
      // Reviewer updating implementation dates and template data
      console.log('PUT /api/submissions/[id] - Reviewer update');
      
      // Allow reviewer to update implementation dates and template fields
      const allowedFields = [
        'implementation_start_date', 'implementation_end_date', 'implementation',
        'content', 'signer_position', 'signer_name', 'working_hours', 'worker_count',
        // Preserve existing data
        'simja_number', 'simja_date', 'sika_number', 'sika_date'
      ];

      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          if (field === 'implementation_start_date' || field === 'implementation_end_date') {
            // Handle date fields
            updateData[field] = body[field] ? new Date(body[field]) : null;
          } else {
            updateData[field] = body[field];
          }
        }
      });

      console.log('PUT /api/submissions/[id] - Reviewer update data:', updateData);
      // If reviewer provided worker_list in body, persist it (delete existing and recreate)
      if (body.worker_list && Array.isArray(body.worker_list)) {
        try {
          // Remove existing workers for submission
          await prisma.workerList.deleteMany({ where: { submission_id: id } });

          const validWorkers = body.worker_list.filter((w: any) => w.worker_name && w.worker_name.trim() !== '');

          if (validWorkers.length > 0) {
            await prisma.workerList.createMany({
              data: validWorkers.map((w: any) => ({
                worker_name: w.worker_name.trim(),
                worker_photo: w.worker_photo || null,
                // 🔧 FIX: Include HSSE fields to preserve data after delete
                hsse_pass_number: w.hsse_pass_number || null,
                hsse_pass_valid_thru: w.hsse_pass_valid_thru ? new Date(w.hsse_pass_valid_thru) : null,
                hsse_pass_document_upload: w.hsse_pass_document_upload || null,
                submission_id: id
              }))
            });
          }

          // If worker_count provided, use it; otherwise set to created length
          if (body.worker_count !== undefined) {
            updateData.worker_count = body.worker_count;
          } else {
            updateData.worker_count = validWorkers.length;
          }
        } catch (err) {
          console.warn('Failed to persist worker_list for reviewer update:', err);
        }
      }
      
    } else if (session.user.role === 'APPROVER') {
      // Approver can update similar fields as reviewer plus approval status
      console.log('PUT /api/submissions/[id] - Approver update');
      
      const allowedFields = [
        'implementation_start_date', 'implementation_end_date', 'implementation',
        'content', 'signer_position', 'signer_name', 'working_hours', 'worker_count',
        'simja_number', 'simja_date', 'sika_number', 'sika_date'
      ];

      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          if (field === 'implementation_start_date' || field === 'implementation_end_date') {
            updateData[field] = body[field] ? new Date(body[field]) : null;
          } else {
            updateData[field] = body[field];
          }
        }
      });

      console.log('PUT /api/submissions/[id] - Approver update data:', updateData);
      
    } else if (session.user.role === 'VERIFIER') {
      // Admin/Verifier updating approval status
      if (body.status_approval_admin && ['APPROVED', 'REJECTED'].includes(body.status_approval_admin)) {
        console.log('PUT /api/submissions/[id] - Admin/Verifier approval update');
        console.log('PUT /api/submissions/[id] - Session user ID:', session.user.id);
        console.log('PUT /api/submissions/[id] - Session user role:', session.user.role);
        
        const approvalData: any = {
          approval_status: body.status_approval_admin,
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
        'work_location', 'working_hours', 'holiday_working_hours', 'work_facilities', 'worker_count',
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
      
      // 🔧 FIX: Handle implementation dates for vendor
      if (body.implementation_start_date) {
        updateData.implementation_start_date = new Date(body.implementation_start_date);
      }
      if (body.implementation_end_date) {
        updateData.implementation_end_date = new Date(body.implementation_end_date);
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
            // 🔧 FIX: Include HSSE fields to preserve data after delete/edit
            hsse_pass_number: worker.hsse_pass_number || null,
            hsse_pass_valid_thru: worker.hsse_pass_valid_thru ? new Date(worker.hsse_pass_valid_thru) : null,
            hsse_pass_document_upload: worker.hsse_pass_document_upload || null,
            submission_id: id
          }))
        });
      }
    }

    // 🔧 FIX: Handle support documents if provided (for vendor updates)
    if (session.user.role === 'VENDOR') {
      const {
        simjaDocuments,
        sikaDocuments,
        workOrderDocuments,
        kontrakKerjaDocuments,
        jsaDocuments
      } = body;

      // If any document arrays are provided, update them
      if (simjaDocuments || sikaDocuments || workOrderDocuments || kontrakKerjaDocuments || jsaDocuments) {
        // Delete existing support documents for this submission
        await prisma.supportDocument.deleteMany({
          where: {
            submission_id: id
          }
        });

        const allDocuments = [];

        // SIMJA documents
        if (simjaDocuments && Array.isArray(simjaDocuments) && simjaDocuments.length > 0) {
          const simjaDocs = simjaDocuments
            .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
            .map((doc: any) => ({
              document_subtype: doc.document_subtype || 'Ast. Man. Facility Management',
              document_type: 'SIMJA',
              document_number: doc.document_number,
              document_date: doc.document_date ? new Date(doc.document_date) : null,
              document_upload: doc.document_upload,
              submission_id: id,
              uploaded_by: session.user.id,
              uploaded_at: new Date(),
            }));
          allDocuments.push(...simjaDocs);
        }

        // SIKA documents
        if (sikaDocuments && Array.isArray(sikaDocuments) && sikaDocuments.length > 0) {
          const sikaDocs = sikaDocuments
            .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
            .map((doc: any) => ({
              document_subtype: doc.document_subtype || null,
              document_type: 'SIKA',
              document_number: doc.document_number,
              document_date: doc.document_date ? new Date(doc.document_date) : null,
              document_upload: doc.document_upload,
              submission_id: id,
              uploaded_by: session.user.id,
              uploaded_at: new Date(),
            }));
          allDocuments.push(...sikaDocs);
        }

        // Work Order documents (optional)
        if (workOrderDocuments && Array.isArray(workOrderDocuments) && workOrderDocuments.length > 0) {
          const workOrderDocs = workOrderDocuments
            .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
            .map((doc: any) => ({
              document_subtype: null,
              document_type: 'WORK_ORDER',
              document_number: doc.document_number,
              document_date: doc.document_date ? new Date(doc.document_date) : null,
              document_upload: doc.document_upload,
              submission_id: id,
              uploaded_by: session.user.id,
              uploaded_at: new Date(),
            }));
          allDocuments.push(...workOrderDocs);
        }

        // Kontrak Kerja documents (optional)
        if (kontrakKerjaDocuments && Array.isArray(kontrakKerjaDocuments) && kontrakKerjaDocuments.length > 0) {
          const kontrakDocs = kontrakKerjaDocuments
            .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
            .map((doc: any) => ({
              document_subtype: null,
              document_type: 'KONTRAK_KERJA',
              document_number: doc.document_number,
              document_date: doc.document_date ? new Date(doc.document_date) : null,
              document_upload: doc.document_upload,
              submission_id: id,
              uploaded_by: session.user.id,
              uploaded_at: new Date(),
            }));
          allDocuments.push(...kontrakDocs);
        }

        // JSA documents (optional)
        if (jsaDocuments && Array.isArray(jsaDocuments) && jsaDocuments.length > 0) {
          const jsaDocs = jsaDocuments
            .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
            .map((doc: any) => ({
              document_subtype: null,
              document_type: 'JSA',
              document_number: doc.document_number,
              document_date: doc.document_date ? new Date(doc.document_date) : null,
              document_upload: doc.document_upload,
              submission_id: id,
              uploaded_by: session.user.id,
              uploaded_at: new Date(),
            }));
          allDocuments.push(...jsaDocs);
        }

        // Save all documents at once
        if (allDocuments.length > 0) {
          await prisma.supportDocument.createMany({
            data: allDocuments,
          });
        }
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
      
      if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
        return NextResponse.json({ 
          error: 'Can only delete pending submissions. Approved or rejected submissions cannot be deleted.' 
        }, { status: 400 });
      }
    } else  if (session.user.role === 'VERIFIER') {
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

// PATCH /api/submissions/[id] - Update submission (alias for PUT for compatibility)
export async function PATCH(request: NextRequest, params: RouteParams) {
  // Just call the PUT method for compatibility
  return PUT(request, params);
}
