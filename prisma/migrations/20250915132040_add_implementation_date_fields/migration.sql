-- Add implementation date fields to Submission table
ALTER TABLE `Submission` ADD COLUMN `implementation_end_date` DATETIME(3) NULL,
    ADD COLUMN `implementation_start_date` DATETIME(3) NULL;
