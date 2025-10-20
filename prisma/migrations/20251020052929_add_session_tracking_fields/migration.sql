-- AlterTable
ALTER TABLE `Session` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `userAgent` TEXT NULL;

-- CreateIndex
CREATE INDEX `Session_expires_idx` ON `Session`(`expires`);

-- CreateIndex
CREATE INDEX `Session_lastActivityAt_idx` ON `Session`(`lastActivityAt`);
