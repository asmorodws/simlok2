-- AlterTable
ALTER TABLE `User` ADD COLUMN `rejected_at` DATETIME(3) NULL,
    ADD COLUMN `rejected_by` VARCHAR(191) NULL,
    ADD COLUMN `rejection_reason` VARCHAR(191) NULL;
