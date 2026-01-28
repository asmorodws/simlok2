import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';
import { parseQrString, type QrPayload } from '@/lib/auth/qrSecurity';
import { toJakartaISOString } from '@/lib/helpers/timezone';
import { rateLimiter, RateLimitPresets, getRateLimitHeaders } from '@/lib/api/rateLimiter';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';

// POST /api/qr/verify - Verify QR code and return submission data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, ['VERIFIER', 'ADMIN'], 'Hanya verifikator dan admin yang dapat melakukan scan QR code/barcode.');
    if (userOrError instanceof NextResponse) return userOrError;

    // ========== RATE LIMITING ==========
    const rateLimitResult = rateLimiter.check(
      userOrError.id,
      RateLimitPresets.qrVerification
    );

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json({ 
        success: false,
        error: RateLimitPresets.qrVerification.message,
        retryAfter: rateLimitResult.retryAfter 
      }, { status: 429, headers });
    }

    const body = await request.json();
    const { qrData, qr_data, scanLocation } = body;

    // Support both qrData and qr_data parameter names for compatibility
    const qrString = qr_data || qrData;

    if (!qrString) {
      return NextResponse.json({ 
        success: false,
        message: 'String QR/Barcode diperlukan' 
      }, { status: 400 });
    }

    // Parse and verify QR code or barcode
    const qrPayload: QrPayload | null = parseQrString(qrString);
    
    if (!qrPayload) {
      return NextResponse.json({ 
        success: false,
        message: 'QR code/barcode tidak valid atau data telah diubah. Pastikan Anda melakukan scan QR code atau barcode SIMLOK yang valid yang dihasilkan oleh sistem.' 
      }, { status: 400 });
    }

    // Validate QR code is being scanned within implementation period
    const { isQrValidForDate } = await import('@/lib/auth/qrSecurity');
    if (!isQrValidForDate(qrPayload)) {
      // Provide specific error message based on dates
      let errorMessage = 'QR code tidak dapat digunakan saat ini.';
      
      if (qrPayload.start_date && qrPayload.end_date) {
        errorMessage = `QR code hanya dapat digunakan dari tanggal ${qrPayload.start_date} sampai ${qrPayload.end_date}.`;
      } else if (qrPayload.start_date) {
        errorMessage = `QR code hanya dapat digunakan mulai tanggal ${qrPayload.start_date}.`;
      } else if (qrPayload.end_date) {
        errorMessage = `QR code telah kadaluarsa. Periode pelaksanaan berakhir pada ${qrPayload.end_date}.`;
      }
      
      return NextResponse.json({ 
        success: false,
        message: errorMessage
      }, { status: 400 });
    }

    // Validate submission ID format before database query (prevent injection)
    if (!qrPayload.id || !qrPayload.id.match(/^[a-zA-Z0-9_-]+$/)) {
      return NextResponse.json({ 
        success: false,
        message: 'Format ID pengajuan tidak valid' 
      }, { status: 400 });
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
      return NextResponse.json({ 
        success: false,
        message: 'Pengajuan tidak ditemukan' 
      }, { status: 404 });
    }

    // Check if submission is approved
    if (submission.approval_status !== 'APPROVED') {
      return NextResponse.json({ 
        success: false,
        message: 'Pengajuan ini belum disetujui' 
      }, { status: 400 });
    }

    // Check if this user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: userOrError.id },
      select: { id: true, email: true, role: true, officer_name: true, address: true }
    });
    
    if (!userExists) {
      return NextResponse.json({ 
        success: false,
        message: 'Sesi pengguna tidak valid. Silakan login kembali.' 
      }, { status: 401 });
    }

    // Check for duplicate scans - only prevent same verifier scanning same SIMLOK on same day
    // Get today's date range (start and end of day) using Jakarta timezone
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const today = new Date(jakartaNow);
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    // Check if the same verifier has already scanned today
    const existingTodayScanByUser = await prisma.qrScan.findFirst({
      where: {
        submission_id: qrPayload.id,
        scanned_by: userOrError.id,
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

      return NextResponse.json({ 
        success: false, 
        error: 'duplicate_scan_same_day',
        message: `QR code sudah anda scan hari ini pada ${formattedDate}. Satu verifikator hanya dapat melakukan scan sekali per hari untuk SIMLOK yang sama.`,
        previousScan: {
          scanDate: existingTodayScanByUser.scanned_at,
          scanId: existingTodayScanByUser.id,
          scannerName: existingTodayScanByUser.user.officer_name,
        }
      }, { status: 409 });
    }

    // Note: Different verifiers CAN scan the same SIMLOK on the same day
    // This is allowed per the new requirements

    // Record the scan in database
    try {
      const scanRecord = await prisma.qrScan.create({
        data: {
          submission_id: qrPayload.id,
          scanned_by: userOrError.id,
          scanner_name: userExists.officer_name || userOrError.officer_name,
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
      const simjaDoc = (submission as any).support_documents?.find((d: any) => d.document_type === 'SIMJA');
      const sikaDoc = (submission as any).support_documents?.find((d: any) => d.document_type === 'SIKA');
      const hsseDoc = (submission as any).support_documents?.find((d: any) => d.document_type === 'HSSE_PASS');

      // Return verification result with complete submission data in the format expected by the modal
      return NextResponse.json({
        success: true,
        message: 'QR code/barcode berhasil diverifikasi',
        scan_id: scanRecord.id,
        scanned_at: toJakartaISOString(scanRecord.scanned_at) || scanRecord.scanned_at,
        scanned_by: scanRecord.user?.officer_name || userOrError.officer_name,
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
            hsse_pass_valid_thru: null, // Not available in schema
            
            // Workers
            worker_count: submission.worker_count,
            worker_names: submission.worker_names,
            workers: (submission as any).worker_list?.map((w: any) => ({
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
      });

    } catch (createError: any) {
      
      // Check if it's a unique constraint violation (in case of race condition)
      if (createError?.code === 'P2002') {
        
        // Check again for today's scans by same user only (race condition handling) - use Jakarta time
        const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const today = new Date(jakartaNow);
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        
        const raceConditionScan = await prisma.qrScan.findFirst({
          where: {
            submission_id: qrPayload.id,
            scanned_by: userOrError.id, // Only check for same user
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

          return NextResponse.json({ 
            success: false, 
            error: 'duplicate_scan_same_day',
            message: `Anda sudah melakukan scan untuk SIMLOK ini hari ini pada ${formattedDate}. Verifikator yang sama tidak dapat scan SIMLOK yang sama di hari yang sama.`
          }, { status: 409 });
        }

        return NextResponse.json({ 
          success: false, 
          error: 'duplicate_scan',
          message: 'QR Code ini sudah pernah discan hari ini (race condition detected)'
        }, { status: 409 });
      }
      
      throw createError; // Re-throw if it's not a constraint violation
    }

  } catch (error) {
    console.error('QR/Barcode verification error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Terjadi kesalahan server saat verifikasi QR/Barcode' 
    }, { status: 500 });
  }
}

// GET /api/qr/verify - Get recent scan history (for admin/verifier dashboard)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, ['VERIFIER', 'ADMIN'], 'Hanya verifikator dan admin yang dapat melihat riwayat scan.');
    if (userOrError instanceof NextResponse) return userOrError;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const submissionId = searchParams.get('submission_id');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const location = searchParams.get('location');

    // Build where clause
    const whereClause: any = {};
    
    if (submissionId) {
      whereClause.submission_id = submissionId;
    }

    // For verifiers, only show their own scans
    if (userOrError.role === 'VERIFIER') {
      whereClause.scanned_by = userOrError.id;
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
        endDate.setHours(23, 59, 59, 999); // End of day
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
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await prisma.qrScan.count({
      where: whereClause,
    });

    // Format timestamps and nested submission dates to Jakarta
    const { formatScansDates, formatSubmissionDates } = await import('@/lib/helpers/timezone');
    const formattedScans = scans.map(s => ({
      ...s,
      scanned_at: (s.scanned_at ? new Date(s.scanned_at) : null) ? formatScansDates([s])[0].scanned_at : s.scanned_at,
      submission: s.submission ? formatSubmissionDates(s.submission) : s.submission
    }));

    return NextResponse.json({
      scans: formattedScans,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      }
    });

  } catch (error) {
    console.error('Scan history fetch error:', error);
    return NextResponse.json({ 
      error: 'Terjadi kesalahan server saat mengambil riwayat scan' 
    }, { status: 500 });
  }
}
