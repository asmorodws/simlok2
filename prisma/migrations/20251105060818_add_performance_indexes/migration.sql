-- CreateIndex
CREATE INDEX `Submission_vendor_name_idx` ON `Submission`(`vendor_name`);

-- CreateIndex
CREATE INDEX `Submission_simlok_number_idx` ON `Submission`(`simlok_number`);

-- CreateIndex
CREATE INDEX `Submission_user_id_idx` ON `Submission`(`user_id`);

-- CreateIndex
CREATE INDEX `Submission_user_id_approval_status_idx` ON `Submission`(`user_id`, `approval_status`);

-- CreateIndex
CREATE INDEX `Submission_created_at_approval_status_idx` ON `Submission`(`created_at`, `approval_status`);

-- CreateIndex
CREATE INDEX `User_verification_status_idx` ON `User`(`verification_status`);

-- CreateIndex
CREATE INDEX `User_isActive_role_idx` ON `User`(`isActive`, `role`);

-- CreateIndex
CREATE INDEX `User_role_verification_status_idx` ON `User`(`role`, `verification_status`);

