/**
 * Submission Service - Business Logic Layer
 * 
 * Handles all business operations related to submissions including:
 * - Creation with validation
 * - Approval workflows
 * - Status updates and notifications
 * - Cache invalidation
 */

import { submissionRepository } from '@/server/repositories/submission/SubmissionRepository';
import { userRepository } from '@/server/repositories/user/UserRepository';
import { notificationRepository } from '@/server/repositories/notification/NotificationRepository';
import { eventsPublisher } from '@/server/eventsPublisher';
import { revalidateTag } from 'next/cache';
import type { ReviewStatus, FinalStatus, Role } from '@prisma/client';

export interface CreateSubmissionData {
  vendor_name: string;
  vendor_phone?: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation?: string;
  working_hours: string;
  other_notes?: string;
  work_facilities: string;
  worker_names: string;
  worker_count?: number;
  content?: string;
  notes?: string;
  signer_position?: string;
  signer_name?: string;
  implementation_start_date?: Date;
  implementation_end_date?: Date;
}

export interface ReviewSubmissionData {
  review_status: ReviewStatus;
  review_note?: string;
  reviewed_by_id: string;
}

export interface ApprovalData {
  final_status: FinalStatus;
  final_note?: string;
  approved_by_final_id: string;
}

export interface SubmissionFilters {
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  review_status?: ReviewStatus;
  final_status?: FinalStatus;
  user_id?: string;
  search?: string;
  date_from?: Date;
  date_to?: Date;
}

export class SubmissionService {
  /**
   * Create new submission with business validation
   */
  async createSubmission(
    userId: string,
    data: CreateSubmissionData
  ): Promise<any> {
    // Get user details for validation
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'VENDOR') {
      throw new Error('Only vendors can create submissions');
    }

    if (!user.verified_at) {
      throw new Error('Vendor must be verified to create submissions');
    }

    // Create submission
    const submission = await submissionRepository.create({
      ...data,
      user: {
        connect: { id: userId }
      },
      approval_status: 'PENDING',
      review_status: 'PENDING_REVIEW',
      final_status: 'PENDING_APPROVAL'
    });

    // Send notifications to reviewers
    await this.notifyReviewers(submission.id, user.vendor_name || user.officer_name);

    // Invalidate caches
    await this.invalidateCaches(['submissions', 'admin-stats', 'vendor-stats']);

    // Publish events
    eventsPublisher.submissionCreated({
      submissionId: submission.id,
      vendorName: user.vendor_name || user.officer_name,
      officerName: user.officer_name,
      createdAt: submission.created_at.toISOString()
    });

    return submission;
  }

  /**
   * Review submission (by reviewer)
   */
  async reviewSubmission(
    submissionId: string,
    reviewData: ReviewSubmissionData
  ): Promise<any> {
    // Validate reviewer
    const reviewer = await userRepository.findById(reviewData.reviewed_by_id);
    if (!reviewer || reviewer.role !== 'REVIEWER') {
      throw new Error('Invalid reviewer');
    }

    // Get submission
    const submission = await submissionRepository.findById(submissionId, {
      user: true
    });
    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.review_status !== 'PENDING_REVIEW') {
      throw new Error('Submission is not pending review');
    }

    // Update submission
    const updatedSubmission = await submissionRepository.update(submissionId, {
      ...reviewData,
      reviewed_at: new Date()
    });

    // If meets requirements, notify approvers
    if (reviewData.review_status === 'MEETS_REQUIREMENTS') {
      await this.notifyApprovers(submissionId, submission.vendor_name);
    } else if (reviewData.review_status === 'NOT_MEETS_REQUIREMENTS') {
      // If not meets requirements, also update final status
      await submissionRepository.update(submissionId, {
        final_status: 'REJECTED',
        final_note: 'Rejected during review process',
        approved_by_final_user: {
          connect: { id: reviewData.reviewed_by_id }
        },
        approved_at: new Date()
      });

      // Notify vendor of rejection
      await this.notifyVendorOfRejection(submission.user_id, submissionId);
    }

    // Invalidate caches
    await this.invalidateCaches(['submissions', 'admin-stats']);

    // Publish events
    eventsPublisher.submissionReviewed({
      submissionId: submissionId,
      reviewedBy: reviewData.reviewed_by_id,
      reviewStatus: reviewData.review_status,
      reviewedAt: new Date().toISOString()
    });

    return updatedSubmission;
  }

  /**
   * Final approval/rejection (by approver)
   */
  async finalApproval(
    submissionId: string,
    approvalData: ApprovalData
  ): Promise<any> {
    // Validate approver
    const approver = await userRepository.findById(approvalData.approved_by_final_id);
    if (!approver || approver.role !== 'APPROVER') {
      throw new Error('Invalid approver');
    }

    // Get submission
    const submission = await submissionRepository.findById(submissionId, {
      user: true
    });
    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.review_status !== 'MEETS_REQUIREMENTS') {
      throw new Error('Submission must meet requirements from reviewer first');
    }

    if (submission.final_status !== 'PENDING_APPROVAL') {
      throw new Error('Submission is not pending final approval');
    }

    // Update submission
    const updatedSubmission = await submissionRepository.update(submissionId, {
      ...approvalData,
      approved_at: new Date(),
      // Also update legacy approval_status for backward compatibility
      approval_status: approvalData.final_status === 'APPROVED' ? 'APPROVED' : 'REJECTED'
    });

    // Notify vendor of final decision
    if (approvalData.final_status === 'APPROVED') {
      await this.notifyVendorOfApproval(submission.user_id, submissionId);
    } else {
      await this.notifyVendorOfRejection(submission.user_id, submissionId);
    }

    // Invalidate caches
    await this.invalidateCaches(['submissions', 'admin-stats', 'vendor-stats']);

    // Publish events
    eventsPublisher.submissionFinalized(submission.user_id, {
      submissionId: submissionId,
      finalStatus: approvalData.final_status,
      finalizedBy: approvalData.approved_by_final_id,
      finalizedAt: new Date().toISOString()
    });

    return updatedSubmission;
  }

  /**
   * Get submissions with pagination and filters
   */
  async getSubmissionsPaginated(
    filters: SubmissionFilters = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 },
    userRole?: Role,
    userId?: string
  ) {
    // Apply role-based filtering
    if (userRole === 'VENDOR' && userId) {
      filters.user_id = userId;
    }

    return submissionRepository.findPaginated(filters, pagination);
  }

  /**
   * Get submission by ID with authorization check
   */
  async getSubmissionById(
    submissionId: string,
    userRole: Role,
    userId: string
  ) {
    const submission = await submissionRepository.findById(submissionId, {
      user: true,
      reviewed_by: true,
      approved_by_final: true,
      qrScans: true
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Check authorization
    if (userRole === 'VENDOR' && submission.user_id !== userId) {
      throw new Error('Unauthorized to view this submission');
    }

    return submission;
  }

  /**
   * Update submission (by vendor, only if not yet reviewed)
   */
  async updateSubmission(
    submissionId: string,
    userId: string,
    data: Partial<CreateSubmissionData>
  ): Promise<any> {
    const submission = await submissionRepository.findById(submissionId);
    
    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.user_id !== userId) {
      throw new Error('Unauthorized to update this submission');
    }

    if (submission.review_status !== 'PENDING_REVIEW') {
      throw new Error('Cannot update submission that has been reviewed');
    }

    const updatedSubmission = await submissionRepository.update(submissionId, data);

    // Invalidate caches
    await this.invalidateCaches(['submissions']);

    return updatedSubmission;
  }

  /**
   * Delete submission (by vendor, only if not yet reviewed)
   */
  async deleteSubmission(submissionId: string, userId: string): Promise<void> {
    const submission = await submissionRepository.findById(submissionId);
    
    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.user_id !== userId) {
      throw new Error('Unauthorized to delete this submission');
    }

    if (submission.review_status !== 'PENDING_REVIEW') {
      throw new Error('Cannot delete submission that has been reviewed');
    }

    await submissionRepository.delete(submissionId);

    // Invalidate caches
    await this.invalidateCaches(['submissions', 'admin-stats', 'vendor-stats']);
  }

  // Private helper methods
  
  private async notifyReviewers(submissionId: string, vendorName: string) {
    const reviewers = await userRepository.findByRole('REVIEWER', { verified: true });
    
    await notificationRepository.createBulkByScope('reviewer', 
      reviewers.map(reviewer => ({
        vendor_id: reviewer.id,
        type: 'submission_review_required',
        title: 'New Submission for Review',
        message: `New submission from ${vendorName} requires your review`,
        data: JSON.stringify({ submissionId })
      }))
    );
  }

  private async notifyApprovers(submissionId: string, vendorName: string) {
    const approvers = await userRepository.findByRole('APPROVER', { verified: true });
    
    await notificationRepository.createBulkByScope('approver',
      approvers.map(approver => ({
        vendor_id: approver.id,
        type: 'submission_approval_required',
        title: 'Submission Ready for Approval',
        message: `Submission from ${vendorName} has been reviewed and ready for final approval`,
        data: JSON.stringify({ submissionId })
      }))
    );
  }

  private async notifyVendorOfApproval(vendorId: string, submissionId: string) {
    await notificationRepository.createBulkByScope('vendor', [{
      vendor_id: vendorId,
      type: 'submission_approved',
      title: 'Submission Approved',
      message: 'Your submission has been approved and SIMLOK document is ready',
      data: JSON.stringify({ submissionId })
    }]);
  }

  private async notifyVendorOfRejection(vendorId: string, submissionId: string) {
    await notificationRepository.createBulkByScope('vendor', [{
      vendor_id: vendorId,
      type: 'submission_rejected',
      title: 'Submission Rejected',
      message: 'Your submission has been rejected. Please check the review notes.',
      data: JSON.stringify({ submissionId })
    }]);
  }

  private async invalidateCaches(tags: string[]) {
    // Next.js cache invalidation
    for (const tag of tags) {
      revalidateTag(tag);
    }
  }
}

// Export singleton instance
export const submissionService = new SubmissionService();