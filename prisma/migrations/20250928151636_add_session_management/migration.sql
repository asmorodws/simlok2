-- AlterTable
ALTER TABLE `User` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lastActiveAt` DATETIME(3) NULL,
    ADD COLUMN `sessionExpiry` DATETIME(3) NULL;
