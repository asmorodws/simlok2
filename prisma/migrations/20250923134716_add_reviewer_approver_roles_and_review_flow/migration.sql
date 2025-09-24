-- AlterTable
ALTER TABLE `Notification` MODIFY `scope` ENUM('admin', 'vendor', 'reviewer', 'approver') NOT NULL;

-- AlterTable
ALTER TABLE `Submission` ADD COLUMN `approved_at` DATETIME(3) NULL,
    ADD COLUMN `approved_by_final_id` VARCHAR(191) NULL,
    ADD COLUMN `final_note` TEXT NULL,
    ADD COLUMN `final_status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    ADD COLUMN `review_note` TEXT NULL,
    ADD COLUMN `review_status` ENUM('PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS') NOT NULL DEFAULT 'PENDING_REVIEW',
    ADD COLUMN `reviewed_at` DATETIME(3) NULL,
    ADD COLUMN `reviewed_by_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('VENDOR', 'VERIFIER', 'ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'APPROVER') NOT NULL DEFAULT 'VENDOR';

-- CreateIndex
CREATE INDEX `Submission_review_status_idx` ON `Submission`(`review_status`);

-- CreateIndex
CREATE INDEX `Submission_final_status_idx` ON `Submission`(`final_status`);

-- CreateIndex
CREATE INDEX `Submission_reviewed_by_id_idx` ON `Submission`(`reviewed_by_id`);

-- CreateIndex
CREATE INDEX `Submission_approved_by_final_id_idx` ON `Submission`(`approved_by_final_id`);

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_approved_by_final_id_fkey` FOREIGN KEY (`approved_by_final_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
