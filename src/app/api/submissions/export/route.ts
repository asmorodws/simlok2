import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import * as XLSX from 'xlsx';

// GET /api/submissions/export - Export submissions to Excel (universal for all roles)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only specific roles can export
    if (!['REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Export access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reviewStatus = searchParams.get('reviewStatus');
    const approvalStatus = searchParams.get('approvalStatus');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {};

    // Apply role-based filtering (same as in GET /api/submissions)
    switch (session.user.role) {
      case 'REVIEWER':
        // Reviewers see submissions that need review or are being reviewed
        // Use the Prisma enum values defined in schema.prisma (NOT_MEETS_REQUIREMENTS)
        whereClause.review_status = { in: ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] };
        break;
        
      case 'APPROVER':
        // Approvers see submissions that have been reviewed and meet requirements
        whereClause.review_status = 'MEETS_REQUIREMENTS';
        whereClause.approval_status = { in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] };
        break;
        
      case 'ADMIN':
      case 'SUPER_ADMIN':
        // Admins can see all submissions (no additional filter)
        break;
    }

    // Apply additional filters
    if (reviewStatus && ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'].includes(reviewStatus)) {
      whereClause.review_status = reviewStatus;
    }

    if (approvalStatus && ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
      whereClause.approval_status = approvalStatus;
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
        whereClause.created_at.lte = new Date(endDate);
      }
    }

    // Fetch submissions
    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        approved_by_final_user: {
          select: {
            officer_name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // If no submissions found, inform client so it can show a friendly toast instead of downloading an empty file
    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ error: 'NO_DATA', message: 'Tidak ada data untuk rentang tanggal atau filter yang diberikan' }, { status: 404 });
    }

    // Prepare data for Excel
    const excelData = submissions.map((submission, index) => ({
      'No': index + 1,
      'Nama Vendor': submission.vendor_name,
      'Nama Petugas': submission.officer_name,
      'Email': submission.user_email || submission.user?.email || '',
      'Deskripsi Pekerjaan': submission.job_description,
      'Lokasi Kerja': submission.work_location,
      'Tanggal Pelaksanaan': submission.implementation_start_date ? 
        new Date(submission.implementation_start_date).toLocaleDateString('id-ID') : '',
      'Tanggal Selesai': submission.implementation_end_date ? 
        new Date(submission.implementation_end_date).toLocaleDateString('id-ID') : '',
      'Jumlah Pekerja': submission.worker_count || 0,
      'Status Review': submission.review_status === 'PENDING_REVIEW' ? 'Menunggu Review' :
                      submission.review_status === 'MEETS_REQUIREMENTS' ? 'Memenuhi Syarat' :
                      submission.review_status === 'NOT_MEETS_REQUIREMENTS' ? 'Tidak Memenuhi Syarat' : '',
      'Status Persetujuan': submission.approval_status === 'PENDING_APPROVAL' ? 'Menunggu Persetujuan' :
                           submission.approval_status === 'APPROVED' ? 'Disetujui' :
                           submission.approval_status === 'REJECTED' ? 'Ditolak' : '',
      'Nomor SIMLOK': submission.simlok_number || '',
      'Tanggal SIMLOK': submission.simlok_date ? 
        new Date(submission.simlok_date).toLocaleDateString('id-ID') : '',
      'Direview Oleh': submission.reviewed_by || '',
      'Tanggal Review': submission.reviewed_at ? 
        new Date(submission.reviewed_at).toLocaleDateString('id-ID') : '',
      'Disetujui Oleh': submission.approved_by_final_user?.officer_name || '',
      'Tanggal Persetujuan': submission.approved_at ? 
        new Date(submission.approved_at).toLocaleDateString('id-ID') : '',
      'Catatan untuk Approver': submission.note_for_approver || '',
      'Catatan untuk Vendor': submission.note_for_vendor || '',
      'Tanggal Dibuat': new Date(submission.created_at).toLocaleDateString('id-ID'),
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const rolePrefix = session.user.role === 'REVIEWER' ? 'reviewer' : 
                      session.user.role === 'APPROVER' ? 'approver' : 'admin';
    const filename = `submissions-export-${rolePrefix}-${timestamp}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting submissions:', error);
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mengekspor data' 
    }, { status: 500 });
  }
}