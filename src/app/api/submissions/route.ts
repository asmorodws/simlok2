import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { SubmissionData } from '@/types';
import { notifyAdminNewSubmission } from '@/server/events';

// Helper function to normalize document number
// - Convert to uppercase
// - Remove "No." or "No" prefix at the beginning
// Examples:
//   "simja/0202" -> "SIMJA/0202"
//   "No. 096/SIMJA/S0700/2024-S0" -> "096/SIMJA/S0700/2024-S0"
//   "no simja/123" -> "SIMJA/123"
//   "NO. abc-123" -> "ABC-123"
function normalizeDocumentNumber(docNumber: string | null | undefined): string | null {
  if (!docNumber || typeof docNumber !== 'string') {
    return null;
  }

  let normalized = docNumber.trim();
  
  // Remove "No." or "No" prefix (case insensitive)
  // Matches: "No. ", "No ", "no. ", "no ", "NO. ", "NO "
  normalized = normalized.replace(/^no\.?\s*/i, '');
  
  // Convert to uppercase
  normalized = normalized.toUpperCase();
  
  return normalized || null;
}

// Helper function to generate "Berdasarkan" text from SIMJA documents
function generateBasedOnText(simjaDocuments: any[]): string {
  console.log('generateBasedOnText - Input:', JSON.stringify(simjaDocuments, null, 2));
  
  if (!simjaDocuments || simjaDocuments.length === 0) {
    console.log('generateBasedOnText - No documents, returning default');
    return 'Surat Permohonan Izin Kerja'; // Default text
  }

  const validSimjaDocs = simjaDocuments.filter(
    doc => {
      const hasNumber = doc.document_number && doc.document_number.trim() !== '';
      const hasDate = doc.document_date && doc.document_date.trim() !== '';
      console.log('generateBasedOnText - Checking doc:', { 
        hasNumber, 
        hasDate, 
        document_number: doc.document_number,
        document_date: doc.document_date 
      });
      return hasNumber && hasDate;
    }
  );

  console.log('generateBasedOnText - Valid docs count:', validSimjaDocs.length);

  if (validSimjaDocs.length === 0) {
    console.log('generateBasedOnText - No valid documents, returning default');
    return 'Surat Permohonan Izin Kerja'; // Default text
  }

  const simjaStrings = validSimjaDocs.map((doc) => {
    const number = doc.document_number || '';
    const date = doc.document_date || '';
    
    // Format tanggal dari YYYY-MM-DD ke format yang lebih readable
    let formattedDate = date;
    if (date && date.includes('-')) {
      try {
        const dateParts = date.split('-');
        const year = dateParts[0];
        const month = dateParts[1];
        const day = dateParts[2];
        
        if (year && month && day) {
          const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];
          const monthIndex = parseInt(month, 10) - 1;
          const monthName = monthNames[monthIndex] || month;
          formattedDate = `${parseInt(day, 10)} ${monthName} ${year}`;
        }
      } catch (e) {
        // Keep original format if parsing fails
        console.log('generateBasedOnText - Date parsing error:', e);
        formattedDate = date;
      }
    }

    const result = `Simja No. ${number} Tgl. ${formattedDate}`;
    console.log('generateBasedOnText - Generated string:', result);
    return result;
  });

  // Gabungkan dengan koma jika lebih dari 1
  const finalResult = simjaStrings.join(', ');
  console.log('generateBasedOnText - Final result:', finalResult);
  return finalResult;
}

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
    const reviewStatus = searchParams.get('reviewStatus');
    const finalStatus = searchParams.get('finalStatus');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const vendorName = searchParams.get('vendor');
    const includeStats = searchParams.get('stats') === 'true';
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Filter by role with appropriate permissions
    switch (session.user.role) {
      case 'VENDOR':
        // Vendors can only see their own submissions
        whereClause.user_id = session.user.id;
        break;
      
      case 'REVIEWER':
        // Reviewers see submissions that need review or are being reviewed
        if (!status) {
          whereClause.review_status = { in: ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] };
        }
        break;
        
      case 'APPROVER':
        // Approvers see all reviewed submissions (both MEETS and NOT_MEETS requirements)
        // They need to see NOT_MEETS to make final rejection decision
        if (!status) {
          whereClause.review_status = { in: ['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] };
          whereClause.approval_status = { in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] };
        }
        break;
        
      case 'VERIFIER':
        // Verifiers see approved submissions for scanning/verification
        if (!status) {
          whereClause.approval_status = 'APPROVED';
        }
        break;
        
      case 'ADMIN':
      case 'SUPER_ADMIN':
        // Admins can see all submissions (no additional filter)
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }

    // Filter by status if provided (overrides role-based defaults)
    if (status) {
      if (status.includes('APPROVAL')) {
        whereClause.approval_status = status;
      } else if (status.includes('REVIEW')) {
        whereClause.review_status = status;
      } else {
        whereClause.approval_status = status;
      }
    }

    // Handle separate reviewStatus and finalStatus filters (used by Approver UI)
    if (reviewStatus) {
      whereClause.review_status = reviewStatus;
    }
    
    if (finalStatus) {
      whereClause.approval_status = finalStatus;
    }

    // Filter by vendor name if provided (admin/verifier only)
    if (vendorName && session.user.role !== 'VENDOR') {
      whereClause.vendor_name = {
        contains: vendorName
      };
    }

    // Add search functionality
    if (search) {
      const searchConditions = [
        { vendor_name: { contains: search } },
        { officer_name: { contains: search } },
        { job_description: { contains: search } },
        { work_location: { contains: search } },
        { worker_names: { contains: search } }
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
              officer_name: true,
              email: true,
              vendor_name: true,
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
    if (includeStats && session.user.role === 'SUPER_ADMIN') {
      const statistics = await prisma.submission.groupBy({
        by: ['approval_status'],
        _count: {
          approval_status: true
        }
      });

      response.statistics = {
        total: total,
        pending: statistics.find(s => s.approval_status === 'PENDING_APPROVAL')?._count.approval_status || 0,
        approved: statistics.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
        rejected: statistics.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0,
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

    // Debug logging
    console.log('POST /api/submissions - Session user:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    });

    // Only VENDOR can create submissions
    if (session.user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Only vendors can create submissions' }, { status: 403 });
    }

    const body: SubmissionData = await request.json();
    const bodyWithDocs = body as any; // Cast untuk akses simjaDocuments

    // Extract workers and documents data from body FIRST
    const { 
      workers, 
      simjaDocuments, 
      sikaDocuments, 
      workOrderDocuments, 
      kontrakKerjaDocuments, 
      jsaDocuments, 
      ...submissionData 
    } = bodyWithDocs;

    // Log SIMJA documents untuk debugging
    console.log('POST /api/submissions - SIMJA Documents received:', JSON.stringify(simjaDocuments, null, 2));

    // Debug logging for received data
    console.log('POST /api/submissions - Received data:', {
      ...submissionData,
      // Don't log sensitive data, just check if required fields exist
      hasRequiredFields: {
        vendor_name: !!submissionData.vendor_name,
        officer_name: !!submissionData.officer_name,
        job_description: !!submissionData.job_description,
        work_location: !!submissionData.work_location,
        working_hours: !!submissionData.working_hours,
        work_facilities: !!submissionData.work_facilities,
        worker_names: !!submissionData.worker_names
      },
      // Log implementation dates
      implementationDates: {
        implementation_start_date: submissionData.implementation_start_date,
        implementation_end_date: submissionData.implementation_end_date
      },
      // Log SIMJA documents count for based_on generation
      simjaDocumentsCount: simjaDocuments?.length || 0
    });

    // Validate required fields (use Indonesian error messages and friendly labels)
    const requiredFields = [
      'vendor_name', 'officer_name', 'job_description',
      'work_location', 'working_hours', 'work_facilities', 'worker_names'
    ];

    const fieldLabels: Record<string, string> = {
      vendor_name: 'Nama Vendor',
      officer_name: 'Nama Petugas',
      job_description: 'Deskripsi Pekerjaan',
      work_location: 'Lokasi Kerja',
      working_hours: 'Jam Kerja',
      work_facilities: 'Sarana Kerja',
      worker_names: 'Daftar Pekerja'
    };

    for (const field of requiredFields) {
      if (!body[field as keyof SubmissionData]) {
        const label = fieldLabels[field] || field;
        console.log(`POST /api/submissions - Field wajib tidak diisi: ${field}`);
        return NextResponse.json({
          error: `Field wajib: ${label} harus diisi`,
          field: field
        }, { status: 400 });
      }
    }

    // Validate session user ID
    if (!session.user.id) {
      console.log('POST /api/submissions - Session user ID is missing');
      return NextResponse.json({
        error: 'User ID not found in session'
      }, { status: 400 });
    }

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!userExists) {
      console.log('POST /api/submissions - User not found in database:', session.user.id);
      return NextResponse.json({
        error: 'User not found in database'
      }, { status: 400 });
    }

    console.log('POST /api/submissions - User verified:', userExists.email);

    // Normalize document numbers in simjaDocuments BEFORE generating "Berdasarkan" text
    const normalizedSimjaDocuments = (simjaDocuments || []).map((doc: any) => ({
      ...doc,
      document_number: normalizeDocumentNumber(doc.document_number)
    }));

    // Generate "Berdasarkan" text from SIMJA documents (dengan nomor yang sudah di-normalize)
    const basedOnText = generateBasedOnText(normalizedSimjaDocuments);

    // Debug: Log data yang masuk
    console.log('Submission data received:', JSON.stringify(submissionData, null, 2));
    console.log('Generated based_on text:', basedOnText);

    // Generate QR Code (simple implementation)
    const qrData = `${session.user.id}-${Date.now()}`;

    try {
      // Create submission first - hanya field yang ada di schema
      const submission = await prisma.submission.create({
        data: {
          // Basic submission data
          vendor_name: submissionData.vendor_name,
          based_on: basedOnText, // Auto-generated from SIMJA documents
          officer_name: submissionData.officer_name,
          job_description: submissionData.job_description,
          work_location: submissionData.work_location,
          implementation_start_date: submissionData.implementation_start_date 
            ? new Date(submissionData.implementation_start_date) 
            : null,
          implementation_end_date: submissionData.implementation_end_date 
            ? new Date(submissionData.implementation_end_date) 
            : null,
          working_hours: submissionData.working_hours,
          work_facilities: submissionData.work_facilities,
          worker_names: submissionData.worker_names,
          worker_count: submissionData.worker_count && !isNaN(Number(submissionData.worker_count)) 
            ? Number(submissionData.worker_count) 
            : null,
          
          // User data
          user_id: session.user.id,
          user_email: userExists.email,
          user_officer_name: userExists.officer_name,
          user_vendor_name: userExists.vendor_name,
          user_phone_number: userExists.phone_number,
          user_address: userExists.address,
          vendor_phone: userExists.phone_number,
          
          // QR Code
          qrcode: qrData,
          
          // Note: simja_number, simja_date, sika_number, sika_date, dll 
          // sudah tidak ada di schema karena sekarang menggunakan SupportDocument table
        },
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

      // Create workers if they exist
      if (workers && Array.isArray(workers) && workers.length > 0) {
        const workersData = workers.map((worker: any) => ({
          worker_name: worker.worker_name,
          worker_photo: worker.worker_photo || null,
          hsse_pass_number: worker.hsse_pass_number || null,
          hsse_pass_valid_thru: worker.hsse_pass_valid_thru ? new Date(worker.hsse_pass_valid_thru) : null,
          hsse_pass_document_upload: worker.hsse_pass_document_upload || null,
          submission_id: submission.id,
        }));

        await prisma.workerList.createMany({
          data: workersData,
        });

        console.log('POST /api/submissions - Workers created:', workersData.length);
      }

      // Create support documents if they exist
      const allDocuments = [];

      // SIMJA documents
      if (simjaDocuments && Array.isArray(simjaDocuments) && simjaDocuments.length > 0) {
        const simjaDocs = simjaDocuments
          .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
          .map((doc: any) => ({
            document_subtype: doc.document_subtype || 'Ast. Man. Facility Management', // Auto-set untuk SIMJA
            document_type: 'SIMJA',
            document_number: normalizeDocumentNumber(doc.document_number),
            document_date: doc.document_date ? new Date(doc.document_date) : null,
            document_upload: doc.document_upload,
            submission_id: submission.id,
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
            document_number: normalizeDocumentNumber(doc.document_number),
            document_date: doc.document_date ? new Date(doc.document_date) : null,
            document_upload: doc.document_upload,
            submission_id: submission.id,
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
            document_subtype: null, // Work Order tidak punya subtype
            document_type: 'WORK_ORDER',
            document_number: normalizeDocumentNumber(doc.document_number),
            document_date: doc.document_date ? new Date(doc.document_date) : null,
            document_upload: doc.document_upload,
            submission_id: submission.id,
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
            document_subtype: null, // Kontrak Kerja tidak punya subtype
            document_type: 'KONTRAK_KERJA',
            document_number: normalizeDocumentNumber(doc.document_number),
            document_date: doc.document_date ? new Date(doc.document_date) : null,
            document_upload: doc.document_upload,
            submission_id: submission.id,
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
            document_subtype: null, // JSA tidak punya subtype
            document_type: 'JSA',
            document_number: normalizeDocumentNumber(doc.document_number),
            document_date: doc.document_date ? new Date(doc.document_date) : null,
            document_upload: doc.document_upload,
            submission_id: submission.id,
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

        console.log('POST /api/submissions - Support documents created:', {
          simja: simjaDocuments?.length || 0,
          sika: sikaDocuments?.length || 0,
          workOrder: workOrderDocuments?.length || 0,
          kontrakKerja: kontrakKerjaDocuments?.length || 0,
          jsa: jsaDocuments?.length || 0,
          total: allDocuments.length
        });
      }

      // Notify admin about new submission
      await notifyAdminNewSubmission(submission.id);

      console.log('POST /api/submissions - Submission created successfully:', submission.id);
      return NextResponse.json(submission, { status: 201 });
    } catch (dbError) {
      console.error('POST /api/submissions - Database error:', dbError);
      return NextResponse.json({
        error: 'Failed to create submission in database'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/submissions - General error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
