-- CreateTable
CREATE TABLE `ProjectPaymentSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` CHAR(36) NOT NULL,
    `paymentSlot` VARCHAR(30) NOT NULL,
    `invoiceDolibarrId` INTEGER NULL,
    `invoiceRef` VARCHAR(100) NULL,
    `dueDate` DATETIME(3) NULL,
    `triggerType` VARCHAR(30) NULL,
    `triggerDescription` VARCHAR(500) NULL,
    `actionRequired` VARCHAR(30) NULL,
    `actionNotes` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` CHAR(36) NULL,
    `updatedById` CHAR(36) NULL,

    INDEX `ProjectPaymentSchedule_projectId_idx`(`projectId`),
    INDEX `ProjectPaymentSchedule_status_idx`(`status`),
    INDEX `ProjectPaymentSchedule_dueDate_idx`(`dueDate`),
    UNIQUE INDEX `ProjectPaymentSchedule_projectId_paymentSlot_key`(`projectId`, `paymentSlot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProjectPaymentSchedule` ADD CONSTRAINT `ProjectPaymentSchedule_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPaymentSchedule` ADD CONSTRAINT `ProjectPaymentSchedule_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPaymentSchedule` ADD CONSTRAINT `ProjectPaymentSchedule_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
