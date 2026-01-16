-- CreateTable
CREATE TABLE `ai_interactions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `conversationId` CHAR(36) NULL,
    `role` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NOT NULL,
    `response` LONGTEXT NULL,
    `contextType` VARCHAR(191) NULL,
    `contextMeta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_interactions_userId_idx`(`userId`),
    INDEX `ai_interactions_conversationId_idx`(`conversationId`),
    INDEX `ai_interactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_interactions` ADD CONSTRAINT `ai_interactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
