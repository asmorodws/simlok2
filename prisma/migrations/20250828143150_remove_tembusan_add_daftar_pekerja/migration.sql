/*
  Warnings:

  - You are about to drop the column `tembusan` on the `Submission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Submission` DROP COLUMN `tembusan`;

-- CreateTable
CREATE TABLE `DaftarPekerja` (
    `id` VARCHAR(191) NOT NULL,
    `nama_pekerja` VARCHAR(191) NOT NULL,
    `foto_pekerja` VARCHAR(191) NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DaftarPekerja_submission_id_idx`(`submission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DaftarPekerja` ADD CONSTRAINT `DaftarPekerja_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `Submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
