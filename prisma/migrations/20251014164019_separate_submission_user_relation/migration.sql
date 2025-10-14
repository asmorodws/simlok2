-- DropForeignKey
ALTER TABLE `Submission` DROP FOREIGN KEY `Submission_user_id_fkey`;

-- DropIndex
DROP INDEX `Submission_user_id_approval_status_idx` ON `Submission`;

-- AlterTable
ALTER TABLE `Submission` ADD COLUMN `user_address` VARCHAR(191) NULL,
    ADD COLUMN `user_email` VARCHAR(191) NULL,
    ADD COLUMN `user_officer_name` VARCHAR(191) NULL,
    ADD COLUMN `user_phone_number` VARCHAR(191) NULL,
    ADD COLUMN `user_vendor_name` VARCHAR(191) NULL,
    MODIFY `user_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
