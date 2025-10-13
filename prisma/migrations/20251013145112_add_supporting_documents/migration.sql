-- AlterTable
ALTER TABLE `Submission` ADD COLUMN `supporting_doc1_date` DATETIME(3) NULL,
    ADD COLUMN `supporting_doc1_number` VARCHAR(191) NULL,
    ADD COLUMN `supporting_doc1_type` VARCHAR(191) NULL,
    ADD COLUMN `supporting_doc1_upload` VARCHAR(191) NULL,
    ADD COLUMN `supporting_doc2_date` DATETIME(3) NULL,
    ADD COLUMN `supporting_doc2_number` VARCHAR(191) NULL,
    ADD COLUMN `supporting_doc2_type` VARCHAR(191) NULL,
    ADD COLUMN `supporting_doc2_upload` VARCHAR(191) NULL;
