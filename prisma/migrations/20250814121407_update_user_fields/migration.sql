/*
  Warnings:

  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - Added the required column `nama_petugas` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `createdAt`,
    DROP COLUMN `emailVerified`,
    DROP COLUMN `name`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `alamat` VARCHAR(191) NULL,
    ADD COLUMN `date_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `foto_profil` VARCHAR(191) NULL,
    ADD COLUMN `nama_petugas` VARCHAR(191) NOT NULL,
    ADD COLUMN `nama_vendor` VARCHAR(191) NULL,
    ADD COLUMN `no_telp` VARCHAR(191) NULL,
    ADD COLUMN `verified_at` DATETIME(3) NULL,
    ADD COLUMN `verified_by` VARCHAR(191) NULL,
    MODIFY `password` VARCHAR(191) NOT NULL;
