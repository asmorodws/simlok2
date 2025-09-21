-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('VENDOR', 'VERIFIER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'VENDOR';

-- RenameIndex
ALTER TABLE `WorkerList` RENAME INDEX `DaftarPekerja_submission_id_idx` TO `WorkerList_submission_id_idx`;
