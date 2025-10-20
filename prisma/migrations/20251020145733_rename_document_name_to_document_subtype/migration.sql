/*
  Warnings:

  - You are about to drop the column `document_name` on the `SupportDocument` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `SupportDocument` DROP COLUMN `document_name`,
    ADD COLUMN `document_subtype` VARCHAR(191) NULL;
