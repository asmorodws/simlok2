import { prisma } from '@/lib/database/singletons';
import { parseQrString, isQrValidForDate, type QrPayload } from '@/lib/auth/qrSecurity';
import { toJakartaISOString, formatScansDates, formatSubmissionDates } from '@/lib/helpers/timezone';
import { User_role as Role } from '@prisma/client';

export interface VerifyQRInput {
  qrString: string;
  scanLocation?: string;
}

export interface ScanHistoryFilters {
  submissionId?: string | undefined;
  search?: string | undefined;
  status?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  location?: string | undefined;
  limit: number;
  offset: number;
}

interface SessionUser {
  id: string;
  role: Role;
  officer_name?: string;
}

export class QRVerificationService {
  /**
   * Verify QR code and record scan
   */
  async verifyQR(input: VerifyQRInput, session: SessionUser) {
    const { qrString, scanLocation } = input;

    // Parse and verify QR code or barcode
    const qrPayload: QrPayload | null = parseQrString(qrString);
    
    if (!qrPayload) {
      throw new Error('QR code/barcode tidak valid atau data telah diubah. Pastikan Anda melakukan scan QR code atau barcode SIMLOK yang valid yang dihasilkan oleh sistem.');
    }

    // Validate QR code is being scanned within implementation period
    if (!isQrValidForDate(qrPayload)) {
      let errorMessage = 'QR code tidak dapat digunakan saat ini.';
      
      if (qrPayload.start_date && qrPayload.end_date) {
        errorMessage = `QR code hanya dapat digunakan dari tanggal ${qrPayload.start_date} sampai ${qrPayload.end_date}.`;
      } else if (qrPayload.start_date) {
        errorMessage = `QR code hanya dapat digunakan mulai tanggal ${qrPayload.start_date}.`;
      } else if (qrPayload.end_date) {
        errorMessage = `QR code telah kadaluarsa. Periode pelaksanaan berakhir pada ${qrPayload.end_date}.`;
      }
      
      throw new Error(errorMessage);
    }

    // Validate submission ID format before database query (prevent injection)
    if (!qrPayload.id || !qrPayload.id.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error('Format ID pengajuan tidak valid');
    }

    // Fetch submission data
    const submission = await prisma.submission.findUnique({
      where: { id: qrPayload.id },
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
        worker_names: true,
        implementation: true,
        based_on: true,
        implementation_start_date: true,
        implementation_end_date: true,
        worker_count: true,
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
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            worker_photo: true,
          },
          orderBy: {
            created_at: 'asc'
          }
        },
        support_documents: {
          select: {
            id: true,
            document_type: true,
            document_number: true,
            document_date: true,
          }
        }
      }
    });

    if (!submission) {
      throw new Error('Pengajuan tidak ditemukan');
    }

    // Check if submission is approved
    if (submission.approval_status !== 'APPROVED') {
      throw new Error('Pengajuan ini belum disetujui');
    }

    // Check if this user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, role: true, officer_name: true, address: true }
    });
    
    if (!userExists) {
      throw new Error('Sesi pengguna tidak valid. Silakan login kembali.');
    }

    // Check for duplicate scans - only prevent same verifier scanning same SIMLOK on same day
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const today = new Date(jakartaNow);
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    // Check if the same verifier has already scanned today
    const existingTodayScanByUser = await prisma.qrScan.findFirst({
      where: {
        submission_id: qrPayload.id,
        scanned_by: session.id,
        scanned_at: {
          gte: startOfDay,
          lte: endOfDay,
        }
      },
      select: {
        id: true,
        scanned_at: true,
        user: {
          select: {
            officer_name: true,
          },
        },
      },
    });

    if (existingTodayScanByUser) {
      const scanDate = new Date(existingTodayScanByUser.scanned_at);
      const formattedDate = scanDate.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const error: any = new Error(`QR code sudah anda scan hari ini pada ${formattedDate}. Satu verifikator hanya dapat melakukan scan sekali per hari untuk SIMLOK yang sama.`);
      error.code = 'DUPLICATE_SCAN';
      error.previousScan = {
        scanDate: existingTodayScanByUser.scanned_at,
        scanId: existingTodayScanByUser.id,
        scannerName: existingTodayScanByUser.user.officer_name,
      };
      throw error;
    }

    // Record the scan in database
    try {
      const scanRecord = await prisma.qrScan.create({
        data: {
          submission_id: qrPayload.id,
          scanned_by: session.id,
          scanner_name: userExists.officer_name || session.officer_name || 'Unknown',
          scan_location: scanLocation || userExists.address || 'Lokasi tidak tersedia',
        },
        select: {
          id: true,
          scanned_at: true,
          scanner_name: true,
          scan_location: true,
          user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
              role: true,
            }
          }
        }
      });

      // Extract support documents by type
      const simjaDoc = submission.support_documents?.find(d => d.document_type === 'SIMJA');
      const sikaDoc = submission.support_documents?.find(d => d.document_type === 'SIKA');
      const hsseDoc = submission.support_documents?.find(d => d.document_type === 'HSSE_PASS');

      // Return verification result with complete submission data
      return {
        success: true,
        message: 'QR code/barcode berhasil diverifikasi',
        scan_id: scanRecord.id,
        scanned_at: toJakartaISOString(scanRecord.scanned_at) || scanRecord.scanned_at,
        scanned_by: scanRecord.user?.officer_name || session.officer_name,
        data: {
          submission: {
            // Basic Info
            id: submission.id,
            simlok_number: submission.simlok_number,
            number: submission.simlok_number,
            simlok_date: toJakartaISOString(submission.simlok_date) || submission.simlok_date,
            
            // Vendor Info
            vendor_name: submission.vendor_name,
            vendor_phone: submission.vendor_phone,
            officer_name: submission.officer_name,
            vendor: submission.vendor_name ? { name: submission.vendor_name } : undefined,
            
            // Job Details
            job_description: submission.job_description,
            title: submission.job_description,
            work_location: submission.work_location,
            location: submission.work_location,
            
            // Implementation Period
            implementation_start_date: toJakartaISOString(submission.implementation_start_date) || submission.implementation_start_date,
            implementation_end_date: toJakartaISOString(submission.implementation_end_date) || submission.implementation_end_date,
            implementation: submission.implementation,
            task: submission.implementation || 'No task description',
            
            // Working Hours & Facilities
            working_hours: submission.working_hours,
            holiday_working_hours: submission.holiday_working_hours,
            work_facilities: submission.work_facilities,
            based_on: submission.based_on,
            
            // Documents - extracted from support_documents
            simja_number: simjaDoc?.document_number || null,
            simja_date: simjaDoc?.document_date ? (toJakartaISOString(simjaDoc.document_date) || simjaDoc.document_date) : null,
            simja_type: simjaDoc?.document_type || null,
            sika_number: sikaDoc?.document_number || null,
            sika_date: sikaDoc?.document_date ? (toJakartaISOString(sikaDoc.document_date) || sikaDoc.document_date) : null,
            sika_type: sikaDoc?.document_type || null,
            hsse_pass_number: hsseDoc?.document_number || null,
            hsse_pass_valid_thru: null,
            
            // Workers
            worker_count: submission.worker_count,
            worker_names: submission.worker_names,
            workers: submission.worker_list?.map(w => ({
              id: w.id,
              worker_name: w.worker_name,
              name: w.worker_name,
              worker_photo: w.worker_photo,
            })) || submission.worker_names?.split('\n').filter((name: string) => name.trim()).map((name: string) => ({ name: name.trim() })) || [],
            
            // Status
            approval_status: submission.approval_status,
            review_status: submission.review_status,
            status: submission.approval_status.toLowerCase(),
          }
        }
      };

    } catch (createError: any) {
      // Check if it's a unique constraint violation (race condition)
      if (createError?.code === 'P2002') {
        const raceConditionScan = await prisma.qrScan.findFirst({
          where: {
            submission_id: qrPayload.id,
            scanned_by: session.id,
            scanned_at: {
              gte: startOfDay,
              lte: endOfDay,
            }
          },
          select: {
            id: true,
            scanned_at: true,
            user: {
              select: {
                officer_name: true,
              },
            },
          },
        });

        if (raceConditionScan) {
          const scanDate = new Date(raceConditionScan.scanned_at);
          const formattedDate = scanDate.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const error: any = new Error(`Anda sudah melakukan scan untuk SIMLOK ini hari ini pada ${formattedDate}. Verifikator yang sama tidak dapat scan SIMLOK yang sama di hari yang sama.`);
          error.code = 'DUPLICATE_SCAN';
          throw error;
        }

        const error: any = new Error('QR Code ini sudah pernah discan hari ini (race condition detected)');
        error.code = 'DUPLICATE_SCAN';
        throw error;
      }
      
      throw createError;
    }
  }

  /**
   * Get scan history with filters
   */
  async getScanHistory(filters: ScanHistoryFilters, session: SessionUser) {
    const {
      submissionId,
      search,
      status,
      dateFrom,
      dateTo,
      location,
      limit = 50,
      offset = 0
    } = filters;

    const finalLimit = Math.min(limit, 100);

    // Build where clause
    const whereClause: any = {};
    
    if (submissionId) {
      whereClause.submission_id = submissionId;
    }

    // For verifiers, only show their own scans
    if (session.role === 'VERIFIER') {
      whereClause.scanned_by = session.id;
    }

    // Add search filter
    if (search) {
      whereClause.OR = [
        {
          submission: {
            simlok_number: {
              contains: search
            }
          }
        },
        {
          submission: {
            vendor_name: {
              contains: search
            }
          }
        },
        {
          scan_location: {
            contains: search
          }
        }
      ];
    }

    // Add status filter
    if (status) {
      whereClause.submission = {
        ...whereClause.submission,
        approval_status: status
      };
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      whereClause.scanned_at = {};
      if (dateFrom) {
        whereClause.scanned_at.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereClause.scanned_at.lte = endDate;
      }
    }

    // Add location filter
    if (location) {
      whereClause.scan_location = {
        contains: location
      };
    }

    // Fetch scan history
    const scans = await prisma.qrScan.findMany({
      where: whereClause,
      select: {
        id: true,
        submission_id: true,
        scanned_by: true,
        scanner_name: true,
        scan_location: true,
        scanned_at: true,
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            role: true,
          }
        },
        submission: {
          select: {
            id: true,
            simlok_number: true,
            vendor_name: true,
            officer_name: true,
            job_description: true,
            work_location: true,
            approval_status: true,
          }
        }
      },
      orderBy: {
        scanned_at: 'desc'
      },
      take: finalLimit,
      skip: offset,
    });

    // Get total count
    const totalCount = await prisma.qrScan.count({
      where: whereClause,
    });

    // Format timestamps and nested submission dates to Jakarta
    const formattedScans = scans.map(s => ({
      ...s,
      scanned_at: (s.scanned_at ? new Date(s.scanned_at) : null) ? formatScansDates([s])[0].scanned_at : s.scanned_at,
      submission: s.submission ? formatSubmissionDates(s.submission) : s.submission
    }));

    return {
      scans: formattedScans,
      pagination: {
        total: totalCount,
        limit: finalLimit,
        offset,
        hasMore: offset + finalLimit < totalCount,
      }
    };
  }

  /**
   * Get paginated scan history with filters
   */
  async getScanHistoryPaginated(filters: {
    page: number;
    limit: number;
    dateFrom?: string;
    dateTo?: string;
    verifier?: string;
    submissionId?: string;
    search?: string;
  }) {
    const { page, limit, dateFrom, dateTo, verifier, submissionId, search } = filters;
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};

    if (dateFrom || dateTo) {
      where.scanned_at = {};
      if (dateFrom) {
        where.scanned_at.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        where.scanned_at.lt = endDate;
      }
    }

    if (verifier) {
      where.user = {
        officer_name: { contains: verifier },
      };
    }

    if (submissionId) {
      where.submission = {
        simlok_number: { contains: submissionId },
      };
    }

    if (search) {
      where.OR = [
        { submission: { simlok_number: { contains: search } } },
        { submission: { vendor_name: { contains: search } } },
        { user: { officer_name: { contains: search } } },
        { scan_location: { contains: search } },
      ];
    }

    // Get total and scans in parallel
    const [total, scans] = await Promise.all([
      prisma.qrScan.count({ where }),
      prisma.qrScan.findMany({
        where,
        select: {
          id: true,
          submission_id: true,
          scanned_by: true,
          scanner_name: true,
          scan_location: true,
          scanned_at: true,
          submission: {
            select: {
              id: true,
              simlok_number: true,
              vendor_name: true,
              officer_name: true,
              job_description: true,
              work_location: true,
              working_hours: true,
              implementation: true,
              worker_count: true,
              implementation_start_date: true,
              implementation_end_date: true,
              review_status: true,
              approval_status: true,
              created_at: true,
              user_email: true,
              user_phone_number: true,
              user_address: true,
              user_vendor_name: true,
              user_officer_name: true,
            },
          },
          user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { scanned_at: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Format timestamps
    const formattedScans = scans.map((s) => ({
      ...s,
      scanned_at: s.scanned_at ? formatScansDates([s])[0].scanned_at : s.scanned_at,
      submission: s.submission ? formatSubmissionDates(s.submission) : s.submission,
    }));

    return {
      scans: formattedScans,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

// Export singleton instance
export const qrVerificationService = new QRVerificationService();
