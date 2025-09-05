-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `scope` ENUM('admin', 'vendor') NOT NULL,
    `vendor_id` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `data` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_scope_vendor_id_created_at_idx`(`scope`, `vendor_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationRead` (
    `id` VARCHAR(191) NOT NULL,
    `notification_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `vendor_id` VARCHAR(191) NULL,
    `read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NotificationRead_user_id_idx`(`user_id`),
    INDEX `NotificationRead_vendor_id_idx`(`vendor_id`),
    UNIQUE INDEX `NotificationRead_notification_id_user_id_key`(`notification_id`, `user_id`),
    UNIQUE INDEX `NotificationRead_notification_id_vendor_id_key`(`notification_id`, `vendor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotificationRead` ADD CONSTRAINT `NotificationRead_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `Notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
