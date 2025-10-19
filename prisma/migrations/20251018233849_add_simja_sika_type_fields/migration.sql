/*
  Warnings:

  - You are about to drop the column `supporting_doc1_date` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `supporting_doc1_number` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `supporting_doc1_type` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `supporting_doc1_upload` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `supporting_doc2_date` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `supporting_doc2_number` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `supporting_doc2_type` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `supporting_doc2_upload` on the `Submission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Submission` DROP COLUMN `supporting_doc1_date`,
    DROP COLUMN `supporting_doc1_number`,
    DROP COLUMN `supporting_doc1_type`,
    DROP COLUMN `supporting_doc1_upload`,
    DROP COLUMN `supporting_doc2_date`,
    DROP COLUMN `supporting_doc2_number`,
    DROP COLUMN `supporting_doc2_type`,
    DROP COLUMN `supporting_doc2_upload`,
    ADD COLUMN `hsse_pass_document_upload` VARCHAR(191) NULL,
    ADD COLUMN `hsse_pass_number` VARCHAR(191) NULL,
    ADD COLUMN `hsse_pass_valid_thru` DATETIME(3) NULL,
    ADD COLUMN `sika_type` VARCHAR(191) NULL,
    ADD COLUMN `simja_type` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `WorkerList` ADD COLUMN `hsse_pass_document_upload` VARCHAR(191) NULL,
    ADD COLUMN `hsse_pass_number` VARCHAR(191) NULL,
    ADD COLUMN `hsse_pass_valid_thru` DATETIME(3) NULL;
