// Contoh penggunaan tabel DaftarPekerja yang baru
import { prisma } from '@/lib/prisma';

// 1. Menambahkan daftar pekerja ke submission
async function addWorkersToSubmission(submissionId: string, workers: string[]) {
  const daftarPekerja = workers.map(nama => ({
    nama_pekerja: nama,
    submission_id: submissionId,
    foto_pekerja: null // bisa diisi nanti
  }));

  return await prisma.daftarPekerja.createMany({
    data: daftarPekerja
  });
}

// 2. Mengupdate foto pekerja
async function updateWorkerPhoto(workerId: string, fotoUrl: string) {
  return await prisma.daftarPekerja.update({
    where: { id: workerId },
    data: { foto_pekerja: fotoUrl }
  });
}

// 3. Mengambil submission dengan daftar pekerja
async function getSubmissionWithWorkers(submissionId: string) {
  return await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      daftarPekerja: true,
      user: true
    }
  });
}

// 4. Mengambil semua submission dengan daftar pekerja untuk PDF
async function getSubmissionForPDF(submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      daftarPekerja: {
        select: {
          nama_pekerja: true,
          foto_pekerja: true
        }
      }
    }
  });

  if (!submission) return null;

  // Format untuk PDF template
  return {
    ...submission,
    daftarPekerja: submission.daftarPekerja
  };
}

// 5. Migrasi data nama_pekerja lama ke tabel DaftarPekerja
async function migrateOldWorkerNames() {
  const submissions = await prisma.submission.findMany({
    where: {
      nama_pekerja: {
        not: ""
      }
    }
  });

  for (const submission of submissions) {
    if (submission.nama_pekerja) {
      const workerNames = submission.nama_pekerja
        .split('\n')
        .map(name => name.trim())
        .filter(name => name);

      for (const nama of workerNames) {
        await prisma.daftarPekerja.create({
          data: {
            nama_pekerja: nama,
            submission_id: submission.id,
            foto_pekerja: null
          }
        });
      }
    }
  }
}

export {
  addWorkersToSubmission,
  updateWorkerPhoto,
  getSubmissionWithWorkers,
  getSubmissionForPDF,
  migrateOldWorkerNames
};
