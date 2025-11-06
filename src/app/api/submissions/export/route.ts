import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import * as XLSX from 'xlsx';
import { toJakartaISOString } from '@/lib/timezone';

// Fungsi util aman untuk tanggal
const safeDate = (d?: Date | string | null): string =>
  d ? new Date(d).toLocaleDateString('id-ID') : '-';

// Fungsi util aman untuk teks
const safeText = (t?: string | null): string => (t && t.trim() !== '' ? t : '-');

// Fungsi util aman untuk angka
const safeNumber = (n?: number | null): number => (typeof n === 'number' ? n : 0);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    switch (session.user.role) {
      case 'REVIEWER':
        whereClause.review_status = { in: ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] };
        break;
      case 'APPROVER':
        whereClause.review_status = 'MEETS_REQUIREMENTS';
        whereClause.approval_status = { in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] };
        break;
    }

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

    // Optimized: Only select needed fields for export
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
        holiday_working_hours: true,
        work_facilities: true,
        simlok_number: true,
        simlok_date: true,
        content: true,
        created_at: true,
        approved_at: true,
        reviewed_at: true,
        review_status: true,
        approval_status: true,
        implementation_start_date: true,
        implementation_end_date: true,
        worker_count: true,
        vendor_phone: true,
        // Additional fields needed for export
        user_email: true,
        reviewed_by: true,
        approved_by: true,
        signer_position: true,
        note_for_approver: true,
        note_for_vendor: true,
        // Only needed fields from relations
        support_documents: {
          select: {
            document_type: true,
            document_subtype: true,
            document_number: true,
            document_date: true,
          }
        },
        worker_list: {
          select: {
            worker_name: true,
            hsse_pass_number: true,
            hsse_pass_valid_thru: true,
          }
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ error: 'NO_DATA', message: 'Tidak ada data ditemukan.' }, { status: 404 });
    }

    // --- urutan header dokumen yang tetap
    const orderedSupportDocsHeaders: string[] = [
      'Nomor SIMJA',
      'Tanggal SIMJA',
      'Nomor SIKA (Pekerjaan Dingin)',
      'Tanggal SIKA (Pekerjaan Dingin)',
      'Nomor SIKA (Pekerjaan Panas)',
      'Tanggal SIKA (Pekerjaan Panas)',
      'Nomor SIKA (Confined Space)',
      'Tanggal SIKA (Confined Space)',
      'Nomor Work Order',
      'Tanggal Work Order',
      'Nomor Kontrak Kerja',
      'Tanggal Kontrak Kerja',
      'Nomor JSA',
      'Tanggal JSA',
    ];

    const labelType: Record<string, string> = {
      WORK_ORDER: 'Work Order',
      KONTRAK_KERJA: 'Kontrak Kerja',
      SIMJA: 'SIMJA',
      SIKA: 'SIKA',
      JSA: 'JSA',
    };

    const excelData = submissions.map((submission, idx) => {
      const support: Record<string, string> = {};
      for (const h of orderedSupportDocsHeaders) support[h] = '-';

      const docs = submission.support_documents ?? [];
      if (Array.isArray(docs)) {
        for (const doc of docs) {
          if (!doc) continue;
          const typeLabel = labelType[doc.document_type ?? ''] ?? '-';
          const subtype = safeText(doc.document_subtype);
          const number = safeText(doc.document_number);
          const date = safeDate(doc.document_date);

          if (doc.document_type === 'SIKA') {
            if (subtype === 'Pekerjaan Dingin') {
              support['Nomor SIKA (Pekerjaan Dingin)'] = number;
              support['Tanggal SIKA (Pekerjaan Dingin)'] = date;
            } else if (subtype === 'Pekerjaan Panas') {
              support['Nomor SIKA (Pekerjaan Panas)'] = number;
              support['Tanggal SIKA (Pekerjaan Panas)'] = date;
            } else if (subtype === 'Confined Space') {
              support['Nomor SIKA (Confined Space)'] = number;
              support['Tanggal SIKA (Confined Space)'] = date;
            }
          } else {
            if (typeLabel === 'Work Order') {
              support['Nomor Work Order'] = number;
              support['Tanggal Work Order'] = date;
            } else if (typeLabel === 'Kontrak Kerja') {
              support['Nomor Kontrak Kerja'] = number;
              support['Tanggal Kontrak Kerja'] = date;
            } else if (typeLabel === 'SIMJA') {
              support['Nomor SIMJA'] = number;
              support['Tanggal SIMJA'] = date;
            } else if (typeLabel === 'JSA') {
              support['Nomor JSA'] = number;
              support['Tanggal JSA'] = date;
            }
          }
        }
      }

      const workers = submission.worker_list ?? [];
      const workerText =
        Array.isArray(workers) && workers.length > 0
          ? workers
              .map((w, i) => {
                if (!w) return '-';
                const valid = safeDate(w.hsse_pass_valid_thru);
                return `${i + 1}. ${safeText(w.worker_name)}, ${safeText(w.hsse_pass_number)}, ${valid}`;
              })
              .join('\n')
          : '-';

      const row: Record<string, string | number> = {
        'No': idx + 1,
        'Nama Vendor': safeText(submission.vendor_name),
        'Nama Petugas': safeText(submission.officer_name),
        'Email': safeText(submission.user_email),
        'Nomor Telepon': safeText(submission.vendor_phone),
      };

      for (const h of orderedSupportDocsHeaders) row[h] = support[h] ?? '-';

      row['Deskripsi Pekerjaan'] = safeText(submission.job_description);
      row['Lokasi Kerja'] = safeText(submission.work_location);
      row['Sarana Kerja'] = safeText(submission.work_facilities);
      row['Jam Kerja'] = safeText(submission.working_hours);
      row['Tanggal Pelaksanaan'] = safeDate(submission.implementation_start_date);
      row['Tanggal Selesai'] = safeDate(submission.implementation_end_date);
      row['Jumlah Pekerja'] = safeNumber(submission.worker_count);
      row['Nama, HSSE dan Berlaku Hingga'] = workerText;
      row['Status Review'] =
        submission.review_status === 'PENDING_REVIEW'
          ? 'Menunggu Review'
          : submission.review_status === 'MEETS_REQUIREMENTS'
          ? 'Memenuhi Syarat'
          : submission.review_status === 'NOT_MEETS_REQUIREMENTS'
          ? 'Tidak Memenuhi Syarat'
          : '-';
      row['Status Persetujuan'] =
        submission.approval_status === 'PENDING_APPROVAL'
          ? 'Menunggu Persetujuan'
          : submission.approval_status === 'APPROVED'
          ? 'Disetujui'
          : submission.approval_status === 'REJECTED'
          ? 'Ditolak'
          : '-';
      row['Nomor SIMLOK'] = submission.simlok_number ? submission.simlok_number : `DRAFT/S00330/${submission.created_at.getFullYear()}-S0`;
      row['Tanggal SIMLOK Disetujui'] = submission.simlok_date ? new Date(submission.simlok_date).toLocaleDateString('id-ID') : `DRAFT/DRAFT/${submission.created_at.getFullYear()}`;
      row['Direview Oleh'] = safeText(submission.reviewed_by);
      row['Tanggal Review'] = safeDate(submission.reviewed_at);
      row['Disetujui Oleh'] = safeText(submission.approved_by);
      row['Jabatan Approver'] = safeText(submission.signer_position);
      // row['Tanggal Persetujuan'] = safeDate(submission.approved_at);
      row['Catatan untuk Approver'] = safeText(submission.note_for_approver);
      row['Catatan untuk Vendor'] = safeText(submission.note_for_vendor);
      row['Tanggal Dibuat'] = safeDate(submission.created_at);

      return row;
    });

    if (excelData.length === 0) {
      return NextResponse.json({ error: 'NO_VALID_DATA' }, { status: 404 });
    }

    const workbook = XLSX.utils.book_new();
    const headers = Object.keys(excelData[0] ?? {});
    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });

    const overrideCols: Record<string, number> = {
      'Deskripsi Pekerjaan': 50,
      'Nama, HSSE dan Berlaku Hingga': 60,
      'Catatan untuk Vendor': 40,
      'Catatan untuk Approver': 35,
    };

    const colWidths = headers.map((header) => {
      let maxLen = header.length;
      for (const row of excelData) {
        const val = row[header];
        if (val === null || val === undefined) continue;
        const str = String(val);
        const longest = str.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
        maxLen = Math.max(maxLen, longest);
      }
      const adjusted = Math.min(Math.max(maxLen + 2, 10), 80);
      return { wch: overrideCols[header] || adjusted };
    });

    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const jakartaNow = toJakartaISOString(new Date());
  const today = jakartaNow ? jakartaNow.split('T')[0] : new Date().toISOString().split('T')[0];
  const filename = `simlok_export_${today}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    console.error('❌ Error exporting submissions:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengekspor data' }, { status: 500 });
  }
}
