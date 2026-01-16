-- Add QC fields to ProductionLog
ALTER TABLE `ProductionLog` ADD COLUMN `qcStatus` VARCHAR(191) NOT NULL DEFAULT 'Not Required';
ALTER TABLE `ProductionLog` ADD COLUMN `qcRequired` BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX `ProductionLog_qcStatus_idx` ON `ProductionLog`(`qcStatus`);

-- Create RFIRequest table
CREATE TABLE `RFIRequest` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NULL,
    `productionLogId` CHAR(36) NOT NULL,
    `inspectionType` VARCHAR(191) NOT NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `inspectionDate` DATETIME(3) NULL,
    `requestedById` CHAR(36) NOT NULL,
    `assignedToId` CHAR(36) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Waiting for Inspection',
    `qcComments` TEXT NULL,
    `attachments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RFIRequest_projectId_idx`(`projectId`),
    INDEX `RFIRequest_buildingId_idx`(`buildingId`),
    INDEX `RFIRequest_productionLogId_idx`(`productionLogId`),
    INDEX `RFIRequest_status_idx`(`status`),
    INDEX `RFIRequest_requestDate_idx`(`requestDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create NCRReport table
CREATE TABLE `NCRReport` (
    `id` CHAR(36) NOT NULL,
    `ncrNumber` VARCHAR(191) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NULL,
    `productionLogId` CHAR(36) NOT NULL,
    `rfiRequestId` CHAR(36) NULL,
    `description` TEXT NOT NULL,
    `correctiveAction` TEXT NULL,
    `rootCause` TEXT NULL,
    `preventiveAction` TEXT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `closedDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Open',
    `severity` VARCHAR(191) NOT NULL DEFAULT 'Medium',
    `raisedById` CHAR(36) NOT NULL,
    `assignedToId` CHAR(36) NULL,
    `closedById` CHAR(36) NULL,
    `attachments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NCRReport_ncrNumber_key`(`ncrNumber`),
    INDEX `NCRReport_projectId_idx`(`projectId`),
    INDEX `NCRReport_buildingId_idx`(`buildingId`),
    INDEX `NCRReport_productionLogId_idx`(`productionLogId`),
    INDEX `NCRReport_rfiRequestId_idx`(`rfiRequestId`),
    INDEX `NCRReport_status_idx`(`status`),
    INDEX `NCRReport_deadline_idx`(`deadline`),
    INDEX `NCRReport_ncrNumber_idx`(`ncrNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add Foreign Keys
ALTER TABLE `RFIRequest` ADD CONSTRAINT `RFIRequest_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RFIRequest` ADD CONSTRAINT `RFIRequest_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RFIRequest` ADD CONSTRAINT `RFIRequest_productionLogId_fkey` FOREIGN KEY (`productionLogId`) REFERENCES `ProductionLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RFIRequest` ADD CONSTRAINT `RFIRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `RFIRequest` ADD CONSTRAINT `RFIRequest_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_productionLogId_fkey` FOREIGN KEY (`productionLogId`) REFERENCES `ProductionLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_rfiRequestId_fkey` FOREIGN KEY (`rfiRequestId`) REFERENCES `RFIRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_raisedById_fkey` FOREIGN KEY (`raisedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_closedById_fkey` FOREIGN KEY (`closedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
