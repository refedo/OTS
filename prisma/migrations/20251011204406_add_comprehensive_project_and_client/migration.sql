-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS `Client` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS `Building` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `designation` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Building_projectId_designation_key`(`projectId`, `designation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Delete existing data to allow schema changes (in correct order due to foreign keys)
DELETE FROM `TaskAssignment`;
DELETE FROM `Task`;
DELETE FROM `ProjectAssignment`;
DELETE FROM `Project`;

-- Drop foreign key constraint first
ALTER TABLE `Project` DROP FOREIGN KEY `Project_departmentId_fkey`;

-- AlterTable Project - Drop old columns and add new ones
ALTER TABLE `Project` 
    DROP COLUMN `description`,
    DROP COLUMN `departmentId`,
    ADD COLUMN `projectNumber` VARCHAR(191) NOT NULL,
    ADD COLUMN `estimationNumber` VARCHAR(191) NULL,
    ADD COLUMN `clientId` CHAR(36) NOT NULL,
    ADD COLUMN `projectManagerId` CHAR(36) NOT NULL,
    ADD COLUMN `salesEngineerId` CHAR(36) NULL,
    ADD COLUMN `contractDate` DATETIME(3) NULL,
    ADD COLUMN `downPaymentDate` DATETIME(3) NULL,
    ADD COLUMN `plannedStartDate` DATETIME(3) NULL,
    ADD COLUMN `plannedEndDate` DATETIME(3) NULL,
    ADD COLUMN `actualStartDate` DATETIME(3) NULL,
    ADD COLUMN `actualEndDate` DATETIME(3) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    ADD COLUMN `contractValue` DECIMAL(15, 2) NULL,
    ADD COLUMN `downPayment` DECIMAL(15, 2) NULL,
    ADD COLUMN `downPaymentAck` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `payment2` DECIMAL(15, 2) NULL,
    ADD COLUMN `payment2Ack` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `payment3` DECIMAL(15, 2) NULL,
    ADD COLUMN `payment3Ack` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `payment4` DECIMAL(15, 2) NULL,
    ADD COLUMN `payment4Ack` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `payment5` DECIMAL(15, 2) NULL,
    ADD COLUMN `payment5Ack` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `payment6` DECIMAL(15, 2) NULL,
    ADD COLUMN `payment6Ack` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `preliminaryRetention` DECIMAL(15, 2) NULL,
    ADD COLUMN `hoRetention` DECIMAL(15, 2) NULL,
    ADD COLUMN `structureType` VARCHAR(191) NULL,
    ADD COLUMN `numberOfStructures` INTEGER NULL,
    ADD COLUMN `erectionSubcontractor` VARCHAR(191) NULL,
    ADD COLUMN `incoterm` VARCHAR(191) NULL,
    ADD COLUMN `scopeOfWork` TEXT NULL,
    ADD COLUMN `projectNature` VARCHAR(191) NULL,
    ADD COLUMN `projectLocation` VARCHAR(191) NULL,
    ADD COLUMN `engineeringDuration` INTEGER NULL,
    ADD COLUMN `fabricationDeliveryDuration` INTEGER NULL,
    ADD COLUMN `erectionDuration` INTEGER NULL,
    ADD COLUMN `cranesIncluded` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `surveyorOurScope` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `contractualTonnage` DECIMAL(10, 2) NULL,
    ADD COLUMN `engineeringTonnage` DECIMAL(10, 2) NULL,
    ADD COLUMN `galvanized` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `galvanizationMicrons` INTEGER NULL,
    ADD COLUMN `area` DECIMAL(10, 2) NULL,
    ADD COLUMN `m2PerTon` DECIMAL(10, 2) NULL,
    ADD COLUMN `paintCoat1` VARCHAR(191) NULL,
    ADD COLUMN `paintCoat1Microns` INTEGER NULL,
    ADD COLUMN `paintCoat1Liters` DECIMAL(10, 2) NULL,
    ADD COLUMN `paintCoat2` VARCHAR(191) NULL,
    ADD COLUMN `paintCoat2Microns` INTEGER NULL,
    ADD COLUMN `paintCoat2Liters` DECIMAL(10, 2) NULL,
    ADD COLUMN `paintCoat3` VARCHAR(191) NULL,
    ADD COLUMN `paintCoat3Microns` INTEGER NULL,
    ADD COLUMN `paintCoat3Liters` DECIMAL(10, 2) NULL,
    ADD COLUMN `paintCoat4` VARCHAR(191) NULL,
    ADD COLUMN `paintCoat4Microns` INTEGER NULL,
    ADD COLUMN `paintCoat4Liters` DECIMAL(10, 2) NULL,
    ADD COLUMN `topCoatRalNumber` VARCHAR(191) NULL,
    ADD COLUMN `weldingProcess` VARCHAR(191) NULL,
    ADD COLUMN `weldingWireAwsClass` VARCHAR(191) NULL,
    ADD COLUMN `pqrNumber` VARCHAR(191) NULL,
    ADD COLUMN `wpsNumber` VARCHAR(191) NULL,
    ADD COLUMN `standardCode` VARCHAR(191) NULL,
    ADD COLUMN `thirdPartyRequired` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `ndtTest` VARCHAR(191) NULL,
    ADD COLUMN `applicableCodes` VARCHAR(191) NULL,
    ADD COLUMN `remarks` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Project_projectNumber_key` ON `Project`(`projectNumber`);

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_projectManagerId_fkey` FOREIGN KEY (`projectManagerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_salesEngineerId_fkey` FOREIGN KEY (`salesEngineerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Building` ADD CONSTRAINT `Building_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
