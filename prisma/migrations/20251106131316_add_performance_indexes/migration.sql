-- CreateIndex
CREATE INDEX `User_verification_status_created_at_idx` ON `User`(`verification_status`, `created_at`);

-- CreateIndex
CREATE INDEX `User_role_verified_at_idx` ON `User`(`role`, `verified_at`);

-- RenameIndex
ALTER TABLE `SupportDocument` RENAME INDEX `SupportDocument_submission_id_fkey` TO `SupportDocument_submission_id_idx`;
