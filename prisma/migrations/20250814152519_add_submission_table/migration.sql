-- CreateTable
CREATE TABLE `Submission` (
    `id` VARCHAR(191) NOT NULL,
    `status_approval_admin` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `approved_by_admin` VARCHAR(191) NULL,
    `nama_vendor` VARCHAR(191) NOT NULL,
    `berdasarkan` VARCHAR(191) NOT NULL,
    `nama_petugas` VARCHAR(191) NOT NULL,
    `pekerjaan` VARCHAR(191) NOT NULL,
    `lokasi_kerja` VARCHAR(191) NOT NULL,
    `pelaksanaan` VARCHAR(191) NOT NULL,
    `jam_kerja` VARCHAR(191) NOT NULL,
    `lain_lain` VARCHAR(191) NULL,
    `sarana_kerja` VARCHAR(191) NOT NULL,
    `tembusan` VARCHAR(191) NULL,
    `nomor_simja` VARCHAR(191) NULL,
    `tanggal_simja` DATETIME(3) NULL,
    `nomor_sika` VARCHAR(191) NULL,
    `tanggal_sika` DATETIME(3) NULL,
    `nomor_simlok` VARCHAR(191) NULL,
    `tanggal_simlok` DATETIME(3) NULL,
    `nama_pekerja` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NULL,
    `keterangan` VARCHAR(191) NULL,
    `upload_doc_sika` VARCHAR(191) NULL,
    `upload_doc_simja` VARCHAR(191) NULL,
    `upload_doc_id_card` VARCHAR(191) NULL,
    `qrcode` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_approved_by_admin_fkey` FOREIGN KEY (`approved_by_admin`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
