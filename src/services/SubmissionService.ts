import { prisma } from '@/lib/database/singletons';
import { Session } from 'next-auth';
import { notifyAdminNewSubmission } from '@/lib/notification/events';
import { formatSubmissionDates } from '@/lib/helpers/timezone';
import { normalizeDocumentNumber, generateBasedOnText } from '@/lib/helpers/documentHelpers';
import { logger } from '@/lib/logging/logger';

/**
 * SubmissionService - Business logic for submission operations
 * Extracted from route handlers for better testability and separation of concerns
 */
export class SubmissionService {
  /**
   * Get submissions with filters and pagination
   */
  async getSubmissions(
    session: Session,
    filters: {
      page?: number;
      limit?: number;
      status?: string;
      reviewStatus?: string;
      finalStatus?: string;
      vendorName?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      includeStats?: boolean;
    }
  ) {
    const {
      page = 1,
      limit = 10,
      status,
      reviewStatus,
      finalStatus,
      vendorName,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      includeStats = false,
    } = filters;

    const skip = (page - 1) * limit;
    const { role, id: userId } = session.user;

    // Build where clause based on role and filters
    const whereClause: any = {};

    // Role-based default filters
    switch (role) {
      case 'VENDOR':
        whereClause.user_id = userId;
        break;
      
      case 'REVIEWER':
        if (!status) {
          whereClause.review_status = { in: ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] };
        }
        break;
        
      case 'APPROVER':
        if (!status) {
          whereClause.review_status = 'MEETS_REQUIREMENTS';
          whereClause.approval_status = { in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] };
        }
        break;
        
      case 'VERIFIER':
        if (!status) {
          whereClause.approval_status = 'APPROVED';
        }
        break;
        
      case 'SUPER_ADMIN':
        // Super admin can see all submissions
        break;
        
      default:
        throw new Error('Invalid role');
    }

    // Apply status filters
    if (status) {
      if (status.includes('APPROVAL')) {
        whereClause.approval_status = status;
      } else if (status.includes('REVIEW')) {
        whereClause.review_status = status;
      } else {
        whereClause.approval_status = status;
      }
    }

    if (reviewStatus) {
      whereClause.review_status = reviewStatus;
    }
    
    if (finalStatus) {
      whereClause.approval_status = finalStatus;
    }

    if (vendorName && role !== 'VENDOR') {
      whereClause.vendor_name = { contains: vendorName };
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        { simlok_number: { contains: search, mode: 'insensitive' } },
        { vendor_name: { contains: search, mode: 'insensitive' } },
        { work_location: { contains: search, mode: 'insensitive' } },
        { officer_name: { contains: search, mode: 'insensitive' } },
        { job_description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Prepare orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          simlok_number: true,
          vendor_name: true,
          officer_name: true,
          job_description: true,
          work_location: true,
          implementation: true,
          based_on: true,
          review_status: true,
          approval_status: true,
          created_at: true,
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
      }),
      prisma.submission.count({ where: whereClause }),
    ]);

    // Format dates
    const formattedSubmissions = submissions.map(formatSubmissionDates);

    const response: any = {
      submissions: formattedSubmissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Include statistics if requested (only for super admin)
    if (includeStats && role === 'SUPER_ADMIN') {
      const statistics = await prisma.submission.groupBy({
        by: ['approval_status'],
        _count: {
          approval_status: true
        }
      });

      response.statistics = {
        total,
        pending: statistics.find((s: any) => s.approval_status === 'PENDING_APPROVAL')?._count.approval_status || 0,
        approved: statistics.find((s: any) => s.approval_status === 'APPROVED')?._count.approval_status || 0,
        rejected: statistics.find((s: any) => s.approval_status === 'REJECTED')?._count.approval_status || 0,
      };
    }

    return response;
  }

  /**
   * Get single submission by ID
   */
  async getSubmissionById(submissionId: string, session: Session) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            vendor_name: true,
            officer_name: true,
            email: true,
            phone_number: true,
            address: true,
          },
        },
        worker_list: true,
        qrScans: {
          orderBy: { scanned_at: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                officer_name: true,
              },
            },
          },
        },
        support_documents: {
          orderBy: { uploaded_at: 'desc' },
        },
      },
    });

    if (!submission) {
      return null;
    }

    // Check access permissions
    const { role, id: userId } = session.user;
    if (role === 'VENDOR' && submission.user_id !== userId) {
      throw new Error('Forbidden');
    }

    return formatSubmissionDates(submission);
  }

  /**
   * Create new submission with full validation and document handling
   */
  async createSubmission(data: any, session: Session) {
    const { user } = session;

    // Validate vendor role
    if (user.role !== 'VENDOR') {
      throw new Error('Only vendors can create submissions');
    }

    // Extract workers and documents from request body
    const {
      workers,
      simjaDocuments,
      sikaDocuments,
      workOrderDocuments,
      kontrakKerjaDocuments,
      jsaDocuments,
      ...submissionData
    } = data;

    // Validate required fields
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
      if (!submissionData[field]) {
        const label = fieldLabels[field] || field;
        throw new Error(`Field wajib: ${label} harus diisi`);
      }
    }

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!userExists) {
      throw new Error('User not found in database');
    }

    // Normalize SIMJA document numbers
    const normalizedSimjaDocuments = (simjaDocuments || []).map((doc: any) => ({
      ...doc,
      document_number: normalizeDocumentNumber(doc.document_number)
    }));

    // Generate "Berdasarkan" text from SIMJA documents
    const basedOnText = generateBasedOnText(normalizedSimjaDocuments);

    // Generate QR Code data
    const qrData = `${user.id}-${Date.now()}`;

    // Create submission with all related data in transaction
    const submission = await prisma.submission.create({
      data: {
        // Basic submission data
        vendor_name: submissionData.vendor_name,
        based_on: basedOnText,
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
        holiday_working_hours: submissionData.holiday_working_hours || null,
        work_facilities: submissionData.work_facilities,
        worker_names: submissionData.worker_names,
        worker_count: submissionData.worker_count && !isNaN(Number(submissionData.worker_count)) 
          ? Number(submissionData.worker_count) 
          : (workers?.length || null),
        
        // User data (denormalized for preservation)
        user_id: user.id,
        user_email: userExists.email,
        user_officer_name: userExists.officer_name,
        user_vendor_name: userExists.vendor_name,
        user_phone_number: userExists.phone_number,
        user_address: userExists.address,
        vendor_phone: userExists.phone_number,
        
        // QR Code
        qrcode: qrData,
        
        // Default statuses
        review_status: 'PENDING_REVIEW',
        approval_status: 'PENDING_APPROVAL',
      },
      select: {
        id: true,
        simlok_number: true,
        vendor_name: true,
        officer_name: true,
        job_description: true,
        work_location: true,
        implementation: true,
        based_on: true,
        review_status: true,
        approval_status: true,
        qrcode: true,
        created_at: true,
        user_id: true,
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

    // Create workers if provided
    if (workers && Array.isArray(workers) && workers.length > 0) {
      const workersData = workers.map((worker: any) => ({
        worker_name: worker.worker_name || worker.name,
        worker_photo: worker.worker_photo || worker.photo || null,
        hsse_pass_number: worker.hsse_pass_number || null,
        hsse_pass_valid_thru: worker.hsse_pass_valid_thru ? new Date(worker.hsse_pass_valid_thru) : null,
        hsse_pass_document_upload: worker.hsse_pass_document_upload || null,
        submission_id: submission.id,
      }));

      await prisma.workerList.createMany({
        data: workersData,
      });

      logger.info('SubmissionService', 'Workers created', {
        submissionId: submission.id,
        count: workersData.length
      });
    }

    // Prepare all support documents
    const allDocuments: any[] = [];

    // SIMJA documents
    if (simjaDocuments && Array.isArray(simjaDocuments) && simjaDocuments.length > 0) {
      const simjaDocs = simjaDocuments
        .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
        .map((doc: any) => ({
          document_subtype: doc.document_subtype || 'Ast. Man. Facility Management',
          document_type: 'SIMJA',
          document_number: normalizeDocumentNumber(doc.document_number),
          document_date: doc.document_date ? new Date(doc.document_date) : null,
          document_upload: doc.document_upload,
          submission_id: submission.id,
          uploaded_by: user.id,
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
          uploaded_by: user.id,
          uploaded_at: new Date(),
        }));
      allDocuments.push(...sikaDocs);
    }

    // Work Order documents
    if (workOrderDocuments && Array.isArray(workOrderDocuments) && workOrderDocuments.length > 0) {
      const workOrderDocs = workOrderDocuments
        .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
        .map((doc: any) => ({
          document_subtype: null,
          document_type: 'WORK_ORDER',
          document_number: normalizeDocumentNumber(doc.document_number),
          document_date: doc.document_date ? new Date(doc.document_date) : null,
          document_upload: doc.document_upload,
          submission_id: submission.id,
          uploaded_by: user.id,
          uploaded_at: new Date(),
        }));
      allDocuments.push(...workOrderDocs);
    }

    // Kontrak Kerja documents
    if (kontrakKerjaDocuments && Array.isArray(kontrakKerjaDocuments) && kontrakKerjaDocuments.length > 0) {
      const kontrakDocs = kontrakKerjaDocuments
        .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
        .map((doc: any) => ({
          document_subtype: null,
          document_type: 'KONTRAK_KERJA',
          document_number: normalizeDocumentNumber(doc.document_number),
          document_date: doc.document_date ? new Date(doc.document_date) : null,
          document_upload: doc.document_upload,
          submission_id: submission.id,
          uploaded_by: user.id,
          uploaded_at: new Date(),
        }));
      allDocuments.push(...kontrakDocs);
    }

    // JSA documents
    if (jsaDocuments && Array.isArray(jsaDocuments) && jsaDocuments.length > 0) {
      const jsaDocs = jsaDocuments
        .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
        .map((doc: any) => ({
          document_subtype: null,
          document_type: 'JSA',
          document_number: normalizeDocumentNumber(doc.document_number),
          document_date: doc.document_date ? new Date(doc.document_date) : null,
          document_upload: doc.document_upload,
          submission_id: submission.id,
          uploaded_by: user.id,
          uploaded_at: new Date(),
        }));
      allDocuments.push(...jsaDocs);
    }

    // Save all support documents
    if (allDocuments.length > 0) {
      await prisma.supportDocument.createMany({
        data: allDocuments,
      });

      logger.info('SubmissionService', 'Support documents created', {
        submissionId: submission.id,
        counts: {
          simja: simjaDocuments?.length || 0,
          sika: sikaDocuments?.length || 0,
          workOrder: workOrderDocuments?.length || 0,
          kontrakKerja: kontrakKerjaDocuments?.length || 0,
          jsa: jsaDocuments?.length || 0,
          total: allDocuments.length
        }
      });
    }

    // Notify admins about new submission
    try {
      await notifyAdminNewSubmission(submission.id);
    } catch (error) {
      logger.error('SubmissionService', 'Failed to send notification', error, {
        submissionId: submission.id
      });
      // Don't fail the request if notification fails
    }

    logger.info('SubmissionService', 'Submission created successfully', {
      submissionId: submission.id,
      vendorId: user.id,
      workersCount: workers?.length || 0,
      documentsCount: allDocuments.length,
    });

    // Format dates and return
    return formatSubmissionDates(submission);
  }

  /**
   * Update submission
   */
  async updateSubmission(submissionId: string, data: any, session: Session) {
    const { user } = session;

    // Check submission exists and user has permission
    const existing = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!existing) {
      throw new Error('Submission not found');
    }

    if (user.role === 'VENDOR' && existing.user_id !== user.id) {
      throw new Error('Forbidden');
    }

    // Only allow editing if not yet reviewed
    if (existing.review_status !== 'PENDING_REVIEW') {
      throw new Error('Cannot edit submission after review');
    }

    // Prepare update data
    const updateData: any = {};
    
    if (data.vendor_name !== undefined) updateData.vendor_name = data.vendor_name;
    if (data.officer_name !== undefined) updateData.officer_name = data.officer_name;
    if (data.job_description !== undefined) updateData.job_description = data.job_description;
    if (data.work_location !== undefined) updateData.work_location = data.work_location;
    if (data.implementation !== undefined) updateData.implementation = data.implementation;
    if (data.working_hours !== undefined) updateData.working_hours = data.working_hours;
    if (data.holiday_working_hours !== undefined) updateData.holiday_working_hours = data.holiday_working_hours;
    if (data.work_facilities !== undefined) updateData.work_facilities = data.work_facilities;
    if (data.worker_names !== undefined) updateData.worker_names = data.worker_names;
    if (data.signer_name !== undefined) updateData.signer_name = data.signer_name || null;
    if (data.signer_position !== undefined) updateData.signer_position = data.signer_position || null;
    if (data.implementation_start_date !== undefined) updateData.implementation_start_date = data.implementation_start_date || null;
    if (data.implementation_end_date !== undefined) updateData.implementation_end_date = data.implementation_end_date || null;
    if (data.vendor_phone !== undefined) updateData.vendor_phone = data.vendor_phone;
    if (data.workers !== undefined) updateData.worker_count = data.workers?.length || 0;

    // Handle support documents if provided
    if (data.support_documents) {
      const normalizedSupportDocs = data.support_documents.map((doc: any) => ({
        ...doc,
        document_number: doc.document_number ? normalizeDocumentNumber(doc.document_number) : null,
      }));

      const simjaDocuments = normalizedSupportDocs.filter(
        (doc: any) => doc.document_type === 'SIMJA'
      );
      updateData.based_on = generateBasedOnText(simjaDocuments);
    }

    // Update submission
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: updateData,
      include: {
        user: true,
        worker_list: true,
        support_documents: true,
      },
    });

    logger.info('SubmissionService', 'Submission updated', {
      submissionId,
      vendorId: user.id,
    });

    return formatSubmissionDates(updated);
  }

  /**
   * Delete submission
   */
  async deleteSubmission(submissionId: string, session: Session) {
    const { user } = session;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Check permissions
    if (user.role === 'VENDOR' && submission.user_id !== user.id) {
      throw new Error('Forbidden');
    }

    // Only allow deletion if not yet reviewed
    if (submission.review_status !== 'PENDING_REVIEW') {
      throw new Error('Cannot delete submission after review');
    }

    await prisma.submission.delete({
      where: { id: submissionId },
    });

    logger.info('SubmissionService', 'Submission deleted', {
      submissionId,
      vendorId: user.id,
    });

    return { deleted: true };
  }

  /**
   * Get submission statistics
   */
  async getStats(session: Session) {
    const { user } = session;
    const where: any = user.role === 'VENDOR' ? { user_id: user.id } : {};

    const [total, pendingReview, approved, rejected] = await Promise.all([
      prisma.submission.count({ where }),
      prisma.submission.count({
        where: { ...where, review_status: 'PENDING_REVIEW' },
      }),
      prisma.submission.count({
        where: { ...where, approval_status: 'APPROVED' },
      }),
      prisma.submission.count({
        where: {
          ...where,
          OR: [
            { review_status: 'NOT_MEETS_REQUIREMENTS' },
            { approval_status: 'REJECTED' },
          ],
        },
      }),
    ]);

    return {
      total,
      pending: pendingReview,
      approved,
      rejected,
    };
  }

  /**
   * Get submission by ID with full relations and optional PDF generation
   */
  async getSubmissionByIdWithRelations(
    submissionId: string,
    session: Session
  ) {
    const { role, id: userId } = session.user;
    
    // Build role-based filter
    const whereClause: any = { id: submissionId };
    
    switch (role) {
      case 'VENDOR':
        whereClause.user_id = userId;
        break;
      case 'VISITOR':
        whereClause.approval_status = 'APPROVED';
        break;
      // Other roles can view all submissions
    }

    const submission = await prisma.submission.findFirst({
      where: whereClause,
      select: {
        id: true,
        simlok_number: true,
        simlok_date: true,
        vendor_name: true,
        officer_name: true,
        job_description: true,
        work_location: true,
        working_hours: true,
        work_facilities: true,
        worker_names: true,
        worker_count: true,
        implementation_start_date: true,
        implementation_end_date: true,
        implementation: true,
        based_on: true,
        review_status: true,
        approval_status: true,
        qrcode: true,
        created_at: true,
        reviewed_at: true,
        approved_at: true,
        user_id: true,
        user_email: true,
        user_phone_number: true,
        user_address: true,
        user_vendor_name: true,
        user_officer_name: true,
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            worker_photo: true,
            hsse_pass_number: true,
            hsse_pass_valid_thru: true,
            created_at: true,
          },
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
      throw new Error('Submission not found');
    }

    return formatSubmissionDates(submission);
  }

  /**
   * Generate auto SIMLOK number
   */
  private async generateSimlokNumber(): Promise<string> {
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const now = new Date(jakartaNow);
    const year = now.getFullYear();

    const lastSubmission = await prisma.submission.findFirst({
      where: {
        simlok_number: {
          not: null,
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
      const match = lastSubmission.simlok_number.match(/^(\d+)\/S00330\/\d{4}$/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `${nextNumber}/S00330/${year}-S0`;
  }

  /**
   * Update submission by ID with role-based permissions
   */
  async updateSubmissionById(
    submissionId: string,
    data: any,
    session: Session
  ) {
    const { role, id: userId } = session.user;
    
    // Fetch existing submission
    const existingSubmission = await prisma.submission.findFirst({
      where: { 
        id: submissionId,
        ...(role === 'VENDOR' ? { user_id: userId } : {})
      }
    });

    if (!existingSubmission) {
      throw new Error('Submission not found or access denied');
    }

    // Permission checks
    if (role === 'VENDOR') {
      if (existingSubmission.user_id !== userId) {
        throw new Error('Access denied');
      }
      if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
        throw new Error('Can only edit pending submissions');
      }
    } else if (role === 'REVIEWER' || role === 'APPROVER') {
      if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
        throw new Error('Can only edit pending submissions');
      }
      if (role === 'APPROVER' && existingSubmission.review_status !== 'MEETS_REQUIREMENTS') {
        throw new Error('Can only edit submissions that meet requirements');
      }
    }

    const updateData: any = {};
    let statusChanged = false;
    let newStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | undefined;

    // Handle VERIFIER approval
    if (role === 'VERIFIER' && data.status_approval_admin) {
      if (!['APPROVED', 'REJECTED'].includes(data.status_approval_admin)) {
        throw new Error('Invalid approval status');
      }

      const adminUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!adminUser) {
        throw new Error('Your session is no longer valid. Please log out and log back in.');
      }

      updateData.approval_status = data.status_approval_admin;
      updateData.simlok_date = data.tanggal_simlok ? new Date(data.tanggal_simlok) : undefined;

      if (existingSubmission.approval_status !== data.status_approval_admin) {
        statusChanged = true;
        newStatus = data.status_approval_admin;
      }

      if (data.status_approval_admin === 'APPROVED') {
        // Import here to avoid circular dependency
        const { generateQrString } = await import('@/lib/auth/qrSecurity');
        
        updateData.simlok_number = await this.generateSimlokNumber();
        updateData.implementation = data.pelaksanaan;
        updateData.content = data.content;
        updateData.signer_position = data.jabatan_signer;
        updateData.signer_name = data.nama_signer;
        
        if (data.implementation_start_date) {
          updateData.implementation_start_date = new Date(data.implementation_start_date);
        }
        if (data.implementation_end_date) {
          updateData.implementation_end_date = new Date(data.implementation_end_date);
        }
        
        updateData.qrcode = generateQrString({
          id: submissionId,
          implementation_start_date: data.implementation_start_date ? new Date(data.implementation_start_date) : null,
          implementation_end_date: data.implementation_end_date ? new Date(data.implementation_end_date) : null,
        });
        
        updateData.approved_by = userId;
      }
    }

    // Perform update
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: updateData,
      select: {
        id: true,
        simlok_number: true,
        vendor_name: true,
        officer_name: true,
        job_description: true,
        review_status: true,
        approval_status: true,
        created_at: true,
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

    // Notify vendor if status changed
    if (statusChanged && newStatus && existingSubmission.user_id) {
      const { notifyVendorStatusChange } = await import('@/lib/notification/events');
      await notifyVendorStatusChange(existingSubmission.user_id, submissionId, newStatus);
    }

    return updatedSubmission;
  }

  /**
   * Delete submission by ID with permission checks
   */
  async deleteSubmissionById(submissionId: string, session: Session) {
    const { role, id: userId } = session.user;
    
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: submissionId }
    });

    if (!existingSubmission) {
      throw new Error('Submission not found');
    }

    // Permission checks
    if (role === 'VENDOR') {
      if (existingSubmission.user_id !== userId) {
        throw new Error('Access denied. You can only delete your own submissions.');
      }
      if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
        throw new Error('Can only delete pending submissions. Approved or rejected submissions cannot be deleted.');
      }
    } else if (role === 'VERIFIER') {
      if (existingSubmission.approval_status === 'APPROVED') {
        throw new Error('Cannot delete approved submissions.');
      }
    } else if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new Error('Invalid role. Only admins, verifiers, and vendors can delete submissions.');
    }

    // Clean up notifications
    const { cleanupSubmissionNotifications } = await import('@/lib/notification/notificationCleanup');
    await cleanupSubmissionNotifications(submissionId);

    // Delete submission
    await prisma.submission.delete({
      where: { id: submissionId }
    });

    return {
      message: 'Submission deleted successfully',
      deletedId: submissionId
    };
  }

  /**
   * Get submissions for export with detailed relations
   */
  async getSubmissionsForExport(
    user: { id: string; role: string },
    filters: {
      reviewStatus?: string | undefined;
      approvalStatus?: string | undefined;
      search?: string | undefined;
      startDate?: string | undefined;
      endDate?: string | undefined;
    }
  ) {
    // Build role-based filter
    const whereClause: any = {};
    
    switch (user.role) {
      case 'VENDOR':
        whereClause.user_id = user.id;
        break;
      case 'REVIEWER':
        whereClause.review_status = { in: ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] };
        break;
      case 'APPROVER':
        whereClause.review_status = 'MEETS_REQUIREMENTS';
        whereClause.approval_status = { in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] };
        break;
      case 'VERIFIER':
        whereClause.approval_status = 'APPROVED';
        break;
      // SUPER_ADMIN and others can see all
    }

    // Apply filters
    if (filters.reviewStatus) {
      whereClause.review_status = filters.reviewStatus;
    }
    if (filters.approvalStatus) {
      whereClause.approval_status = filters.approvalStatus;
    }
    if (filters.search) {
      whereClause.OR = [
        { vendor_name: { contains: filters.search } },
        { job_description: { contains: filters.search } },
        { officer_name: { contains: filters.search } },
      ];
    }
    if (filters.startDate || filters.endDate) {
      whereClause.created_at = {};
      if (filters.startDate) whereClause.created_at.gte = new Date(filters.startDate);
      if (filters.endDate) whereClause.created_at.lte = new Date(filters.endDate);
    }

    return await prisma.submission.findMany({
      where: whereClause,
      select: {
        id: true,
        simlok_number: true,
        simlok_date: true,
        vendor_name: true,
        vendor_phone: true,
        officer_name: true,
        job_description: true,
        work_location: true,
        work_facilities: true,
        working_hours: true,
        holiday_working_hours: true,
        worker_count: true,
        implementation_start_date: true,
        implementation_end_date: true,
        review_status: true,
        approval_status: true,
        reviewed_by: true,
        approved_by: true,
        signer_position: true,
        note_for_approver: true,
        note_for_vendor: true,
        created_at: true,
        reviewed_at: true,
        approved_at: true,
        user_email: true,
        support_documents: {
          select: {
            id: true,
            document_type: true,
            document_subtype: true,
            document_number: true,
            document_date: true,
          },
        },
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            hsse_pass_number: true,
            hsse_pass_valid_thru: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Approve or reject submission (final approval by approver)
   * Includes SIMLOK number generation with retry logic for conflicts
   */
  async approveOrRejectSubmission(
    submissionId: string,
    approverId: string,
    approverName: string,
    data: {
      approval_status: 'APPROVED' | 'REJECTED';
      note_for_vendor?: string;
      simlok_date?: string;
    }
  ) {
    const { toJakartaISOString } = await import('@/lib/helpers/timezone');
    const { generateQrString } = await import('@/lib/auth/qrSecurity');

    // Get submission data first
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        user_id: true,
        review_status: true,
        approval_status: true,
        implementation_start_date: true,
        implementation_end_date: true,
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
      },
    });
    
    if (!existingSubmission) {
      throw new Error('Submission tidak ditemukan');
    }

    if (existingSubmission.review_status === 'PENDING_REVIEW') {
      throw new Error('Submission belum direview');
    }
    
    if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
      throw new Error('Submission sudah diproses sebelumnya');
    }

    // Get approver details
    const approverUser = await prisma.user.findUnique({
      where: { id: approverId },
      select: { id: true, officer_name: true, position: true, email: true },
    });
    
    if (!approverUser) {
      throw new Error('Approver user not found in database');
    }

    // Base update data
    let updateData: any = {
      approval_status: data.approval_status,
      note_for_vendor: data.note_for_vendor || '',
      approved_at: new Date(),
      approved_by: approverName,
      approved_by_final_id: approverId,
      signer_name: approverUser.officer_name,
      signer_position: approverUser.position || 'Sr Officer Security III',
    };

    // Retry logic for SIMLOK number generation
    const MAX_RETRIES = 5;
    let updatedSubmission: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info('SubmissionService', `Approval attempt ${attempt}/${MAX_RETRIES} for submission ${submissionId}`);

        const result = await prisma.$transaction(async tx => {
          if (data.approval_status === 'APPROVED') {
            // Generate SIMLOK number inside transaction
            const simlokNumber = await this.generateSimlokNumberInTransaction(tx);
            const jakartaToday = toJakartaISOString(new Date())?.split('T')[0] ?? new Date().toISOString().split('T')[0];
            const qrString = generateQrString({
              id: submissionId,
              implementation_start_date: existingSubmission.implementation_start_date || new Date(),
              implementation_end_date: existingSubmission.implementation_end_date || new Date(),
            });

            updateData = {
              ...updateData,
              simlok_number: simlokNumber,
              simlok_date: new Date((data.simlok_date || jakartaToday) as string),
              qrcode: qrString,
            };
          }

          return tx.submission.update({ where: { id: submissionId }, data: updateData });
        }, {
          maxWait: 5000,
          timeout: 10000,
          isolationLevel: 'Serializable',
        });

        updatedSubmission = result;
        logger.info('SubmissionService', `Approval successful on attempt ${attempt}`);
        break;
      } catch (error: any) {
        const isSimlokConflict =
          error?.code === 'P2002' ||
          error?.message?.includes('Unique constraint') ||
          error?.message?.includes('simlok_number');

        if (isSimlokConflict && attempt < MAX_RETRIES) {
          const baseWait = Math.pow(2, attempt) * 100;
          const jitter = Math.random() * baseWait;
          const waitMs = baseWait + jitter;
          logger.warn('SubmissionService', `SIMLOK conflict detected, waiting ${Math.round(waitMs)}ms before retry`);
          await new Promise(res => setTimeout(res, waitMs));
          continue;
        }
        throw error;
      }
    }

    return { updatedSubmission, existingSubmission };
  }

  /**
   * Generate SIMLOK number within a transaction (with FOR UPDATE lock)
   */
  private async generateSimlokNumberInTransaction(tx: any): Promise<string> {
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const year = new Date(jakartaNow).getFullYear();

    const result = await tx.$queryRaw<Array<{ max_number: bigint | null }>>`
      SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(simlok_number, '/', 1) AS UNSIGNED)), 0) as max_number
      FROM Submission
      WHERE simlok_number IS NOT NULL
      FOR UPDATE
    `;

    const currentMax = result[0]?.max_number ? Number(result[0].max_number) : 0;
    const nextNumber = currentMax + 1;
    
    logger.info('SubmissionService', `Generated SIMLOK number: ${nextNumber} (previous max: ${currentMax})`);
    
    return `${nextNumber}/S00330/${year}-S0`;
  }

  /**
   * Review submission (set review status and notes, optionally update fields)
   */
  async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    reviewerName: string,
    data: {
      review_status: 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
      note_for_approver?: string;
      note_for_vendor?: string;
      working_hours?: string | null;
      holiday_working_hours?: string | null;
      implementation?: string | null;
      content?: string | null;
      implementation_start_date?: string | null;
      implementation_end_date?: string | null;
    }
  ) {
    // Check if submission exists
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: submissionId }
    });

    if (!existingSubmission) {
      throw new Error('Submission tidak ditemukan');
    }

    // Check if submission can be reviewed
    if (existingSubmission.review_status !== 'PENDING_REVIEW' && 
        existingSubmission.approval_status !== 'PENDING_APPROVAL') {
      throw new Error('Review tidak dapat diubah karena submission sudah disetujui/ditolak oleh approver');
    }

    // Prepare update data
    const updateData: any = {
      review_status: data.review_status,
      note_for_approver: data.note_for_approver || '',
      note_for_vendor: data.note_for_vendor || '',
      reviewed_at: new Date(),
      reviewed_by: reviewerName,
    };

    // Update editable fields if provided by reviewer
    if (data.working_hours !== undefined) {
      updateData.working_hours = data.working_hours;
    }
    if (data.holiday_working_hours !== undefined) {
      updateData.holiday_working_hours = data.holiday_working_hours;
    }
    if (data.implementation !== undefined) {
      updateData.implementation = data.implementation;
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (data.implementation_start_date !== undefined) {
      updateData.implementation_start_date = data.implementation_start_date ? new Date(data.implementation_start_date) : null;
    }
    if (data.implementation_end_date !== undefined) {
      updateData.implementation_end_date = data.implementation_end_date ? new Date(data.implementation_end_date) : null;
    }

    logger.info('SubmissionService', `Review update for submission ${submissionId}: ${updateData.review_status}`);

    // Update submission with review status
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: updateData,
      select: {
        id: true,
        simlok_number: true,
        vendor_name: true,
        officer_name: true,
        job_description: true,
        review_status: true,
        approval_status: true,
        note_for_vendor: true,
        user_id: true,
        created_at: true,
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            worker_photo: true,
          },
          orderBy: { created_at: 'asc' }
        },
        support_documents: {
          select: {
            id: true,
            document_type: true,
            document_subtype: true,
            document_number: true,
            document_date: true,
            uploaded_at: true,
          },
          orderBy: { uploaded_at: 'asc' }
        }
      }
    });

    return updatedSubmission;
  }

  /**
   * Resubmit submission (vendor resubmits after fixing issues)
   */
  async resubmitSubmission(submissionId: string, vendorId: string, vendorName?: string) {
    // Check if submission exists and belongs to this vendor
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        user_id: true,
        review_status: true,
        approval_status: true,
        note_for_vendor: true,
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        }
      }
    });

    if (!existingSubmission) {
      throw new Error('Submission tidak ditemukan');
    }

    // Verify ownership
    if (existingSubmission.user_id !== vendorId) {
      throw new Error('Anda tidak memiliki akses untuk mengirim ulang submission ini');
    }

    // Only allow resubmit if review status is NOT_MEETS_REQUIREMENTS
    if (existingSubmission.review_status !== 'NOT_MEETS_REQUIREMENTS') {
      throw new Error('Submission ini tidak dalam status perlu perbaikan');
    }

    logger.info('SubmissionService', `Vendor resubmitting submission ${submissionId} after revision`);

    // Update submission status to PENDING_REVIEW for re-review
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        review_status: 'PENDING_REVIEW',
        approval_status: 'PENDING_APPROVAL',
        reviewed_at: null,
        reviewed_by: null,
        note_for_approver: null,
        note_for_vendor: null,
      },
      select: {
        id: true,
        simlok_number: true,
        vendor_name: true,
        officer_name: true,
        job_description: true,
        review_status: true,
        approval_status: true,
        user_id: true,
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            worker_photo: true,
          },
          orderBy: { created_at: 'asc' }
        },
        support_documents: {
          select: {
            id: true,
            document_type: true,
            document_subtype: true,
            document_number: true,
            document_date: true,
            uploaded_at: true,
          },
          orderBy: { uploaded_at: 'asc' }
        }
      }
    });

    return { updatedSubmission, vendorName: vendorName || 'Vendor' };
  }
}

// Export singleton instance
export const submissionService = new SubmissionService();
