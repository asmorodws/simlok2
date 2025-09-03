import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
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
            nama_petugas: true,
            nama_vendor: true,
            email: true,
            no_telp: true,
          }
        },
        daftarPekerja: {
          select: {
            id: true,
            nama_pekerja: true,
            foto_pekerja: true,
          }
        },
        approvedByUser: {
          select: {
            id: true,
            nama_petugas: true,
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
      nomorSurat: submission.berdasarkan,
      perihal: submission.pekerjaan,
      tujuan: submission.lokasi_kerja,
      tempatPelaksanaan: submission.lokasi_kerja,
      tanggalMulai: submission.tanggal_simja ? new Date(submission.tanggal_simja).toLocaleDateString('id-ID') : '',
      tanggalSelesai: submission.tanggal_sika ? new Date(submission.tanggal_sika).toLocaleDateString('id-ID') : '',
      statusApproval: submission.status_approval_admin,
      
      // User Info
      vendorName: submission.user.nama_petugas,
      vendorCompany: submission.user.nama_vendor || '',
      vendorEmail: submission.user.email,
      vendorPhone: submission.user.no_telp || '',
      
      // Submission dates
      submittedAt: new Date(submission.created_at).toLocaleDateString('id-ID'),
      approvedAt: '', // No approvedAt field in current schema
      
      // Workers count
      totalWorkers: submission.daftarPekerja.length,
      
      // Workers data (simplified structure)
      daftarPekerja: submission.daftarPekerja.map(worker => ({
        id: worker.id,
        namaLengkap: worker.nama_pekerja,
        foto: worker.foto_pekerja || '',
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
      dokumenSika: submission.upload_doc_sika || '',
      dokumenSimja: submission.upload_doc_simja || '',
      
      // Additional info
      catatan: submission.keterangan || '',
      signerName: submission.nama_signer || '',
      signerTitle: submission.jabatan_signer || '',
      
      // Additional fields from schema
      jamKerja: submission.jam_kerja,
      saranaKerja: submission.sarana_kerja,
      pelaksanaan: submission.pelaksanaan || '',
      lainLain: submission.lain_lain || '',
      nomorSimja: submission.nomor_simja || '',
      tanggalSimja: submission.tanggal_simja ? new Date(submission.tanggal_simja).toLocaleDateString('id-ID') : '',
      nomorSika: submission.nomor_sika || '',
      tanggalSika: submission.tanggal_sika ? new Date(submission.tanggal_sika).toLocaleDateString('id-ID') : '',
      nomorSimlok: submission.nomor_simlok || '',
      tanggalSimlok: submission.tanggal_simlok ? new Date(submission.tanggal_simlok).toLocaleDateString('id-ID') : '',
      namaPerkerjaText: submission.nama_pekerja,
      content: submission.content || '',
      qrcode: submission.qrcode || '',
      approvedBy: submission.approvedByUser?.nama_petugas || ''
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
