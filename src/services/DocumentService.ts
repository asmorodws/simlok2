/**
 * Document Service
 * Business logic for document management
 * Handles document upload, validation, retrieval, and deletion
 */

import { prisma } from '@/lib/singletons';
import { logger } from '@/lib/logger';
import { DocumentType } from '@/types/enums';
import { unlink } from 'fs/promises';
import path from 'path';

// ==================== TYPE DEFINITIONS ====================

export interface CreateDocumentData {
  submission_id: string;
  document_type: DocumentType;
  document_subtype?: string | null;
  document_number?: string | null;
  document_date?: string | Date | null;
  document_upload: string; // File path
  uploaded_by: string;
}

export interface DocumentFilters {
  submissionId?: string;
  documentType?: DocumentType;
  uploadedBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateDocumentData {
  document_number?: string | null;
  document_date?: string | Date | null;
  document_subtype?: string | null;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalize document number
 * - Convert to uppercase
 * - Remove "No." or "No" prefix at the beginning
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
 * Get document type label in Indonesian
 */
// Unused function - kept for future use
// function getDocumentTypeLabel(type: DocumentType): string {
//   const labels: Record<DocumentType, string> = {
//     [DocumentType.SIMJA]: 'SIMJA',
//     [DocumentType.SIKA]: 'SIKA',
//     [DocumentType.WORK_ORDER]: 'Work Order',
//     [DocumentType.KONTRAK_KERJA]: 'Kontrak Kerja',
//     [DocumentType.JSA]: 'JSA',
//   };
//   return labels[type] || type;
// }

// ==================== DOCUMENT SERVICE ====================

export class DocumentService {
  /**
   * Get documents with filtering
   */
  static async getDocuments(filters: DocumentFilters) {
    try {
      const {
        submissionId,
        documentType,
        uploadedBy,
        page = 1,
        limit = 20,
        sortBy = 'uploaded_at',
        sortOrder = 'desc',
      } = filters;

      const skip = (page - 1) * limit;
      const whereClause: any = {};

      // Filter by submission
      if (submissionId) {
        whereClause.submission_id = submissionId;
      }

      // Filter by document type
      if (documentType) {
        whereClause.document_type = documentType;
      }

      // Filter by uploader
      if (uploadedBy) {
        whereClause.uploaded_by = uploadedBy;
      }

      // Query documents
      const [documents, total] = await Promise.all([
        prisma.supportDocument.findMany({
          where: whereClause,
          include: {
            submission: {
              select: {
                id: true,
                vendor_name: true,
                work_location: true,
                review_status: true,
                approval_status: true,
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        prisma.supportDocument.count({ where: whereClause }),
      ]);

      logger.info('DocumentService', 'Documents retrieved', {
        submissionId,
        documentType,
        total,
        page,
      });

      return {
        documents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('DocumentService', 'Error fetching documents', error, filters);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  static async getDocumentById(id: string) {
    try {
      const document = await prisma.supportDocument.findUnique({
        where: { id },
        include: {
          submission: {
            select: {
              id: true,
              vendor_name: true,
              work_location: true,
              user_id: true,
            }
          }
        }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      logger.info('DocumentService', 'Document retrieved', { documentId: id });

      return document;
    } catch (error) {
      logger.error('DocumentService', 'Error fetching document', error, { id });
      throw error;
    }
  }

  /**
   * Create new document
   */
  static async createDocument(data: CreateDocumentData) {
    try {
      // Verify submission exists
      const submission = await prisma.submission.findUnique({
        where: { id: data.submission_id },
        select: { id: true, user_id: true }
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Normalize document number
      const normalizedDocNumber = normalizeDocumentNumber(data.document_number);

      // Create document
      const document = await prisma.supportDocument.create({
        data: {
          submission_id: data.submission_id,
          document_type: data.document_type,
          document_subtype: data.document_subtype || null,
          document_number: normalizedDocNumber,
          document_date: data.document_date ? new Date(data.document_date) : null,
          document_upload: data.document_upload,
          uploaded_by: data.uploaded_by,
          uploaded_at: new Date(),
        },
        include: {
          submission: {
            select: {
              id: true,
              vendor_name: true,
            }
          }
        }
      });

      logger.info('DocumentService', 'Document created', {
        documentId: document.id,
        submissionId: data.submission_id,
        documentType: data.document_type,
        uploadedBy: data.uploaded_by,
      });

      return document;
    } catch (error) {
      logger.error('DocumentService', 'Error creating document', error, data);
      throw error;
    }
  }

  /**
   * Create multiple documents (bulk)
   */
  static async createBulkDocuments(documents: CreateDocumentData[]) {
    try {
      if (!documents || documents.length === 0) {
        return { count: 0 };
      }

      // Normalize all document numbers
      const normalizedDocuments = documents.map(doc => ({
        submission_id: doc.submission_id,
        document_type: doc.document_type,
        document_subtype: doc.document_subtype || null,
        document_number: normalizeDocumentNumber(doc.document_number),
        document_date: doc.document_date ? new Date(doc.document_date) : null,
        document_upload: doc.document_upload,
        uploaded_by: doc.uploaded_by,
        uploaded_at: new Date(),
      }));

      // Create all documents
      const result = await prisma.supportDocument.createMany({
        data: normalizedDocuments,
      });

      logger.info('DocumentService', 'Bulk documents created', {
        count: result.count,
        submissionId: documents[0]?.submission_id,
      });

      return result;
    } catch (error) {
      logger.error('DocumentService', 'Error creating bulk documents', error, {
        count: documents?.length,
      });
      throw error;
    }
  }

  /**
   * Update document metadata
   */
  static async updateDocument(
    id: string, 
    data: UpdateDocumentData, 
    userId: string
  ) {
    try {
      // Verify document exists and check ownership
      const existing = await prisma.supportDocument.findUnique({
        where: { id },
        select: {
          id: true,
          uploaded_by: true,
          submission_id: true,
        }
      });

      if (!existing) {
        throw new Error('Document not found');
      }

      // Get submission to check status and ownership
      const submission = await prisma.submission.findUnique({
        where: { id: existing.submission_id },
        select: {
          user_id: true,
          approval_status: true,
        }
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Only allow updates if submission is not yet approved
      if (submission.approval_status !== 'PENDING_APPROVAL') {
        throw new Error('Cannot update documents for approved submissions');
      }

      // Verify user is the owner or uploader
      if (submission.user_id !== userId && existing.uploaded_by !== userId) {
        throw new Error('Access denied: You can only update your own documents');
      }

      // Normalize document number if provided
      const updateData: any = {};
      if (data.document_number !== undefined) {
        updateData.document_number = normalizeDocumentNumber(data.document_number);
      }
      if (data.document_date !== undefined) {
        updateData.document_date = data.document_date ? new Date(data.document_date) : null;
      }
      if (data.document_subtype !== undefined) {
        updateData.document_subtype = data.document_subtype;
      }

      // Update document
      const updated = await prisma.supportDocument.update({
        where: { id },
        data: updateData,
        include: {
          submission: {
            select: {
              id: true,
              vendor_name: true,
            }
          }
        }
      });

      logger.info('DocumentService', 'Document updated', {
        documentId: id,
        userId,
      });

      return updated;
    } catch (error) {
      logger.error('DocumentService', 'Error updating document', error, { id, userId });
      throw error;
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(id: string, userId: string, userRole: string) {
    try {
      // Verify document exists and check permissions
      const document = await prisma.supportDocument.findUnique({
        where: { id },
        select: {
          id: true,
          document_upload: true,
          uploaded_by: true,
          submission_id: true,
        }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Get submission to check ownership and status
      const submission = await prisma.submission.findUnique({
        where: { id: document.submission_id },
        select: {
          user_id: true,
          approval_status: true,
        }
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Access control
      const isOwner = submission.user_id === userId;
      const isAdmin = userRole === 'SUPER_ADMIN';

      if (!isOwner && !isAdmin) {
        throw new Error('Access denied: You can only delete your own documents');
      }

      // Cannot delete if submission is already approved
      if (submission.approval_status !== 'PENDING_APPROVAL' && !isAdmin) {
        throw new Error('Cannot delete documents from approved submissions');
      }

      // Delete file from filesystem
      try {
        const filePath = path.join(process.cwd(), 'public', document.document_upload);
        await unlink(filePath);
        logger.debug('DocumentService', 'Document file deleted from filesystem', {
          filePath,
        });
      } catch (fileError) {
        logger.warn('DocumentService', 'Failed to delete document file', {
          error: fileError,
          filePath: document.document_upload,
        });
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      await prisma.supportDocument.delete({
        where: { id },
      });

      logger.info('DocumentService', 'Document deleted', {
        documentId: id,
        userId,
      });

      return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
      logger.error('DocumentService', 'Error deleting document', error, { id, userId });
      throw error;
    }
  }

  /**
   * Delete all documents for a submission
   */
  static async deleteSubmissionDocuments(
    submissionId: string, 
    userId: string, 
    userRole: string
  ) {
    try {
      // Verify submission and permissions
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { 
          user_id: true, 
          approval_status: true,
        }
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      const isOwner = submission.user_id === userId;
      const isAdmin = userRole === 'SUPER_ADMIN';

      if (!isOwner && !isAdmin) {
        throw new Error('Access denied');
      }

      // Get all documents
      const documents = await prisma.supportDocument.findMany({
        where: { submission_id: submissionId },
        select: { id: true, document_upload: true }
      });

      // Delete files from filesystem
      for (const doc of documents) {
        try {
          const filePath = path.join(process.cwd(), 'public', doc.document_upload);
          await unlink(filePath);
        } catch (fileError) {
          logger.warn('DocumentService', 'Failed to delete document file', {
            documentId: doc.id,
            error: fileError,
          });
        }
      }

      // Delete from database
      const result = await prisma.supportDocument.deleteMany({
        where: { submission_id: submissionId },
      });

      logger.info('DocumentService', 'All submission documents deleted', {
        submissionId,
        count: result.count,
        userId,
      });

      return result;
    } catch (error) {
      logger.error('DocumentService', 'Error deleting submission documents', error, {
        submissionId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get document statistics for a submission
   */
  static async getSubmissionDocumentStatistics(submissionId: string) {
    try {
      const [
        totalCount,
        simjaCount,
        sikaCount,
        workOrderCount,
        kontrakKerjaCount,
        jsaCount,
      ] = await Promise.all([
        prisma.supportDocument.count({ where: { submission_id: submissionId } }),
        prisma.supportDocument.count({ 
          where: { submission_id: submissionId, document_type: DocumentType.SIMJA } 
        }),
        prisma.supportDocument.count({ 
          where: { submission_id: submissionId, document_type: DocumentType.SIKA } 
        }),
        prisma.supportDocument.count({ 
          where: { submission_id: submissionId, document_type: DocumentType.WORK_ORDER } 
        }),
        prisma.supportDocument.count({ 
          where: { submission_id: submissionId, document_type: DocumentType.KONTRAK_KERJA } 
        }),
        prisma.supportDocument.count({ 
          where: { submission_id: submissionId, document_type: DocumentType.JSA } 
        }),
      ]);

      const statistics = {
        total: totalCount,
        byType: {
          simja: simjaCount,
          sika: sikaCount,
          workOrder: workOrderCount,
          kontrakKerja: kontrakKerjaCount,
          jsa: jsaCount,
        },
      };

      logger.debug('DocumentService', 'Document statistics retrieved', {
        submissionId,
        totalCount,
      });

      return statistics;
    } catch (error) {
      logger.error('DocumentService', 'Error fetching document statistics', error, {
        submissionId,
      });
      throw error;
    }
  }

  /**
   * Validate document requirements for submission
   * Check if submission has all required documents
   */
  static async validateSubmissionDocuments(submissionId: string) {
    try {
      const stats = await this.getSubmissionDocumentStatistics(submissionId);

      // Required: At least 1 SIMJA and 1 SIKA
      const hasRequiredDocuments = 
        stats.byType.simja > 0 && 
        stats.byType.sika > 0;

      const validation = {
        isValid: hasRequiredDocuments,
        statistics: stats,
        missingDocuments: [] as string[],
      };

      if (stats.byType.simja === 0) {
        validation.missingDocuments.push('SIMJA');
      }
      if (stats.byType.sika === 0) {
        validation.missingDocuments.push('SIKA');
      }

      logger.debug('DocumentService', 'Document validation result', {
        submissionId,
        isValid: validation.isValid,
        missingCount: validation.missingDocuments.length,
      });

      return validation;
    } catch (error) {
      logger.error('DocumentService', 'Error validating submission documents', error, {
        submissionId,
      });
      throw error;
    }
  }
}

export default DocumentService;
