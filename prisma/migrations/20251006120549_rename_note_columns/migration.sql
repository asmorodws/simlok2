/*
  Warnings:

  - You are about to drop the column `final_note` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `review_note` on the `Submission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Submission` DROP COLUMN `final_note`,
    DROP COLUMN `review_note`,
    ADD COLUMN `note_for_approver` TEXT NULL,
    ADD COLUMN `note_for_vendor` TEXT NULL;
