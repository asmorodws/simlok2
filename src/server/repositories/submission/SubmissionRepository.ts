/**
 * Submission Repository
 * 
 * Handles all database operations related to submissions.
 * This repository encapsulates complex queries and business-specific
 * database operations for the Submission entity.
 */

import { Submission, Prisma } from '@prisma/client';
import { BaseRepository } from '../base/BaseRepository';

export interface SubmissionFilters {
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  user_id?: string;
  search?: string;
  date_from?: Date;
  date_to?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SubmissionWithUser extends Submission {
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string | null;
  };
  approved_by_user?: {
    id: string;
    officer_name: string;
    email: string;
  } | null;
}

export interface SubmissionStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export class SubmissionRepository extends BaseRepository<
  Submission,
  Prisma.SubmissionCreateInput,
  Prisma.SubmissionUpdateInput
> {
  protected getModel() {
    return this.prisma.submission;
  }

  /**
   * Find submissions with pagination, filtering, and statistics
   */
  async findPaginated(
    filters: SubmissionFilters,
    pagination: PaginationParams
  ): Promise<{
    submissions: SubmissionWithUser[];
    total: number;
    statistics: SubmissionStatistics;
  }> {
    const whereClause = this.buildWhereClause(filters);
    const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const [submissions, total, statistics] = await Promise.all([
      this.prisma.submission.findMany({
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
          approved_by_user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.count(whereClause),
      this.getStatistics(filters.user_id)
    ]);

    return { 
      submissions: submissions as SubmissionWithUser[], 
      total, 
      statistics 
    };
  }

  /**
   * Get submission statistics
   */
  async getStatistics(userId?: string): Promise<SubmissionStatistics> {
    const whereClause = userId ? { user_id: userId } : {};
    
    const [total, statistics] = await Promise.all([
      this.count(whereClause),
      this.prisma.submission.groupBy({
        by: ['approval_status'],
        where: whereClause,
        _count: {
          approval_status: true
        }
      })
    ]);

    return {
      total,
      pending: statistics.find(s => s.approval_status === 'PENDING')?._count.approval_status || 0,
      approved: statistics.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
      rejected: statistics.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0
    };
  }

  /**
   * Generate next SIMLOK number for approved submissions
   */
  async generateSimlokNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Get the last approved submission this month
    const lastSubmission = await this.prisma.submission.findFirst({
      where: {
        approval_status: 'APPROVED',
        simlok_number: {
          not: null
        },
        approved_at: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        }
      },
      orderBy: {
        simlok_number: 'desc'
      }
    });

    let sequence = 1;
    if (lastSubmission?.simlok_number) {
      // Extract sequence number from simlok_number (last 3 digits)
      const lastSequence = parseInt(lastSubmission.simlok_number.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${year}${month}${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Find submissions pending review (for reviewers)
   */
  async findPendingReview(limit: number = 10): Promise<SubmissionWithUser[]> {
    const submissions = await this.prisma.submission.findMany({
      where: {
        review_status: 'PENDING_REVIEW'
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
      },
      orderBy: {
        created_at: 'asc' // Oldest first (FIFO)
      },
      take: limit
    });

    return submissions as SubmissionWithUser[];
  }

  /**
   * Find submissions pending approval (for approvers)
   */
  async findPendingApproval(limit: number = 10): Promise<SubmissionWithUser[]> {
    const submissions = await this.prisma.submission.findMany({
      where: {
        OR: [
          { review_status: 'MEETS_REQUIREMENTS' },
          { review_status: 'NOT_MEETS_REQUIREMENTS' }
        ],
        approval_status: 'PENDING'
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
        reviewed_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        }
      },
      orderBy: {
        reviewed_at: 'asc' // Oldest reviewed first
      },
      take: limit
    });

    return submissions as SubmissionWithUser[];
  }

  /**
   * Get latest submissions for dashboard
   */
  async findLatest(limit: number = 5, userId?: string): Promise<SubmissionWithUser[]> {
    const whereClause = userId ? { user_id: userId } : {};

    const submissions = await this.prisma.submission.findMany({
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
        approved_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });

    return submissions as SubmissionWithUser[];
  }

  /**
   * Update submission review status (for reviewers)
   */
  async updateReviewStatus(
    id: string, 
    reviewStatus: 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS',
    reviewedBy: string,
    notes?: string
  ): Promise<Submission> {
    return this.prisma.submission.update({
      where: { id },
      data: {
        review_status: reviewStatus,
        reviewed_by_user: {
          connect: { id: reviewedBy }
        },
        reviewed_at: new Date(),
        ...(notes && { review_note: notes })
      }
    });
  }

  /**
   * Update submission approval status (for approvers)
   */
  async updateApprovalStatus(
    id: string,
    finalStatus: 'APPROVED' | 'REJECTED',
    approvedBy: string,
    simlokNumber?: string,
    notes?: string
  ): Promise<Submission> {
    return this.prisma.submission.update({
      where: { id },
      data: {
        final_status: finalStatus,
        approved_by_final_user: {
          connect: { id: approvedBy }
        },
        approved_at: new Date(),
        ...(simlokNumber && { simlok_number: simlokNumber }),
        ...(notes && { final_note: notes })
      }
    });
  }

  /**
   * Build where clause for filtering submissions
   */
  private buildWhereClause(filters: SubmissionFilters): Prisma.SubmissionWhereInput {
    const where: Prisma.SubmissionWhereInput = {};

    if (filters.approval_status) {
      // Map old approval status to new final status
      if (filters.approval_status === 'APPROVED') {
        where.final_status = 'APPROVED';
      } else if (filters.approval_status === 'REJECTED') {
        where.final_status = 'REJECTED';
      } else if (filters.approval_status === 'PENDING') {
        where.final_status = 'PENDING_APPROVAL';
      }
    }

    if (filters.user_id) {
      where.user_id = filters.user_id;
    }

    if (filters.search) {
      where.OR = [
        { vendor_name: { contains: filters.search } },
        { officer_name: { contains: filters.search } },
        { work_location: { contains: filters.search } },
        { job_description: { contains: filters.search } }
      ];
    }

    if (filters.date_from || filters.date_to) {
      where.created_at = {};
      if (filters.date_from) where.created_at.gte = filters.date_from;
      if (filters.date_to) where.created_at.lte = filters.date_to;
    }

    return where;
  }
}

// Export singleton instance
export const submissionRepository = new SubmissionRepository();