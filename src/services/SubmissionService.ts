/**
 * Submission Service
 * Business logic for submission management
 * Handles CRUD operations, workflow transitions, and validation
 */

import { prisma } from '@/lib/singletons';
import { logger } from '@/lib/logger';
import { 
  ReviewStatus, 
  ApprovalStatus,
  UserRole,
  isUserRole 
} from '@/types/enums';
import { notifyAdminNewSubmission } from '@/server/events';
import { formatSubmissionDates } from '@/lib/timezone';

// ==================== TYPE DEFINITIONS ====================

export interface CreateSubmissionData {
  // Basic submission data
  vendor_name: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation_start_date?: string | Date | null;
  implementation_end_date?: string | Date | null;
  working_hours: string;
  holiday_working_hours?: string | null;
  work_facilities: string;
  worker_names: string;
  worker_count?: number | null;

  // User data
  user_id: string;
  user_email: string;
  user_officer_name: string;
  user_vendor_name: string | null;
  user_phone_number: string | null;
  user_address: string | null;
  vendor_phone: string | null;

  // Documents
  workers?: WorkerData[];
  simjaDocuments?: DocumentData[];
  sikaDocuments?: DocumentData[];
  workOrderDocuments?: DocumentData[];
  kontrakKerjaDocuments?: DocumentData[];
  jsaDocuments?: DocumentData[];
}

export interface WorkerData {
  worker_name: string;
  worker_photo?: string | null;
  hsse_pass_number?: string | null;
  hsse_pass_valid_thru?: string | Date | null;
  hsse_pass_document_upload?: string | null;
}

export interface DocumentData {
  document_subtype?: string | null;
  document_number?: string | null;
  document_date?: string | Date | null;
  document_upload: string;
}

export interface SubmissionFilters {
  userId?: string;
  role?: string;
  status?: string;
  reviewStatus?: string;
  approvalStatus?: string;
  vendorName?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeStats?: boolean;
}

export interface WorkflowTransitionData {
  submissionId: string;
  userId: string;
  userRole: string;
  action: string;
  notes?: string;
  implementationDateStart?: string | Date | null;
  implementationDateEnd?: string | Date | null;
  // Additional fields for review
  data?: {
    working_hours?: string | null;
    holiday_working_hours?: string | null;
    implementation?: string | null;
    content?: string | null;
    implementation_start_date?: string | null;
    implementation_end_date?: string | null;
    note_for_approver?: string;
    note_for_vendor?: string;
  };
  // Additional fields for approval
  simlokNumber?: string;
  simlokDate?: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalize document number
 * - Convert to uppercase
 * - Remove "No." or "No" prefix at the beginning
 * Examples:
 *   "simja/0202" -> "SIMJA/0202"
 *   "No. 096/SIMJA/S0700/2024-S0" -> "096/SIMJA/S0700/2024-S0"
 */
function normalizeDocumentNumber(docNumber: string | null | undefined): string | null {
  if (!docNumber || typeof docNumber !== 'string') {
    return null;
  }

  let normalized = docNumber.trim();
  normalized = normalized.replace(/^no\.?\s*/i, '');
  normalized = normalized.toUpperCase();
  
  return normalized || null;
}

/**
 * Generate "Berdasarkan" text from SIMJA documents
 */
function generateBasedOnText(simjaDocuments: DocumentData[]): string {
  logger.debug('SubmissionService', 'Generating based_on text', {
    documentsCount: simjaDocuments?.length || 0
  });
  
  if (!simjaDocuments || simjaDocuments.length === 0) {
    return 'Surat Permohonan Izin Kerja'; // Default text
  }

  const validSimjaDocs = simjaDocuments.filter(
    doc => doc.document_number && doc.document_number.trim() !== '' &&
           doc.document_date && doc.document_date.toString().trim() !== ''
  );

  if (validSimjaDocs.length === 0) {
    return 'Surat Permohonan Izin Kerja';
  }

  const simjaStrings = validSimjaDocs.map((doc) => {
    const number = doc.document_number || '';
    const date = doc.document_date || '';
    
    // Format date from YYYY-MM-DD to readable format
    let formattedDate = date.toString();
    if (date && date.toString().includes('-')) {
      try {
        const dateParts = date.toString().split('-');
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
        logger.warn('SubmissionService', 'Date parsing error', { error: e, date });
      }
    }

    return `Simja No. ${number} Tgl. ${formattedDate}`;
  });

  return simjaStrings.join(', ');
}

// ==================== SUBMISSION SERVICE ====================

export class SubmissionService {
  /**
   * Get submissions with role-based filtering
   */
  static async getSubmissions(filters: SubmissionFilters) {
    try {
      const {
        userId,
        role,
        status,
        reviewStatus,
        approvalStatus,
        vendorName,
        search,
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc',
        includeStats = false,
      } = filters;

      const skip = (page - 1) * limit;
      const whereClause: any = {};

      // Role-based filtering
      if (role && isUserRole(role)) {
        switch (role) {
          case UserRole.VENDOR:
            whereClause.user_id = userId;
            break;
          
          case UserRole.REVIEWER:
            if (!status) {
              whereClause.review_status = { 
                in: ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] 
              };
            }
            break;
            
          case UserRole.APPROVER:
            if (!status) {
              whereClause.review_status = { 
                in: ['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] 
              };
              whereClause.approval_status = { 
                in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] 
              };
            }
            break;
            
          case UserRole.VERIFIER:
            if (!status) {
              whereClause.approval_status = 'APPROVED';
            }
            break;
            
          case UserRole.SUPER_ADMIN:
            // No additional filtering for admin
            break;
            
          default:
            throw new Error(`Invalid role: ${role}`);
        }
      }

      // Status filters
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
      
      if (approvalStatus) {
        whereClause.approval_status = approvalStatus;
      }

      // Vendor name filter
      if (vendorName && role !== UserRole.VENDOR) {
        whereClause.vendor_name = { contains: vendorName };
      }

      // Search functionality
      if (search) {
        whereClause.OR = [
          { vendor_name: { contains: search } },
          { officer_name: { contains: search } },
          { job_description: { contains: search } },
          { work_location: { contains: search } },
          { worker_names: { contains: search } }
        ];
      }

      // Query database
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
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        prisma.submission.count({ where: whereClause }),
      ]);

      // Format dates
      const formattedSubmissions = submissions.map((s: any) => formatSubmissionDates(s));

      const response: any = {
        submissions: formattedSubmissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      };

      // Include statistics for admin
      if (includeStats && role === UserRole.SUPER_ADMIN) {
        const statistics = await prisma.submission.groupBy({
          by: ['approval_status'],
          _count: { approval_status: true }
        });

        response.statistics = {
          total: total,
          pending: statistics.find(s => s.approval_status === 'PENDING_APPROVAL')?._count.approval_status || 0,
          approved: statistics.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
          rejected: statistics.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0,
        };
      }

      logger.info('SubmissionService', 'Submissions retrieved', {
        userId,
        role,
        total,
        page,
      });

      return response;
    } catch (error) {
      logger.error('SubmissionService', 'Error fetching submissions', error, filters);
      throw error;
    }
  }

  /**
   * Create new submission
   */
  static async createSubmission(data: CreateSubmissionData) {
    try {
      // Normalize SIMJA documents
      const normalizedSimjaDocuments = (data.simjaDocuments || []).map((doc) => ({
        ...doc,
        document_number: normalizeDocumentNumber(doc.document_number)
      }));

      // Generate "Berdasarkan" text
      const basedOnText = generateBasedOnText(normalizedSimjaDocuments);

      // Generate QR Code
      const qrData = `${data.user_id}-${Date.now()}`;

      logger.info('SubmissionService', 'Creating submission', {
        userId: data.user_id,
        vendorName: data.vendor_name,
        workersCount: data.workers?.length || 0,
        documentsCount: (data.simjaDocuments?.length || 0) + (data.sikaDocuments?.length || 0),
      });

      // Create submission in transaction
      const submission = await prisma.submission.create({
        data: {
          // Basic submission data
          vendor_name: data.vendor_name,
          based_on: basedOnText,
          officer_name: data.officer_name,
          job_description: data.job_description,
          work_location: data.work_location,
          implementation_start_date: data.implementation_start_date 
            ? new Date(data.implementation_start_date) 
            : null,
          implementation_end_date: data.implementation_end_date 
            ? new Date(data.implementation_end_date) 
            : null,
          working_hours: data.working_hours,
          holiday_working_hours: data.holiday_working_hours || null,
          work_facilities: data.work_facilities,
          worker_names: data.worker_names,
          worker_count: data.worker_count && !isNaN(Number(data.worker_count)) 
            ? Number(data.worker_count) 
            : null,
          
          // User data
          user_id: data.user_id,
          user_email: data.user_email,
          user_officer_name: data.user_officer_name,
          user_vendor_name: data.user_vendor_name,
          user_phone_number: data.user_phone_number,
          user_address: data.user_address,
          vendor_phone: data.vendor_phone,
          
          // QR Code
          qrcode: qrData,
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

      // Create workers
      if (data.workers && Array.isArray(data.workers) && data.workers.length > 0) {
        const workersData = data.workers.map((worker) => ({
          worker_name: worker.worker_name,
          worker_photo: worker.worker_photo || null,
          hsse_pass_number: worker.hsse_pass_number || null,
          hsse_pass_valid_thru: worker.hsse_pass_valid_thru 
            ? new Date(worker.hsse_pass_valid_thru) 
            : null,
          hsse_pass_document_upload: worker.hsse_pass_document_upload || null,
          submission_id: submission.id,
        }));

        await prisma.workerList.createMany({ data: workersData });

        logger.debug('SubmissionService', 'Workers created', {
          submissionId: submission.id,
          count: workersData.length,
        });
      }

      // Create support documents
      const allDocuments = [];

      // Process each document type
      const documentTypes = [
        { docs: normalizedSimjaDocuments, type: 'SIMJA', subtype: 'Ast. Man. Facility Management' },
        { docs: data.sikaDocuments, type: 'SIKA', subtype: null },
        { docs: data.workOrderDocuments, type: 'WORK_ORDER', subtype: null },
        { docs: data.kontrakKerjaDocuments, type: 'KONTRAK_KERJA', subtype: null },
        { docs: data.jsaDocuments, type: 'JSA', subtype: null },
      ];

      for (const { docs, type, subtype } of documentTypes) {
        if (docs && Array.isArray(docs) && docs.length > 0) {
          const filteredDocs = docs
            .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
            .map((doc: any) => ({
              document_subtype: doc.document_subtype || subtype,
              document_type: type,
              document_number: normalizeDocumentNumber(doc.document_number),
              document_date: doc.document_date ? new Date(doc.document_date) : null,
              document_upload: doc.document_upload,
              submission_id: submission.id,
              uploaded_by: data.user_id,
              uploaded_at: new Date(),
            }));
          allDocuments.push(...filteredDocs);
        }
      }

      // Save all documents
      if (allDocuments.length > 0) {
        await prisma.supportDocument.createMany({ data: allDocuments });

        logger.debug('SubmissionService', 'Support documents created', {
          submissionId: submission.id,
          total: allDocuments.length,
        });
      }

      // Notify admin
      await notifyAdminNewSubmission(submission.id);

      logger.info('SubmissionService', 'Submission created successfully', {
        submissionId: submission.id,
        userId: data.user_id,
      });

      // Format dates
      return formatSubmissionDates(submission);
    } catch (error) {
      logger.error('SubmissionService', 'Error creating submission', error, {
        userId: data.user_id,
      });
      throw error;
    }
  }

  /**
   * Get single submission by ID
   */
  static async getSubmissionById(id: string, userId?: string, userRole?: string) {
    try {
      const submission = await prisma.submission.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
              vendor_name: true,
              phone_number: true,
            }
          },
          support_documents: {
            orderBy: { uploaded_at: 'desc' }
          },
          worker_list: true,
        }
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Role-based access control
      if (userRole === UserRole.VENDOR && submission.user_id !== userId) {
        throw new Error('Access denied: You can only view your own submissions');
      }

      logger.info('SubmissionService', 'Submission retrieved', {
        submissionId: id,
        userId,
      });

      return formatSubmissionDates(submission);
    } catch (error) {
      logger.error('SubmissionService', 'Error fetching submission', error, { id, userId });
      throw error;
    }
  }

  /**
   * Update submission (VENDOR only, before approval)
   */
  static async updateSubmission(id: string, data: Partial<CreateSubmissionData>, userId: string) {
    try {
      // Verify ownership and status
      const existing = await prisma.submission.findUnique({
        where: { id },
        select: { 
          user_id: true, 
          approval_status: true,
          review_status: true,
        }
      });

      if (!existing) {
        throw new Error('Submission not found');
      }

      if (existing.user_id !== userId) {
        throw new Error('Access denied: You can only update your own submissions');
      }

      if (existing.approval_status !== 'PENDING_APPROVAL' || 
          existing.review_status !== 'PENDING_REVIEW') {
        throw new Error('Cannot update submission that is already in review or approved');
      }

      // Prepare update data (only include fields that are provided)
      const updateData: any = {};
      if (data.vendor_name) updateData.vendor_name = data.vendor_name;
      if (data.officer_name) updateData.officer_name = data.officer_name;
      if (data.job_description) updateData.job_description = data.job_description;
      if (data.work_location) updateData.work_location = data.work_location;
      if (data.working_hours) updateData.working_hours = data.working_hours;
      if (data.work_facilities) updateData.work_facilities = data.work_facilities;
      if (data.worker_names) updateData.worker_names = data.worker_names;
      if (data.worker_count !== undefined) updateData.worker_count = data.worker_count;

      // Update submission
      const updated = await prisma.submission.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          support_documents: true,
        }
      });

      logger.info('SubmissionService', 'Submission updated', {
        submissionId: id,
        userId,
      });

      return formatSubmissionDates(updated);
    } catch (error) {
      logger.error('SubmissionService', 'Error updating submission', error, { id, userId });
      throw error;
    }
  }

  /**
   * Delete submission (VENDOR only, before approval)
   */
  static async deleteSubmission(id: string, userId: string) {
    try {
      // Verify ownership and status
      const existing = await prisma.submission.findUnique({
        where: { id },
        select: { 
          user_id: true, 
          approval_status: true,
          review_status: true,
        }
      });

      if (!existing) {
        throw new Error('Submission not found');
      }

      if (existing.user_id !== userId) {
        throw new Error('Access denied: You can only delete your own submissions');
      }

      if (existing.approval_status !== 'PENDING_APPROVAL' || 
          existing.review_status !== 'PENDING_REVIEW') {
        throw new Error('Cannot delete submission that is already in review or approved');
      }

      // Delete submission (cascade will handle related records)
      await prisma.submission.delete({ where: { id } });

      logger.info('SubmissionService', 'Submission deleted', {
        submissionId: id,
        userId,
      });

      return { success: true, message: 'Submission deleted successfully' };
    } catch (error) {
      logger.error('SubmissionService', 'Error deleting submission', error, { id, userId });
      throw error;
    }
  }

  /**
   * Delete submission with notification cleanup (VENDOR or VERIFIER)
   */
  static async deleteSubmissionWithCleanup(id: string, userId: string, userRole: string) {
    try {
      // Fetch the submission first to check permissions
      const existing = await prisma.submission.findUnique({
        where: { id },
        select: { 
          user_id: true, 
          approval_status: true,
        }
      });

      if (!existing) {
        throw new Error('Submission not found');
      }

      // Permission checks based on role
      if (userRole === 'VENDOR') {
        // Vendors can only delete their own PENDING submissions
        if (existing.user_id !== userId) {
          throw new Error('Access denied. You can only delete your own submissions.');
        }
        
        if (existing.approval_status !== 'PENDING_APPROVAL') {
          throw new Error('Can only delete pending submissions. Approved or rejected submissions cannot be deleted.');
        }
      } else if (userRole === 'VERIFIER') {
        // Verifiers can delete pending and rejected submissions
        if (existing.approval_status === 'APPROVED') {
          throw new Error('Cannot delete approved submissions.');
        }
      } else {
        throw new Error('Invalid role. Only vendors and verifiers can delete submissions.');
      }

      // Clean up related notifications before deleting submission
      const { cleanupSubmissionNotifications } = await import('@/lib/notificationCleanup');
      await cleanupSubmissionNotifications(id);

      // Delete submission (cascade will handle related records)
      await prisma.submission.delete({ where: { id } });

      logger.info('SubmissionService', 'Submission deleted with cleanup', {
        submissionId: id,
        userId,
        userRole,
      });

      return { 
        success: true, 
        message: 'Submission deleted successfully',
        deletedId: id 
      };
    } catch (error) {
      logger.error('SubmissionService', 'Error deleting submission with cleanup', error, { id, userId, userRole });
      throw error;
    }
  }

  /**
   * Update submission as REVIEWER
   * Allows updating implementation dates, template fields, and worker list
   */
  static async updateAsReviewer(
    id: string, 
    data: {
      implementation_start_date?: Date | null;
      implementation_end_date?: Date | null;
      implementation?: string;
      content?: string;
      signer_position?: string;
      signer_name?: string;
      working_hours?: string;
      worker_count?: number;
      simja_number?: string;
      simja_date?: Date | null;
      sika_number?: string;
      sika_date?: Date | null;
      worker_list?: Array<{
        worker_name: string;
        worker_photo?: string | null;
        hsse_pass_number?: string | null;
        hsse_pass_valid_thru?: Date | null;
        hsse_pass_document_upload?: string | null;
      }>;
    }
  ) {
    try {
      const existing = await prisma.submission.findUnique({
        where: { id },
        select: { approval_status: true }
      });

      if (!existing) {
        throw new Error('Submission not found');
      }

      if (existing.approval_status !== 'PENDING_APPROVAL') {
        throw new Error('Can only edit pending submissions');
      }

      // Prepare update data
      const updateData: any = {};
      
      if (data.implementation_start_date !== undefined) {
        updateData.implementation_start_date = data.implementation_start_date;
      }
      if (data.implementation_end_date !== undefined) {
        updateData.implementation_end_date = data.implementation_end_date;
      }
      if (data.implementation) updateData.implementation = data.implementation;
      if (data.content) updateData.content = data.content;
      if (data.signer_position) updateData.signer_position = data.signer_position;
      if (data.signer_name) updateData.signer_name = data.signer_name;
      if (data.working_hours) updateData.working_hours = data.working_hours;
      if (data.worker_count !== undefined) updateData.worker_count = data.worker_count;
      if (data.simja_number) updateData.simja_number = data.simja_number;
      if (data.simja_date !== undefined) updateData.simja_date = data.simja_date;
      if (data.sika_number) updateData.sika_number = data.sika_number;
      if (data.sika_date !== undefined) updateData.sika_date = data.sika_date;

      // Handle worker_list update
      if (data.worker_list && Array.isArray(data.worker_list)) {
        // Remove existing workers
        await prisma.workerList.deleteMany({ where: { submission_id: id } });

        const validWorkers = data.worker_list.filter(w => w.worker_name && w.worker_name.trim() !== '');

        if (validWorkers.length > 0) {
          await prisma.workerList.createMany({
            data: validWorkers.map(w => ({
              worker_name: w.worker_name.trim(),
              worker_photo: w.worker_photo || null,
              hsse_pass_number: w.hsse_pass_number || null,
              hsse_pass_valid_thru: w.hsse_pass_valid_thru || null,
              hsse_pass_document_upload: w.hsse_pass_document_upload || null,
              submission_id: id
            }))
          });

          // Update worker_count if not explicitly provided
          if (data.worker_count === undefined) {
            updateData.worker_count = validWorkers.length;
          }
        }
      }

      // Update submission
      const updated = await prisma.submission.update({
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

      logger.info('SubmissionService', 'Submission updated by reviewer', {
        submissionId: id,
      });

      return formatSubmissionDates(updated);
    } catch (error) {
      logger.error('SubmissionService', 'Error updating submission as reviewer', error, { id });
      throw error;
    }
  }

  /**
   * Update submission as APPROVER
   * Similar to reviewer but can also update approval-related fields
   */
  static async updateAsApprover(
    id: string,
    data: {
      implementation_start_date?: Date | null;
      implementation_end_date?: Date | null;
      implementation?: string;
      content?: string;
      signer_position?: string;
      signer_name?: string;
      working_hours?: string;
      worker_count?: number;
      simja_number?: string;
      simja_date?: Date | null;
      sika_number?: string;
      sika_date?: Date | null;
    }
  ) {
    try {
      const existing = await prisma.submission.findUnique({
        where: { id },
        select: { approval_status: true }
      });

      if (!existing) {
        throw new Error('Submission not found');
      }

      if (existing.approval_status !== 'PENDING_APPROVAL') {
        throw new Error('Can only edit pending submissions');
      }

      // Prepare update data
      const updateData: any = {};
      
      if (data.implementation_start_date !== undefined) {
        updateData.implementation_start_date = data.implementation_start_date;
      }
      if (data.implementation_end_date !== undefined) {
        updateData.implementation_end_date = data.implementation_end_date;
      }
      if (data.implementation) updateData.implementation = data.implementation;
      if (data.content) updateData.content = data.content;
      if (data.signer_position) updateData.signer_position = data.signer_position;
      if (data.signer_name) updateData.signer_name = data.signer_name;
      if (data.working_hours) updateData.working_hours = data.working_hours;
      if (data.worker_count !== undefined) updateData.worker_count = data.worker_count;
      if (data.simja_number) updateData.simja_number = data.simja_number;
      if (data.simja_date !== undefined) updateData.simja_date = data.simja_date;
      if (data.sika_number) updateData.sika_number = data.sika_number;
      if (data.sika_date !== undefined) updateData.sika_date = data.sika_date;

      // Update submission
      const updated = await prisma.submission.update({
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

      logger.info('SubmissionService', 'Submission updated by approver', {
        submissionId: id,
      });

      return formatSubmissionDates(updated);
    } catch (error) {
      logger.error('SubmissionService', 'Error updating submission as approver', error, { id });
      throw error;
    }
  }

  /**
   * Workflow transition: Verify submission (VERIFIER)
   * Note: Schema doesn't have verification_status, using review_status
   */
  static async verifySubmission(data: WorkflowTransitionData) {
    try {
      const { submissionId, userId, action, notes } = data;

      if (!['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'].includes(action)) {
        throw new Error('Invalid action for verification');
      }

      const updated = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          review_status: action as ReviewStatus,
          reviewed_at: new Date(),
          reviewed_by: userId,
          note_for_vendor: notes || null,
        },
        include: { user: true }
      });

      logger.info('SubmissionService', 'Submission verified', {
        submissionId,
        action,
        verifiedBy: userId,
      });

      return formatSubmissionDates(updated);
    } catch (error) {
      logger.error('SubmissionService', 'Error verifying submission', error, data);
      throw error;
    }
  }

  /**
   * Workflow transition: Review submission (REVIEWER)
   */
  static async reviewSubmission(transitionData: WorkflowTransitionData) {
    try {
      const { submissionId, userId, action, notes, data } = transitionData;

      if (!['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'].includes(action)) {
        throw new Error('Invalid action for review');
      }

      // Build update data
      const updateData: any = {
        review_status: action as ReviewStatus,
        reviewed_at: new Date(),
        reviewed_by: userId,
        note_for_approver: data?.note_for_approver || notes || null,
        note_for_vendor: data?.note_for_vendor || null,
      };

      // Add editable fields if provided
      if (data?.working_hours !== undefined) {
        updateData.working_hours = data.working_hours;
      }
      if (data?.holiday_working_hours !== undefined) {
        updateData.holiday_working_hours = data.holiday_working_hours;
      }
      if (data?.implementation !== undefined) {
        updateData.implementation = data.implementation;
      }
      if (data?.content !== undefined) {
        updateData.content = data.content;
      }
      if (data?.implementation_start_date !== undefined) {
        updateData.implementation_start_date = data.implementation_start_date ? new Date(data.implementation_start_date) : null;
      }
      if (data?.implementation_end_date !== undefined) {
        updateData.implementation_end_date = data.implementation_end_date ? new Date(data.implementation_end_date) : null;
      }

      // Auto-reject logic
      if (action === 'NOT_MEETS_REQUIREMENTS') {
        updateData.approval_status = 'REJECTED';
        updateData.approved_at = new Date();
        updateData.approved_by = userId;
        updateData.approved_by_final_id = userId;
        logger.info('SubmissionService', 'Auto-rejecting submission (NOT_MEETS_REQUIREMENTS)', { submissionId });
      }

      const updated = await prisma.submission.update({
        where: { id: submissionId },
        data: updateData,
        include: { 
          user: true,
          worker_list: {
            orderBy: { created_at: 'asc' }
          },
          support_documents: {
            orderBy: { uploaded_at: 'asc' }
          }
        }
      });

      logger.info('SubmissionService', 'Submission reviewed', {
        submissionId,
        action,
        reviewedBy: userId,
      });

      return formatSubmissionDates(updated);
    } catch (error) {
      logger.error('SubmissionService', 'Error reviewing submission', error, transitionData);
      throw error;
    }
  }

  /**
   * Workflow transition: Approve submission (APPROVER)
   */
  static async approveSubmission(transitionData: WorkflowTransitionData) {
    try {
      const { 
        submissionId, 
        userId, 
        action, 
        notes, 
        implementationDateStart, 
        implementationDateEnd,
        simlokNumber,
        simlokDate 
      } = transitionData;

      if (!['APPROVED', 'REJECTED'].includes(action)) {
        throw new Error('Invalid action for approval');
      }

      // Get submission and approver details
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId }
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      const approver = await prisma.user.findUnique({
        where: { id: userId },
        select: { officer_name: true, position: true }
      });

      const updateData: any = {
        approval_status: action as ApprovalStatus,
        approved_at: new Date(),
        approved_by: approver?.officer_name || userId,
        approved_by_final_id: userId,
        note_for_vendor: notes || null,
        // Auto-fill signer info from approver
        signer_name: approver?.officer_name || null,
        signer_position: approver?.position || 'Sr Officer Security III',
      };

      // If approved, handle SIMLOK number and dates
      if (action === 'APPROVED') {
        if (implementationDateStart && implementationDateEnd) {
          updateData.implementation_start_date = new Date(implementationDateStart);
          updateData.implementation_end_date = new Date(implementationDateEnd);
        }

        // Generate or use provided SIMLOK number
        if (!simlokNumber) {
          // Auto-generate SIMLOK number
          const lastSubmission = await prisma.submission.findFirst({
            where: { simlok_number: { not: null } },
            orderBy: { created_at: 'desc' }
          });

          let nextNumber = 1;
          if (lastSubmission?.simlok_number) {
            const parts = lastSubmission.simlok_number.split('/');
            const firstPart = parts[0];
            if (firstPart) {
              const currentNumber = parseInt(firstPart, 10);
              if (!isNaN(currentNumber) && currentNumber > 0) {
                nextNumber = currentNumber + 1;
              }
            }
          }

          const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
          const year = new Date(jakartaNow).getFullYear();
          updateData.simlok_number = `${nextNumber}/S00330/${year}-S0`;
        } else {
          updateData.simlok_number = simlokNumber;
        }

        // Set SIMLOK date
        if (simlokDate) {
          updateData.simlok_date = new Date(simlokDate);
        } else {
          const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
          const jakartaDate = new Date(jakartaNow);
          const dateString = jakartaDate.toISOString().split('T')[0]!; // Non-null assertion safe here
          updateData.simlok_date = new Date(dateString);
        }

        // Generate QR code
        const { generateQrString } = await import('@/lib/qr-security');
        updateData.qrcode = generateQrString({
          id: submissionId,
          implementation_start_date: updateData.implementation_start_date || submission.implementation_start_date || new Date(),
          implementation_end_date: updateData.implementation_end_date || submission.implementation_end_date || new Date()
        });
      }

      const updated = await prisma.submission.update({
        where: { id: submissionId },
        data: updateData,
      });

      logger.info('SubmissionService', 'Submission approved/rejected', {
        submissionId,
        action,
        approvedBy: userId,
        simlokNumber: updateData.simlok_number,
      });

      return formatSubmissionDates(updated);
    } catch (error) {
      logger.error('SubmissionService', 'Error approving submission', error, transitionData);
      throw error;
    }
  }

  /**
   * Get submissions for export with filters
   */
  static async getSubmissionsForExport(filters: {
    userRole: UserRole;
    reviewStatus?: string;
    approvalStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const { userRole, reviewStatus, approvalStatus, search, startDate, endDate } = filters;

      const whereClause: any = {};

      // Role-based filtering
      switch (userRole) {
        case 'REVIEWER':
          whereClause.review_status = { 
            in: ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] 
          };
          break;
        case 'APPROVER':
          whereClause.review_status = 'MEETS_REQUIREMENTS';
          whereClause.approval_status = { 
            in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] 
          };
          break;
      }

      // Additional filters
      if (reviewStatus) whereClause.review_status = reviewStatus;
      if (approvalStatus) whereClause.approval_status = approvalStatus;
      
      if (search) {
        whereClause.OR = [
          { vendor_name: { contains: search } },
          { job_description: { contains: search } },
          { officer_name: { contains: search } },
        ];
      }
      
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) whereClause.created_at.gte = new Date(startDate);
        if (endDate) whereClause.created_at.lte = new Date(endDate);
      }

      const submissions = await prisma.submission.findMany({
        where: whereClause,
        include: {
          support_documents: true,
          worker_list: true,
        },
        orderBy: { created_at: 'desc' },
      });

      logger.info('SubmissionService', 'Submissions fetched for export', {
        userRole,
        count: submissions.length,
      });

      return submissions;
    } catch (error) {
      logger.error('SubmissionService', 'Error fetching submissions for export', error);
      throw error;
    }
  }

  /**
   * Generate auto SIMLOK number with Jakarta timezone
   * Format: {number}/S00330/{year}-S0
   */
  static async generateSimlokNumber(): Promise<string> {
    try {
      // Use Jakarta timezone for year
      const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const now = new Date(jakartaNow);
      const year = now.getFullYear();

      // Get the last approved submission for CURRENT YEAR to determine next auto-increment number
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

      const simlokNumber = `${nextNumber}/S00330/${year}-S0`;
      logger.info('SubmissionService', 'Generated SIMLOK number', { simlokNumber, year, nextNumber });
      return simlokNumber;
    } catch (error) {
      logger.error('SubmissionService', 'Error generating SIMLOK number', error);
      throw error;
    }
  }

  /**
   * Update submission as VERIFIER (approve/reject)
   */
  static async updateAsVerifier(
    submissionId: string,
    userId: string,
    updateData: {
      approval_status: 'APPROVED' | 'REJECTED';
      simlok_date?: Date;
      implementation?: string;
      content?: string;
      signer_position?: string;
      signer_name?: string;
      implementation_start_date?: Date;
      implementation_end_date?: Date;
    }
  ) {
    try {
      const existingSubmission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: { user: { select: { id: true, officer_name: true, email: true, vendor_name: true } } }
      });

      if (!existingSubmission) {
        throw new Error('Submission not found');
      }

      const data: any = {
        approval_status: updateData.approval_status,
      };

      // Track status change for notification
      const statusChanged = existingSubmission.approval_status !== updateData.approval_status;

      // Add optional fields
      if (updateData.simlok_date) data.simlok_date = updateData.simlok_date;
      if (updateData.implementation) data.implementation = updateData.implementation;
      if (updateData.content) data.content = updateData.content;
      if (updateData.signer_position) data.signer_position = updateData.signer_position;
      if (updateData.signer_name) data.signer_name = updateData.signer_name;
      if (updateData.implementation_start_date) data.implementation_start_date = updateData.implementation_start_date;
      if (updateData.implementation_end_date) data.implementation_end_date = updateData.implementation_end_date;

      // If approving, generate SIMLOK number and QR code
      if (updateData.approval_status === 'APPROVED') {
        const simlokNumber = await this.generateSimlokNumber();
        data.simlok_number = simlokNumber;

        // Generate secure QR code
        const { generateQrString } = await import('@/lib/qr-security');
        const qrString = generateQrString({
          id: submissionId,
          implementation_start_date: updateData.implementation_start_date || null,
          implementation_end_date: updateData.implementation_end_date || null,
        });
        data.qrcode = qrString;

        // Verify the user exists before setting approved_by
        const adminUser = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!adminUser) {
          throw new Error('Your session is no longer valid. Please log out and log back in to continue.');
        }

        data.approved_by = userId;
      }

      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data,
        include: {
          user: {
            select: { id: true, officer_name: true, email: true, vendor_name: true }
          }
        }
      });

      // Notify vendor if status changed
      if (statusChanged && existingSubmission.user_id) {
        const { notifyVendorStatusChange } = await import('@/server/events');
        await notifyVendorStatusChange(
          existingSubmission.user_id,
          submissionId,
          updateData.approval_status
        );
      }

      logger.info('SubmissionService', 'Submission updated as VERIFIER', {
        submissionId,
        approval_status: updateData.approval_status,
        simlok_number: data.simlok_number,
      });

      return updatedSubmission;
    } catch (error) {
      logger.error('SubmissionService', 'Error updating as VERIFIER', error);
      throw error;
    }
  }

  /**
   * Update submission as VENDOR (edit pending submission)
   */
  static async updateAsVendor(
    submissionId: string,
    userId: string,
    updateData: {
      vendor_name?: string;
      based_on?: string;
      officer_name?: string;
      job_description?: string;
      work_location?: string;
      working_hours?: string;
      holiday_working_hours?: string;
      work_facilities?: string;
      worker_count?: number;
      simja_number?: string;
      simja_date?: Date;
      sika_number?: string;
      sika_date?: Date;
      worker_names?: string;
      sika_document_upload?: string;
      simja_document_upload?: string;
      workers?: Array<{
        worker_name: string;
        worker_photo?: string | null;
        hsse_pass_number?: string | null;
        hsse_pass_valid_thru?: Date | null;
        hsse_pass_document_upload?: string | null;
      }>;
    }
  ) {
    try {
      const existingSubmission = await prisma.submission.findFirst({
        where: { 
          id: submissionId,
          user_id: userId
        }
      });

      if (!existingSubmission) {
        throw new Error('Submission not found or access denied');
      }

      if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
        throw new Error('Can only edit pending submissions');
      }

      const data: any = {};
      const allowedFields = [
        'vendor_name', 'based_on', 'officer_name', 'job_description', 
        'work_location', 'working_hours', 'holiday_working_hours', 'work_facilities', 'worker_count',
        'simja_number', 'simja_date', 'sika_number', 'sika_date', 'worker_names',
        'sika_document_upload', 'simja_document_upload'
      ];

      allowedFields.forEach(field => {
        if (updateData[field as keyof typeof updateData] !== undefined) {
          data[field] = updateData[field as keyof typeof updateData];
        }
      });

      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data,
        include: {
          user: {
            select: { id: true, officer_name: true, email: true, vendor_name: true }
          }
        }
      });

      // Handle workers if provided
      if (updateData.workers && Array.isArray(updateData.workers)) {
        // Delete existing workers
        await prisma.workerList.deleteMany({
          where: { submission_id: submissionId }
        });

        // Create new workers
        const validWorkers = updateData.workers.filter(w => 
          w.worker_name && w.worker_name.trim() !== ''
        );

        if (validWorkers.length > 0) {
          await prisma.workerList.createMany({
            data: validWorkers.map(worker => ({
              worker_name: worker.worker_name.trim(),
              worker_photo: worker.worker_photo || null,
              hsse_pass_number: worker.hsse_pass_number || null,
              hsse_pass_valid_thru: worker.hsse_pass_valid_thru || null,
              hsse_pass_document_upload: worker.hsse_pass_document_upload || null,
              submission_id: submissionId
            }))
          });
        }
      }

      logger.info('SubmissionService', 'Submission updated as VENDOR', { submissionId });
      return updatedSubmission;
    } catch (error) {
      logger.error('SubmissionService', 'Error updating as VENDOR', error);
      throw error;
    }
  }
}

export default SubmissionService;
