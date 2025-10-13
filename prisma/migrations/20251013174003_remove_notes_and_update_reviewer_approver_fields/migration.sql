/*
  Warnings:

  - You are about to drop the column `notes` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `other_notes` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_by_id` on the `Submission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Submission` DROP FOREIGN KEY `Submission_approved_by_fkey`;

-- DropForeignKey
ALTER TABLE `Submission` DROP FOREIGN KEY `Submission_reviewed_by_id_fkey`;

-- DropIndex
DROP INDEX `Submission_approved_by_fkey` ON `Submission`;

-- DropIndex
DROP INDEX `Submission_reviewed_by_id_idx` ON `Submission`;

-- AlterTable
ALTER TABLE `Submission` DROP COLUMN `notes`,
    DROP COLUMN `other_notes`,
    DROP COLUMN `reviewed_by_id`,
    ADD COLUMN `reviewed_by` VARCHAR(191) NULL;
