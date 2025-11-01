import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fileManager } from '@/lib/fileManager';

// Maksimum ukuran file (8MB)
const MAX_FILE_SIZE = 8 * 1024 * 1024;

// Jenis file gambar yang diizinkan
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// Ekstensi file yang diizinkan
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

export async function POST(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Akses tidak diizinkan. Silakan login terlebih dahulu.' }, { status: 401 });
    }

    // Ambil data form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const workerName = formData.get('workerName') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    // Validasi ukuran file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `Ukuran file terlalu besar. Maksimum adalah ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB.`
      }, { status: 400 });
    }

    // Validasi tipe file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: `Jenis file tidak didukung. Hanya gambar yang diizinkan: ${ALLOWED_EXTENSIONS.join(', ')}`
      }, { status: 400 });
    }

    // Validasi ekstensi file
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json({
        error: `Ekstensi file tidak valid. Ekstensi yang diperbolehkan: ${ALLOWED_EXTENSIONS.join(', ')}`
      }, { status: 400 });
    }

    // Konversi file menjadi buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Simpan file gambar pekerja (worker photo)
    const fileInfo = await fileManager.saveWorkerPhoto(
      buffer,
      file.name,
      session.user.id,
      workerName || 'tidak_ada_nama'
    );

    return NextResponse.json({
      success: true,
      message: 'File berhasil diunggah.',
      url: fileInfo.url,
      filename: fileInfo.newName,
      originalName: fileInfo.originalName,
      workerName: workerName,
      size: fileInfo.size,
      type: fileInfo.type,
      category: fileInfo.category,
      path: fileInfo.path
    });

  } catch (error) {
    console.error('Kesalahan saat mengunggah foto pekerja:', error);
    return NextResponse.json({
      error: 'Terjadi kesalahan internal saat mengunggah file.'
    }, { status: 500 });
  }
}

// GET /api/upload/worker-photo - Info endpoint upload
export async function GET() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
    allowedExtensions: ALLOWED_EXTENSIONS,
    description: 'Endpoint upload untuk foto pekerja (hanya format gambar).'
  });
}
