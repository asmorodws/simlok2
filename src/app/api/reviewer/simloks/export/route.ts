import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import * as XLSX from 'xlsx';

// GET /api/reviewer/simloks/export - Export submissions to Excel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER or SUPER_ADMIN can access this endpoint
    if (!['REVIEWER', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reviewStatus = searchParams.get('reviewStatus');
    const finalStatus = searchParams.get('finalStatus');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {};

    // Apply same filters as the main submissions list
    if (reviewStatus && ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'].includes(reviewStatus)) {
      whereClause.review_status = reviewStatus;
    }

    if (finalStatus && ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(finalStatus)) {
      whereClause.approval_status = finalStatus;
    }

    if (search) {
      whereClause.OR = [
        { vendor_name: { contains: search } },
        { job_description: { contains: search } },
        { officer_name: { contains: search } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) {
        whereClause.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.created_at.lte = endDateTime;
      }
    }

    // Fetch all submissions matching the filters
    const submissions = await prisma.submission.findMany({
      where: whereClause,
      select: {
        id: true,
        vendor_name: true,
        officer_name: true,
        job_description: true,
        work_location: true,
        implementation: true,
        working_hours: true,
        other_notes: true,
        work_facilities: true,
        based_on: true,
        approval_status: true,
        review_status: true,
        content: true,
        notes: true,
        note_for_approver: true,
        note_for_vendor: true,
        simja_number: true,
        simja_date: true,
        sika_number: true,
        sika_date: true,
        simlok_number: true,
        simlok_date: true,
        signer_name: true,
        signer_position: true,
        created_at: true,
        reviewed_at: true,
        approved_at: true,
        user: {
          select: {
            email: true,
            phone_number: true,
            verification_status: true,
          }
        },
        reviewed_by_user: {
          select: {
            officer_name: true,
            email: true,
          }
        },
        approved_by_final_user: {
          select: {
            officer_name: true,
            email: true,
          }
        },
        worker_list: {
          select: {
            worker_name: true,
          }
        },
        _count: {
          select: {
            qrScans: true
          }
        },
        qrScans: {
          select: {
            scanned_at: true,
            scan_location: true,
          },
          orderBy: {
            scanned_at: 'desc'
          },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' },
    });

    // Format data for Excel export
    const excelData = submissions.map((submission, index) => {
      // Get worker names as comma-separated string
      const workerNames = submission.worker_list.map(w => w.worker_name).join(', ');
      
      // Format dates
      const formatDate = (date: Date | string | null) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      // Format status
      const formatStatus = (status: string) => {
        switch (status) {
          case 'PENDING_REVIEW': return 'Menunggu Review';
          case 'MEETS_REQUIREMENTS': return 'Memenuhi Syarat';
          case 'NOT_MEETS_REQUIREMENTS': return 'Tidak Memenuhi Syarat';
          case 'PENDING_APPROVAL': return 'Menunggu Persetujuan';
          case 'APPROVED': return 'Disetujui';
          case 'REJECTED': return 'Ditolak';
          default: return status;
        }
      };

      return {
        'No': index + 1,
        'Tanggal Pengajuan': formatDate(submission.created_at),
        'Nama Vendor': submission.vendor_name,
        'Penanggung Jawab': submission.officer_name,
        'Email Vendor': submission.user?.email || '-',
        'Telepon': submission.user?.phone_number || '-',
        'Status Verifikasi Vendor': submission.user?.verification_status || '-',
        'Deskripsi Pekerjaan': submission.job_description,
        'Lokasi Kerja': submission.work_location,
        'Pelaksanaan': submission.implementation || '-',
        'Jam Kerja': submission.working_hours,
        'Fasilitas Kerja': submission.work_facilities,
        'Berdasarkan': submission.based_on,
        'Catatan Lain': submission.other_notes || '-',
        'Daftar Pekerja': workerNames,
        'Jumlah Pekerja': submission.worker_list.length,
        'Status Review': formatStatus(submission.review_status),
        'Status Final': formatStatus(submission.approval_status),
        'Catatan Review': submission.note_for_approver || '-',
        'Catatan Final': submission.note_for_vendor || '-',
        'Reviewer': submission.reviewed_by_user?.officer_name || '-',
        'Email Reviewer': submission.reviewed_by_user?.email || '-',
        'Approver': submission.approved_by_final_user?.officer_name || '-',
        'Email Approver': submission.approved_by_final_user?.email || '-',
        'Tanggal Review': formatDate(submission.reviewed_at),
        'Tanggal Approval': formatDate(submission.approved_at),
        'Nomor SIMJA': submission.simja_number || '-',
        'Tanggal SIMJA': submission.simja_date ? new Date(submission.simja_date).toLocaleDateString('id-ID') : '-',
        'Nomor SIKA': submission.sika_number || '-',
        'Tanggal SIKA': submission.sika_date ? new Date(submission.sika_date).toLocaleDateString('id-ID') : '-',
        'Nomor SIMLOK': submission.simlok_number || '-',
        'Tanggal SIMLOK': submission.simlok_date ? new Date(submission.simlok_date).toLocaleDateString('id-ID') : '-',
        'Nama Penandatangan': submission.signer_name || '-',
        'Jabatan Penandatangan': submission.signer_position || '-',
        'Jumlah Scan QR': submission._count.qrScans,
        'Terakhir Discan': submission.qrScans[0] ? formatDate(submission.qrScans[0].scanned_at) : '-',
        'Lokasi Scan Terakhir': submission.qrScans[0]?.scan_location || '-',
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 5 },   // No
      { wch: 18 },  // Tanggal Pengajuan
      { wch: 25 },  // Nama Vendor
      { wch: 20 },  // Penanggung Jawab
      { wch: 25 },  // Email Vendor
      { wch: 15 },  // Telepon
      { wch: 15 },  // Status Verifikasi
      { wch: 40 },  // Deskripsi Pekerjaan
      { wch: 30 },  // Lokasi Kerja
      { wch: 20 },  // Pelaksanaan
      { wch: 15 },  // Jam Kerja
      { wch: 30 },  // Fasilitas Kerja
      { wch: 15 },  // Berdasarkan
      { wch: 30 },  // Catatan Lain
      { wch: 50 },  // Daftar Pekerja
      { wch: 12 },  // Jumlah Pekerja
      { wch: 18 },  // Status Review
      { wch: 18 },  // Status Final
      { wch: 30 },  // Catatan Review
      { wch: 30 },  // Catatan Final
      { wch: 20 },  // Reviewer
      { wch: 25 },  // Email Reviewer
      { wch: 20 },  // Approver
      { wch: 25 },  // Email Approver
      { wch: 18 },  // Tanggal Review
      { wch: 18 },  // Tanggal Approval
      { wch: 15 },  // Nomor SIMJA
      { wch: 15 },  // Tanggal SIMJA
      { wch: 15 },  // Nomor SIKA
      { wch: 15 },  // Tanggal SIKA
      { wch: 15 },  // Nomor SIMLOK
      { wch: 15 },  // Tanggal SIMLOK
      { wch: 25 },  // Nama Penandatangan
      { wch: 25 },  // Jabatan Penandatangan
      { wch: 12 },  // Jumlah Scan QR
      { wch: 18 },  // Terakhir Discan
      { wch: 20 },  // Lokasi Scan Terakhir
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pengajuan SIMLOK');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true 
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    let filename = `Data_Pengajuan_SIMLOK_${timestamp}`;
    
    // Add filter info to filename
    const filters = [];
    if (reviewStatus) filters.push(reviewStatus);
    if (finalStatus) filters.push(finalStatus);
    if (search) filters.push(`search-${search.substring(0, 10)}`);
    if (startDate || endDate) {
      if (startDate && endDate) {
        const start = new Date(startDate).toISOString().split('T')[0];
        const end = new Date(endDate).toISOString().split('T')[0];
        filters.push(`${start}_to_${end}`);
      } else if (startDate) {
        const start = new Date(startDate).toISOString().split('T')[0];
        filters.push(`dari_${start}`);
      } else if (endDate) {
        const end = new Date(endDate).toISOString().split('T')[0];
        filters.push(`sampai_${end}`);
      }
    }
    
    if (filters.length > 0) {
      filename += `_${filters.join('_')}`;
    }
    
    filename += '.xlsx';

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error exporting submissions to Excel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}