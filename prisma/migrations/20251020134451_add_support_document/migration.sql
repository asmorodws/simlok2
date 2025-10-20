/*
  Warnings:

  - You are about to drop the column `hsse_pass_document_upload` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `hsse_pass_number` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `hsse_pass_valid_thru` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `sika_date` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `sika_document_upload` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `sika_number` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `sika_type` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `simja_date` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `simja_document_upload` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `simja_number` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `simja_type` on the `Submission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Submission` DROP COLUMN `hsse_pass_document_upload`,
    DROP COLUMN `hsse_pass_number`,
    DROP COLUMN `hsse_pass_valid_thru`,
    DROP COLUMN `sika_date`,
    DROP COLUMN `sika_document_upload`,
    DROP COLUMN `sika_number`,
    DROP COLUMN `sika_type`,
    DROP COLUMN `simja_date`,
    DROP COLUMN `simja_document_upload`,
    DROP COLUMN `simja_number`,
    DROP COLUMN `simja_type`;

-- CreateTable
CREATE TABLE `SupportDocument` (
    `id` VARCHAR(191) NOT NULL,
    `document_name` VARCHAR(191) NOT NULL,
    `document_type` VARCHAR(191) NULL,
    `document_upload` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploaded_by` VARCHAR(191) NOT NULL,

    INDEX `SupportDocument_uploaded_by_idx`(`uploaded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SupportDocument` ADD CONSTRAINT `SupportDocument_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `Submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
