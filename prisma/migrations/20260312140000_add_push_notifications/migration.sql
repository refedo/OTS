-- CreateTable
CREATE TABLE `push_subscriptions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `p256dh` TEXT NOT NULL,
    `auth` VARCHAR(255) NOT NULL,
    `userAgent` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `push_subscriptions_userId_idx`(`userId`),
    UNIQUE INDEX `push_subscriptions_userId_endpoint_key`(`userId`, `endpoint`(500)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_notification_preferences` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `notificationType` ENUM('TASK_ASSIGNED', 'TASK_COMPLETED', 'APPROVAL_REQUIRED', 'DEADLINE_WARNING', 'APPROVED', 'REJECTED', 'SYSTEM') NOT NULL,
    `pushEnabled` BOOLEAN NOT NULL DEFAULT true,
    `inAppEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_notification_preferences_userId_idx`(`userId`),
    UNIQUE INDEX `user_notification_preferences_userId_notificationType_key`(`userId`, `notificationType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notification_preferences` ADD CONSTRAINT `user_notification_preferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
