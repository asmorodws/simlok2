-- CreateIndex
CREATE INDEX `Submission_approval_status_idx` ON `Submission`(`approval_status`);

-- CreateIndex
CREATE INDEX `Submission_created_at_idx` ON `Submission`(`created_at`);

-- CreateIndex
CREATE INDEX `Submission_user_id_approval_status_idx` ON `Submission`(`user_id`, `approval_status`);

-- RenameIndex
ALTER TABLE `Submission` RENAME INDEX `Submission_user_id_fkey` TO `Submission_user_id_idx`;
