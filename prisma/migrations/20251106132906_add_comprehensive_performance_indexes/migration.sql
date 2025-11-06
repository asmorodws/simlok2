-- CreateIndex
CREATE INDEX `Notification_type_idx` ON `Notification`(`type`);

-- CreateIndex
CREATE INDEX `Notification_created_at_idx` ON `Notification`(`created_at`);

-- CreateIndex
CREATE INDEX `Notification_vendor_created_idx` ON `Notification`(`vendor_id`, `created_at`);

-- CreateIndex
CREATE INDEX `NotificationRead_user_read_idx` ON `NotificationRead`(`user_id`, `read_at`);

-- CreateIndex
CREATE INDEX `NotificationRead_notif_user_idx` ON `NotificationRead`(`notification_id`, `user_id`);

-- CreateIndex
CREATE INDEX `QrScan_submission_scanned_idx` ON `QrScan`(`submission_id`, `scanned_at`);

-- CreateIndex
CREATE INDEX `QrScan_user_scanned_idx` ON `QrScan`(`scanned_by`, `scanned_at`);

-- CreateIndex
CREATE INDEX `QrScan_location_idx` ON `QrScan`(`scan_location`);

-- CreateIndex
CREATE INDEX `Submission_user_created_idx` ON `Submission`(`user_id`, `created_at`);

-- CreateIndex
CREATE INDEX `Submission_user_status_idx` ON `Submission`(`user_id`, `approval_status`);

-- CreateIndex
CREATE INDEX `Submission_status_created_idx` ON `Submission`(`approval_status`, `created_at`);

-- CreateIndex
CREATE INDEX `Submission_review_created_idx` ON `Submission`(`review_status`, `created_at`);

-- CreateIndex
CREATE INDEX `Submission_simlok_number_idx` ON `Submission`(`simlok_number`);

-- CreateIndex
CREATE INDEX `Submission_approved_at_idx` ON `Submission`(`approved_at`);

-- CreateIndex
CREATE INDEX `Submission_reviewed_at_idx` ON `Submission`(`reviewed_at`);

-- CreateIndex
CREATE INDEX `Submission_impl_start_idx` ON `Submission`(`implementation_start_date`);

-- CreateIndex
CREATE INDEX `Submission_impl_end_idx` ON `Submission`(`implementation_end_date`);

-- CreateIndex
CREATE INDEX `Submission_vendor_created_idx` ON `Submission`(`vendor_name`, `created_at`);

-- CreateIndex
CREATE INDEX `Submission_officer_name_idx` ON `Submission`(`officer_name`);

-- CreateIndex
CREATE INDEX `Submission_job_desc_idx` ON `Submission`(`job_description`);

-- CreateIndex
CREATE INDEX `SupportDocument_type_idx` ON `SupportDocument`(`document_type`);

-- CreateIndex
CREATE INDEX `SupportDocument_subtype_idx` ON `SupportDocument`(`document_subtype`);

-- CreateIndex
CREATE INDEX `SupportDocument_submission_uploaded_idx` ON `SupportDocument`(`submission_id`, `uploaded_at`);

-- CreateIndex
CREATE INDEX `SupportDocument_number_idx` ON `SupportDocument`(`document_number`);

-- CreateIndex
CREATE INDEX `WorkerList_worker_name_idx` ON `WorkerList`(`worker_name`);

-- CreateIndex
CREATE INDEX `WorkerList_hsse_number_idx` ON `WorkerList`(`hsse_pass_number`);

-- CreateIndex
CREATE INDEX `WorkerList_submission_created_idx` ON `WorkerList`(`submission_id`, `created_at`);
