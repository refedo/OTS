-- CreateTable
CREATE TABLE `SystemEvent` (
    `id` CHAR(36) NOT NULL,
    `eventType` VARCHAR(50) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `entityType` VARCHAR(50) NULL,
    `entityId` CHAR(36) NULL,
    `projectId` CHAR(36) NULL,
    `userId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SystemEvent_eventType_idx`(`eventType`),
    INDEX `SystemEvent_category_idx`(`category`),
    INDEX `SystemEvent_entityType_idx`(`entityType`),
    INDEX `SystemEvent_projectId_idx`(`projectId`),
    INDEX `SystemEvent_userId_idx`(`userId`),
    INDEX `SystemEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SystemEvent` ADD CONSTRAINT `SystemEvent_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SystemEvent` ADD CONSTRAINT `SystemEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
