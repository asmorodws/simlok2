import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all submissions with related data
    const submissions = await prisma.submission.findMany({
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            vendor_name: true,
            email: true,
            phone_number: true,
          }
        },
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            worker_photo: true,
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
      }
    });

    // Transform data for export
    const exportData = submissions.map(submission => ({
      // Submission Info
      id: submission.id,
      nomorSurat: submission.based_on,
      perihal: submission.job_description,
      tujuan: submission.work_location,
      tempatPelaksanaan: submission.work_location,
      tanggalMulai: submission.simja_date ? new Date(submission.simja_date).toLocaleDateString('id-ID') : '',
      tanggalSelesai: submission.sika_date ? new Date(submission.sika_date).toLocaleDateString('id-ID') : '',
      statusApproval: submission.approval_status,
      
      // User Info
      vendorName: submission.user.officer_name,
      vendorCompany: submission.user.vendor_name || '',
      vendorEmail: submission.user.email,
      vendorPhone: submission.user.phone_number || '',
      
      // Submission dates
      submittedAt: new Date(submission.created_at).toLocaleDateString('id-ID'),
      approvedAt: '', // No approvedAt field in current schema
      
      // Workers count
      totalWorkers: submission.worker_list.length,
      
      // Workers data (simplified structure)
      daftarPekerja: submission.worker_list.map(worker => ({
        id: worker.id,
        namaLengkap: worker.worker_name,
        foto: worker.worker_photo || '',
        // Other fields not available in current schema
        nik: '',
        tempatLahir: '',
        tanggalLahir: '',
        jenisKelamin: '',
        agama: '',
        statusPerkawinan: '',
        alamat: '',
        noTelepon: '',
        email: '',
        pendidikanTerakhir: '',
        jabatan: '',
        pengalaman: '',
        keahlianKhusus: '',
        sertifikasi: '',
        catatan: ''
      })),
      
      // Documents info
      dokumenSika: submission.sika_document_upload || '',
      dokumenSimja: submission.simja_document_upload || '',
      
      // Additional info
      catatan: submission.content || '',
      signerName: submission.signer_name || '',
      signerTitle: submission.signer_position || '',
      
      // Additional fields from schema
      jamKerja: submission.working_hours,
      saranaKerja: submission.work_facilities,
      pelaksanaan: submission.implementation || '',
      lainLain: submission.other_notes || '',
      nomorSimja: submission.simja_number || '',
      tanggalSimja: submission.simja_date ? new Date(submission.simja_date).toLocaleDateString('id-ID') : '',
      nomorSika: submission.sika_number || '',
      tanggalSika: submission.sika_date ? new Date(submission.sika_date).toLocaleDateString('id-ID') : '',
      nomorSimlok: submission.simlok_number || '',
      tanggalSimlok: submission.simlok_date ? new Date(submission.simlok_date).toLocaleDateString('id-ID') : '',
      namaPerkerjaText: submission.worker_names,
      content: submission.content || '',
      qrcode: submission.qrcode || '',
      approvedBy: submission.approved_by_user?.officer_name || ''
    }));

    return NextResponse.json({
      success: true,
      submissions: exportData,
      total: submissions.length,
      exportedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
