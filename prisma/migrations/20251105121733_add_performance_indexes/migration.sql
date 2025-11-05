-- CreateIndex
CREATE INDEX `Submission_vendor_name_search_idx` ON `Submission`(`vendor_name`);

-- CreateIndex
CREATE INDEX `Submission_review_approval_compound_idx` ON `Submission`(`review_status`, `approval_status`);

-- RenameIndex
ALTER TABLE `Submission` RENAME INDEX `Submission_user_id_fkey` TO `Submission_user_id_perf_idx`;
