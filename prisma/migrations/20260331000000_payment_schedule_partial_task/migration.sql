-- AlterTable: add receivedAmount, linkedTaskId, widen status to 25 chars
ALTER TABLE `ProjectPaymentSchedule`
    MODIFY COLUMN `status` VARCHAR(25) NOT NULL DEFAULT 'pending',
    ADD COLUMN `receivedAmount` DECIMAL(15,2) NULL,
    ADD COLUMN `linkedTaskId` CHAR(36) NULL;

-- AddIndex
ALTER TABLE `ProjectPaymentSchedule`
    ADD INDEX `ProjectPaymentSchedule_linkedTaskId_idx` (`linkedTaskId`);

-- AddForeignKey for linkedTaskId
ALTER TABLE `ProjectPaymentSchedule`
    ADD CONSTRAINT `ProjectPaymentSchedule_linkedTaskId_fkey`
    FOREIGN KEY (`linkedTaskId`) REFERENCES `Task` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: ProjectPaymentReceipt
CREATE TABLE `ProjectPaymentReceipt` (
    `id`           INT NOT NULL AUTO_INCREMENT,
    `scheduleId`   INT NOT NULL,
    `amount`       DECIMAL(15,2) NOT NULL,
    `receivedDate` DATETIME(3) NOT NULL,
    `invoiceRef`   VARCHAR(100) NULL,
    `notes`        TEXT NULL,
    `createdById`  CHAR(36) NULL,
    `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectPaymentReceipt_scheduleId_idx` (`scheduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey for ProjectPaymentReceipt
ALTER TABLE `ProjectPaymentReceipt`
    ADD CONSTRAINT `ProjectPaymentReceipt_scheduleId_fkey`
    FOREIGN KEY (`scheduleId`) REFERENCES `ProjectPaymentSchedule` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProjectPaymentReceipt`
    ADD CONSTRAINT `ProjectPaymentReceipt_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
