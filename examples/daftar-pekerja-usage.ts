// Contoh penggunaan tabel WorkerList yang baru
import { prisma } from '@/lib/prisma';

// 1. Menambahkan daftar pekerja ke submission
async function addWorkersToSubmission(submissionId: string, workers: string[]) {
  const workerList = workers.map(nama => ({
    worker_name: nama,
    submission_id: submissionId,
    worker_photo: null // bisa diisi nanti
  }));

  return await prisma.workerList.createMany({
    data: workerList
  });
}

// 2. Mengupdate foto pekerja
async function updateWorkerPhoto(workerId: string, fotoUrl: string) {
  return await prisma.workerList.update({
    where: { id: workerId },
    data: { worker_photo: fotoUrl }
  });
}

// 3. Mengambil submission dengan daftar pekerja
async function getSubmissionWithWorkers(submissionId: string) {
  return await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      worker_list: true,
      user: true
    }
  });
}

// 4. Mengambil semua submission dengan daftar pekerja untuk PDF
async function getSubmissionForPDF(submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      worker_list: {
        select: {
          worker_name: true,
          worker_photo: true
        }
      }
    }
  });

  if (!submission) return null;

  // Format untuk PDF template
  return {
    ...submission,
    workerList: submission.worker_list
  };
}

// 5. Migrasi data worker_names lama ke tabel WorkerList
async function migrateOldWorkerNames() {
  const submissions = await prisma.submission.findMany({
    where: {
      worker_names: {
        not: ""
      }
    }
  });

  for (const submission of submissions) {
    if (submission.worker_names) {
      const workerNames = submission.worker_names
        .split('\n')
        .map((name: string) => name.trim())
        .filter((name: string) => name);

      for (const nama of workerNames) {
        await prisma.workerList.create({
          data: {
            worker_name: nama,
            submission_id: submission.id,
            worker_photo: null
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
