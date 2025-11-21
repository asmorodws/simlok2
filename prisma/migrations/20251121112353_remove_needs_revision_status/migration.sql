/*
  Warnings:

  - The values [NEEDS_REVISION] on the enum `Submission_approval_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Submission` MODIFY `approval_status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL';
