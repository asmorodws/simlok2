/*
  Migration to standardize column names to English while preserving data
*/

-- Drop foreign key constraints temporarily
ALTER TABLE `Submission` DROP FOREIGN KEY `Submission_userId_fkey`;
ALTER TABLE `Submission` DROP FOREIGN KEY `Submission_approved_by_admin_fkey`;
ALTER TABLE `DaftarPekerja` DROP FOREIGN KEY `DaftarPekerja_submission_id_fkey`;

-- Rename User table columns
ALTER TABLE `User` 
  CHANGE COLUMN `nama_petugas` `officer_name` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `foto_profil` `profile_photo` VARCHAR(191) NULL,
  CHANGE COLUMN `alamat` `address` VARCHAR(191) NULL,
  CHANGE COLUMN `no_telp` `phone_number` VARCHAR(191) NULL,
  CHANGE COLUMN `nama_vendor` `vendor_name` VARCHAR(191) NULL,
  CHANGE COLUMN `date_created_at` `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Rename Submission table columns
ALTER TABLE `Submission`
  CHANGE COLUMN `status_approval_admin` `approval_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  CHANGE COLUMN `approved_by_admin` `approved_by` VARCHAR(191) NULL,
  CHANGE COLUMN `nama_vendor` `vendor_name` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `berdasarkan` `based_on` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `nama_petugas` `officer_name` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `pekerjaan` `job_description` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `lokasi_kerja` `work_location` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `pelaksanaan` `implementation` TEXT NULL,
  CHANGE COLUMN `jam_kerja` `working_hours` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `lain_lain` `other_notes` TEXT NULL,
  CHANGE COLUMN `sarana_kerja` `work_facilities` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `nomor_simja` `simja_number` VARCHAR(191) NULL,
  CHANGE COLUMN `tanggal_simja` `simja_date` DATETIME(3) NULL,
  CHANGE COLUMN `nomor_sika` `sika_number` VARCHAR(191) NULL,
  CHANGE COLUMN `tanggal_sika` `sika_date` DATETIME(3) NULL,
  CHANGE COLUMN `nomor_simlok` `simlok_number` VARCHAR(191) NULL,
  CHANGE COLUMN `tanggal_simlok` `simlok_date` DATETIME(3) NULL,
  CHANGE COLUMN `nama_pekerja` `worker_names` TEXT NOT NULL,
  CHANGE COLUMN `keterangan` `notes` TEXT NULL,
  CHANGE COLUMN `jabatan_signer` `signer_position` VARCHAR(191) NULL,
  CHANGE COLUMN `nama_signer` `signer_name` VARCHAR(191) NULL,
  CHANGE COLUMN `upload_doc_sika` `sika_document_upload` VARCHAR(191) NULL,
  CHANGE COLUMN `upload_doc_simja` `simja_document_upload` VARCHAR(191) NULL,
  CHANGE COLUMN `userId` `user_id` VARCHAR(191) NOT NULL;

-- Rename DaftarPekerja table to WorkerList and its columns
RENAME TABLE `DaftarPekerja` TO `WorkerList`;
ALTER TABLE `WorkerList`
  CHANGE COLUMN `nama_pekerja` `worker_name` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `foto_pekerja` `worker_photo` VARCHAR(191) NULL;

-- Recreate foreign key constraints with new column names
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WorkerList` ADD CONSTRAINT `WorkerList_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `Submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
