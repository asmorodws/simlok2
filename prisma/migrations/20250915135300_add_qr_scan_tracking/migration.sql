-- CreateTable
CREATE TABLE `QrScan` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `scanned_by` VARCHAR(191) NOT NULL,
    `scanned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `scanner_name` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,

    INDEX `QrScan_submission_id_idx`(`submission_id`),
    INDEX `QrScan_scanned_by_idx`(`scanned_by`),
    INDEX `QrScan_scanned_at_idx`(`scanned_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QrScan` ADD CONSTRAINT `QrScan_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `Submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QrScan` ADD CONSTRAINT `QrScan_scanned_by_fkey` FOREIGN KEY (`scanned_by`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
