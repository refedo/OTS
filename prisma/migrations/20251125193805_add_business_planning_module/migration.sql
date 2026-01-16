-- AlterTable
ALTER TABLE `project` ADD COLUMN `coatingSystem` VARCHAR(191) NULL,
    ADD COLUMN `isGalvanized` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `scopeOfWorkJson` JSON NULL;

-- AlterTable
ALTER TABLE `task` ADD COLUMN `buildingId` CHAR(36) NULL,
    ADD COLUMN `departmentId` CHAR(36) NULL,
    ADD COLUMN `taskInputDate` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ScopeSchedule` (
    `id` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `scopeType` VARCHAR(191) NOT NULL,
    `scopeLabel` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ScopeSchedule_buildingId_idx`(`buildingId`),
    INDEX `ScopeSchedule_projectId_idx`(`projectId`),
    UNIQUE INDEX `ScopeSchedule_buildingId_scopeType_key`(`buildingId`, `scopeType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ITP` (
    `id` CHAR(36) NOT NULL,
    `itpNumber` VARCHAR(191) NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `projectId` CHAR(36) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'CUSTOM',
    `jobNo` VARCHAR(191) NULL,
    `client` VARCHAR(191) NULL,
    `applicableCodes` TEXT NULL,
    `createdById` CHAR(36) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `clientApprovedBy` VARCHAR(191) NULL,
    `dateCreated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateApproved` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `rejectionReason` TEXT NULL,
    `pdfAttachment` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ITP_itpNumber_key`(`itpNumber`),
    INDEX `ITP_projectId_idx`(`projectId`),
    INDEX `ITP_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WPS` (
    `id` CHAR(36) NOT NULL,
    `wpsNumber` VARCHAR(191) NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `projectId` CHAR(36) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'CUSTOM',
    `weldingProcess` VARCHAR(191) NOT NULL,
    `supportingPQR` VARCHAR(191) NULL,
    `dateIssued` DATETIME(3) NULL,
    `preparedById` CHAR(36) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `clientApprovedBy` VARCHAR(191) NULL,
    `baseMaterial` VARCHAR(191) NULL,
    `thicknessGroove` DECIMAL(10, 2) NULL,
    `thicknessFillet` DECIMAL(10, 2) NULL,
    `diameter` DECIMAL(10, 2) NULL,
    `fillerMetalSpec` VARCHAR(191) NULL,
    `fillerClass` VARCHAR(191) NULL,
    `shieldingGas` VARCHAR(191) NULL,
    `flowRate` DECIMAL(10, 2) NULL,
    `currentType` VARCHAR(191) NULL,
    `preheatTempMin` INTEGER NULL,
    `interpassTempMin` INTEGER NULL,
    `interpassTempMax` INTEGER NULL,
    `postWeldTemp` INTEGER NULL,
    `position` VARCHAR(191) NULL,
    `jointType` VARCHAR(191) NULL,
    `grooveAngle` INTEGER NULL,
    `rootOpening` DECIMAL(10, 2) NULL,
    `backingType` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `pdfAttachment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WPS_wpsNumber_key`(`wpsNumber`),
    INDEX `WPS_projectId_idx`(`projectId`),
    INDEX `WPS_status_idx`(`status`),
    INDEX `WPS_wpsNumber_idx`(`wpsNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WPSPass` (
    `id` CHAR(36) NOT NULL,
    `wpsId` CHAR(36) NOT NULL,
    `layerNo` INTEGER NOT NULL,
    `process` VARCHAR(191) NOT NULL,
    `electrodeClass` VARCHAR(191) NULL,
    `diameter` DECIMAL(10, 3) NULL,
    `polarity` VARCHAR(191) NULL,
    `amperage` INTEGER NULL,
    `voltage` INTEGER NULL,
    `travelSpeed` DECIMAL(10, 2) NULL,
    `heatInput` DECIMAL(10, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WPSPass_wpsId_idx`(`wpsId`),
    INDEX `WPSPass_layerNo_idx`(`layerNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentCategory` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `parentId` CHAR(36) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DocumentCategory_name_key`(`name`),
    INDEX `DocumentCategory_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` CHAR(36) NOT NULL,
    `documentNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `categoryId` CHAR(36) NOT NULL,
    `description` TEXT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'Procedure',
    `standard` VARCHAR(191) NULL,
    `filePath` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `fileType` VARCHAR(191) NULL,
    `content` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `effectiveDate` DATETIME(3) NULL,
    `reviewDate` DATETIME(3) NULL,
    `uploadedById` CHAR(36) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `tags` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Document_documentNumber_key`(`documentNumber`),
    INDEX `Document_categoryId_idx`(`categoryId`),
    INDEX `Document_status_idx`(`status`),
    INDEX `Document_documentNumber_idx`(`documentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentReference` (
    `id` CHAR(36) NOT NULL,
    `documentId` CHAR(36) NOT NULL,
    `referencedDocumentId` CHAR(36) NOT NULL,
    `referenceType` VARCHAR(191) NOT NULL DEFAULT 'Related Form',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentReference_documentId_idx`(`documentId`),
    INDEX `DocumentReference_referencedDocumentId_idx`(`referencedDocumentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssemblyPart` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NULL,
    `partDesignation` VARCHAR(191) NOT NULL,
    `assemblyMark` VARCHAR(191) NOT NULL,
    `subAssemblyMark` VARCHAR(191) NULL,
    `partMark` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `profile` VARCHAR(191) NULL,
    `grade` VARCHAR(191) NULL,
    `lengthMm` DECIMAL(10, 2) NULL,
    `netAreaPerUnit` DECIMAL(10, 4) NULL,
    `netAreaTotal` DECIMAL(10, 4) NULL,
    `singlePartWeight` DECIMAL(10, 2) NULL,
    `netWeightTotal` DECIMAL(10, 2) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `currentProcess` VARCHAR(191) NULL,
    `createdById` CHAR(36) NOT NULL,
    `updatedById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AssemblyPart_partDesignation_key`(`partDesignation`),
    INDEX `AssemblyPart_projectId_idx`(`projectId`),
    INDEX `AssemblyPart_buildingId_idx`(`buildingId`),
    INDEX `AssemblyPart_partDesignation_idx`(`partDesignation`),
    INDEX `AssemblyPart_assemblyMark_idx`(`assemblyMark`),
    INDEX `AssemblyPart_partMark_idx`(`partMark`),
    INDEX `AssemblyPart_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionLog` (
    `id` CHAR(36) NOT NULL,
    `assemblyPartId` CHAR(36) NOT NULL,
    `processType` VARCHAR(191) NOT NULL,
    `dateProcessed` DATETIME(3) NOT NULL,
    `processedQty` INTEGER NOT NULL,
    `remainingQty` INTEGER NOT NULL,
    `processingTeam` VARCHAR(191) NULL,
    `processingLocation` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `reportNumber` VARCHAR(191) NULL,
    `qcStatus` VARCHAR(191) NOT NULL DEFAULT 'Not Required',
    `qcRequired` BOOLEAN NOT NULL DEFAULT false,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductionLog_assemblyPartId_idx`(`assemblyPartId`),
    INDEX `ProductionLog_processType_idx`(`processType`),
    INDEX `ProductionLog_dateProcessed_idx`(`dateProcessed`),
    INDEX `ProductionLog_qcStatus_idx`(`qcStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RFIRequest` (
    `id` CHAR(36) NOT NULL,
    `rfiNumber` VARCHAR(191) NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NULL,
    `inspectionType` VARCHAR(191) NOT NULL,
    `processType` VARCHAR(191) NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `inspectionDate` DATETIME(3) NULL,
    `requestedById` CHAR(36) NOT NULL,
    `assignedToId` CHAR(36) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Waiting for Inspection',
    `qcComments` TEXT NULL,
    `attachments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RFIRequest_rfiNumber_key`(`rfiNumber`),
    INDEX `RFIRequest_projectId_idx`(`projectId`),
    INDEX `RFIRequest_buildingId_idx`(`buildingId`),
    INDEX `RFIRequest_status_idx`(`status`),
    INDEX `RFIRequest_requestDate_idx`(`requestDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RFIProductionLog` (
    `id` CHAR(36) NOT NULL,
    `rfiRequestId` CHAR(36) NOT NULL,
    `productionLogId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RFIProductionLog_rfiRequestId_idx`(`rfiRequestId`),
    INDEX `RFIProductionLog_productionLogId_idx`(`productionLogId`),
    UNIQUE INDEX `RFIProductionLog_rfiRequestId_productionLogId_key`(`rfiRequestId`, `productionLogId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `MaterialInspection` (
    `id` CHAR(36) NOT NULL,
    `inspectionNumber` VARCHAR(191) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `materialType` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(191) NOT NULL,
    `specification` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NULL,
    `heatNumber` VARCHAR(191) NULL,
    `millCertNumber` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `inspectorId` CHAR(36) NOT NULL,
    `inspectionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `result` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `chemicalComposition` TEXT NULL,
    `mechanicalProperties` TEXT NULL,
    `visualInspection` TEXT NULL,
    `dimensionalCheck` TEXT NULL,
    `remarks` TEXT NULL,
    `attachments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MaterialInspection_inspectionNumber_key`(`inspectionNumber`),
    INDEX `MaterialInspection_projectId_idx`(`projectId`),
    INDEX `MaterialInspection_inspectorId_idx`(`inspectorId`),
    INDEX `MaterialInspection_result_idx`(`result`),
    INDEX `MaterialInspection_inspectionDate_idx`(`inspectionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeldingInspection` (
    `id` CHAR(36) NOT NULL,
    `inspectionNumber` VARCHAR(191) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NULL,
    `productionLogId` CHAR(36) NOT NULL,
    `wpsNumber` VARCHAR(191) NULL,
    `welderCode` VARCHAR(191) NULL,
    `jointType` VARCHAR(191) NOT NULL,
    `jointLocation` VARCHAR(191) NOT NULL,
    `weldingProcess` VARCHAR(191) NOT NULL,
    `inspectorId` CHAR(36) NOT NULL,
    `inspectionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `visualResult` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `defects` TEXT NULL,
    `defectDescription` TEXT NULL,
    `repairRequired` BOOLEAN NOT NULL DEFAULT false,
    `repairCompleted` BOOLEAN NOT NULL DEFAULT false,
    `result` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `remarks` TEXT NULL,
    `attachments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WeldingInspection_inspectionNumber_key`(`inspectionNumber`),
    INDEX `WeldingInspection_projectId_idx`(`projectId`),
    INDEX `WeldingInspection_buildingId_idx`(`buildingId`),
    INDEX `WeldingInspection_productionLogId_idx`(`productionLogId`),
    INDEX `WeldingInspection_inspectorId_idx`(`inspectorId`),
    INDEX `WeldingInspection_result_idx`(`result`),
    INDEX `WeldingInspection_inspectionDate_idx`(`inspectionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DimensionalInspection` (
    `id` CHAR(36) NOT NULL,
    `inspectionNumber` VARCHAR(191) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NULL,
    `productionLogId` CHAR(36) NOT NULL,
    `partDesignation` VARCHAR(191) NOT NULL,
    `drawingReference` VARCHAR(191) NULL,
    `measuredLength` DOUBLE NULL,
    `requiredLength` DOUBLE NULL,
    `lengthTolerance` DOUBLE NULL,
    `measuredWidth` DOUBLE NULL,
    `requiredWidth` DOUBLE NULL,
    `widthTolerance` DOUBLE NULL,
    `measuredHeight` DOUBLE NULL,
    `requiredHeight` DOUBLE NULL,
    `heightTolerance` DOUBLE NULL,
    `measuredThickness` DOUBLE NULL,
    `requiredThickness` DOUBLE NULL,
    `thicknessTolerance` DOUBLE NULL,
    `straightness` VARCHAR(191) NULL,
    `flatness` VARCHAR(191) NULL,
    `squareness` VARCHAR(191) NULL,
    `inspectorId` CHAR(36) NOT NULL,
    `inspectionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `toleranceCheck` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `result` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `remarks` TEXT NULL,
    `attachments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DimensionalInspection_inspectionNumber_key`(`inspectionNumber`),
    INDEX `DimensionalInspection_projectId_idx`(`projectId`),
    INDEX `DimensionalInspection_buildingId_idx`(`buildingId`),
    INDEX `DimensionalInspection_productionLogId_idx`(`productionLogId`),
    INDEX `DimensionalInspection_inspectorId_idx`(`inspectorId`),
    INDEX `DimensionalInspection_result_idx`(`result`),
    INDEX `DimensionalInspection_inspectionDate_idx`(`inspectionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NDTInspection` (
    `id` CHAR(36) NOT NULL,
    `inspectionNumber` VARCHAR(191) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NULL,
    `productionLogId` CHAR(36) NOT NULL,
    `ndtMethod` VARCHAR(191) NOT NULL,
    `testProcedure` VARCHAR(191) NULL,
    `acceptanceCriteria` VARCHAR(191) NULL,
    `equipmentId` VARCHAR(191) NULL,
    `equipmentCalibration` VARCHAR(191) NULL,
    `operatorName` VARCHAR(191) NULL,
    `operatorCertification` VARCHAR(191) NULL,
    `testResult` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `defectType` VARCHAR(191) NULL,
    `defectLocation` VARCHAR(191) NULL,
    `defectSize` VARCHAR(191) NULL,
    `defectDescription` TEXT NULL,
    `inspectorId` CHAR(36) NOT NULL,
    `inspectionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `result` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `remarks` TEXT NULL,
    `attachments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NDTInspection_inspectionNumber_key`(`inspectionNumber`),
    INDEX `NDTInspection_projectId_idx`(`projectId`),
    INDEX `NDTInspection_buildingId_idx`(`buildingId`),
    INDEX `NDTInspection_productionLogId_idx`(`productionLogId`),
    INDEX `NDTInspection_inspectorId_idx`(`inspectorId`),
    INDEX `NDTInspection_ndtMethod_idx`(`ndtMethod`),
    INDEX `NDTInspection_result_idx`(`result`),
    INDEX `NDTInspection_inspectionDate_idx`(`inspectionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ITPActivity` (
    `id` CHAR(36) NOT NULL,
    `itpId` CHAR(36) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `section` VARCHAR(191) NOT NULL DEFAULT 'Before Manufacturing',
    `activityDescription` TEXT NOT NULL,
    `referenceDocument` VARCHAR(191) NULL,
    `acceptanceCriteria` TEXT NULL,
    `verifyingDocument` VARCHAR(191) NULL,
    `activityByManuf` VARCHAR(191) NULL,
    `activityByTPI` VARCHAR(191) NULL,
    `activityByClient` VARCHAR(191) NULL,
    `inspectionType` VARCHAR(191) NULL,
    `remark` TEXT NULL,
    `reportsReference` VARCHAR(191) NULL,
    `signAId` CHAR(36) NULL,
    `signBId` CHAR(36) NULL,
    `signCId` CHAR(36) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `completedDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ITPActivity_itpId_idx`(`itpId`),
    INDEX `ITPActivity_sequence_idx`(`sequence`),
    INDEX `ITPActivity_section_idx`(`section`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectPlan` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `phase` VARCHAR(191) NOT NULL,
    `plannedStart` DATETIME(3) NULL,
    `plannedEnd` DATETIME(3) NULL,
    `plannedDuration` INTEGER NULL,
    `actualStart` DATETIME(3) NULL,
    `actualEnd` DATETIME(3) NULL,
    `actualDuration` INTEGER NULL,
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `responsibleDept` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Not Started',
    `remarks` TEXT NULL,
    `createdById` CHAR(36) NOT NULL,
    `updatedById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProjectPlan_projectId_idx`(`projectId`),
    INDEX `ProjectPlan_phase_idx`(`phase`),
    INDEX `ProjectPlan_status_idx`(`status`),
    UNIQUE INDEX `ProjectPlan_projectId_phase_key`(`projectId`, `phase`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KPIDefinition` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `formula` TEXT NOT NULL,
    `sourceModules` JSON NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL DEFAULT 1.0,
    `target` DOUBLE NULL,
    `calculationType` VARCHAR(191) NOT NULL DEFAULT 'auto',
    `unit` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` CHAR(36) NOT NULL,
    `updatedById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KPIDefinition_code_key`(`code`),
    INDEX `KPIDefinition_code_idx`(`code`),
    INDEX `KPIDefinition_frequency_idx`(`frequency`),
    INDEX `KPIDefinition_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KPIScore` (
    `id` CHAR(36) NOT NULL,
    `kpiId` CHAR(36) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` CHAR(36) NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `value` DOUBLE NOT NULL,
    `rawValue` JSON NULL,
    `status` VARCHAR(191) NOT NULL,
    `computedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KPIScore_kpiId_idx`(`kpiId`),
    INDEX `KPIScore_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `KPIScore_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    INDEX `KPIScore_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KPITarget` (
    `id` CHAR(36) NOT NULL,
    `kpiId` CHAR(36) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` CHAR(36) NULL,
    `period` VARCHAR(191) NOT NULL,
    `targetVal` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KPITarget_kpiId_idx`(`kpiId`),
    INDEX `KPITarget_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `KPITarget_period_idx`(`period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KPIManualEntry` (
    `id` CHAR(36) NOT NULL,
    `kpiId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `value` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `approvedBy` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KPIManualEntry_kpiId_idx`(`kpiId`),
    INDEX `KPIManualEntry_userId_idx`(`userId`),
    INDEX `KPIManualEntry_approved_idx`(`approved`),
    INDEX `KPIManualEntry_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KPIHistory` (
    `id` CHAR(36) NOT NULL,
    `kpiId` CHAR(36) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `performedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KPIHistory_kpiId_idx`(`kpiId`),
    INDEX `KPIHistory_action_idx`(`action`),
    INDEX `KPIHistory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KPIAlert` (
    `id` CHAR(36) NOT NULL,
    `kpiId` CHAR(36) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` CHAR(36) NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `acknowledgedBy` CHAR(36) NULL,
    `acknowledgedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KPIAlert_kpiId_idx`(`kpiId`),
    INDEX `KPIAlert_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `KPIAlert_level_idx`(`level`),
    INDEX `KPIAlert_acknowledgedBy_idx`(`acknowledgedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Initiative` (
    `id` CHAR(36) NOT NULL,
    `initiativeNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `objective` TEXT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `departmentId` CHAR(36) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Planned',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'Medium',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `actualStartDate` DATETIME(3) NULL,
    `actualEndDate` DATETIME(3) NULL,
    `progress` DOUBLE NULL DEFAULT 0,
    `budget` DOUBLE NULL DEFAULT 0,
    `kpiImpact` JSON NULL,
    `notes` TEXT NULL,
    `createdBy` CHAR(36) NOT NULL,
    `updatedBy` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Initiative_initiativeNumber_key`(`initiativeNumber`),
    INDEX `Initiative_ownerId_idx`(`ownerId`),
    INDEX `Initiative_departmentId_idx`(`departmentId`),
    INDEX `Initiative_status_idx`(`status`),
    INDEX `Initiative_category_idx`(`category`),
    INDEX `Initiative_priority_idx`(`priority`),
    INDEX `Initiative_initiativeNumber_idx`(`initiativeNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InitiativeMilestone` (
    `id` CHAR(36) NOT NULL,
    `initiativeId` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `plannedDate` DATETIME(3) NULL,
    `actualDate` DATETIME(3) NULL,
    `progress` DOUBLE NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `responsibleId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InitiativeMilestone_initiativeId_idx`(`initiativeId`),
    INDEX `InitiativeMilestone_responsibleId_idx`(`responsibleId`),
    INDEX `InitiativeMilestone_status_idx`(`status`),
    INDEX `InitiativeMilestone_plannedDate_idx`(`plannedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InitiativeTask` (
    `id` CHAR(36) NOT NULL,
    `initiativeId` CHAR(36) NOT NULL,
    `taskName` VARCHAR(191) NOT NULL,
    `assignedTo` CHAR(36) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `progress` DOUBLE NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InitiativeTask_initiativeId_idx`(`initiativeId`),
    INDEX `InitiativeTask_assignedTo_idx`(`assignedTo`),
    INDEX `InitiativeTask_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentSubmission` (
    `id` CHAR(36) NOT NULL,
    `submissionNumber` VARCHAR(191) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `revision` VARCHAR(191) NOT NULL DEFAULT 'R0',
    `handledBy` CHAR(36) NULL,
    `submittedBy` CHAR(36) NOT NULL,
    `submissionDate` DATETIME(3) NOT NULL,
    `reviewDueDate` DATETIME(3) NULL,
    `approvalDate` DATETIME(3) NULL,
    `clientResponseDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'In progress',
    `clientCode` VARCHAR(191) NULL,
    `clientResponse` VARCHAR(191) NULL,
    `clientResponseDate2` DATETIME(3) NULL,
    `internalComments` TEXT NULL,
    `clientComments` TEXT NULL,
    `rejectionReason` TEXT NULL,
    `daysCount` INTEGER NULL,
    `attachments` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DocumentSubmission_submissionNumber_key`(`submissionNumber`),
    INDEX `DocumentSubmission_projectId_idx`(`projectId`),
    INDEX `DocumentSubmission_buildingId_idx`(`buildingId`),
    INDEX `DocumentSubmission_documentType_idx`(`documentType`),
    INDEX `DocumentSubmission_status_idx`(`status`),
    INDEX `DocumentSubmission_submissionDate_idx`(`submissionDate`),
    INDEX `DocumentSubmission_handledBy_idx`(`handledBy`),
    INDEX `DocumentSubmission_submittedBy_idx`(`submittedBy`),
    INDEX `DocumentSubmission_submissionNumber_idx`(`submissionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentRevision` (
    `id` CHAR(36) NOT NULL,
    `submissionId` CHAR(36) NOT NULL,
    `revision` VARCHAR(191) NOT NULL,
    `submissionDate` DATETIME(3) NOT NULL,
    `submittedBy` CHAR(36) NOT NULL,
    `handledBy` CHAR(36) NULL,
    `documentType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `comments` TEXT NULL,
    `clientCode` VARCHAR(191) NULL,
    `clientResponse` VARCHAR(191) NULL,
    `clientComments` TEXT NULL,
    `approvalDate` DATETIME(3) NULL,
    `attachments` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentRevision_submissionId_idx`(`submissionId`),
    INDEX `DocumentRevision_revision_idx`(`revision`),
    INDEX `DocumentRevision_status_idx`(`status`),
    INDEX `DocumentRevision_handledBy_idx`(`handledBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OperationEvent` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NULL,
    `stage` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `eventSource` VARCHAR(191) NOT NULL,
    `eventDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Completed',
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OperationEvent_projectId_idx`(`projectId`),
    INDEX `OperationEvent_buildingId_idx`(`buildingId`),
    INDEX `OperationEvent_stage_idx`(`stage`),
    INDEX `OperationEvent_eventSource_idx`(`eventSource`),
    INDEX `OperationEvent_eventDate_idx`(`eventDate`),
    INDEX `OperationEvent_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OperationStageConfig` (
    `id` CHAR(36) NOT NULL,
    `stageCode` VARCHAR(191) NOT NULL,
    `stageName` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `autoSource` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `color` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `isMandatory` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OperationStageConfig_stageCode_key`(`stageCode`),
    INDEX `OperationStageConfig_stageCode_idx`(`stageCode`),
    INDEX `OperationStageConfig_orderIndex_idx`(`orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OperationEventAudit` (
    `id` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `oldStatus` VARCHAR(191) NULL,
    `newStatus` VARCHAR(191) NULL,
    `oldDate` DATETIME(3) NULL,
    `newDate` DATETIME(3) NULL,
    `changedBy` CHAR(36) NOT NULL,
    `changeReason` TEXT NULL,
    `changeDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OperationEventAudit_eventId_idx`(`eventId`),
    INDEX `OperationEventAudit_changedBy_idx`(`changedBy`),
    INDEX `OperationEventAudit_changeDate_idx`(`changeDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_versions` (
    `id` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `deployedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deployedBy` VARCHAR(191) NULL,
    `gitCommit` VARCHAR(191) NULL,
    `migrationName` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `environment` VARCHAR(191) NOT NULL DEFAULT 'production',
    `status` VARCHAR(191) NOT NULL DEFAULT 'success',

    INDEX `system_versions_deployedAt_idx`(`deployedAt`),
    INDEX `system_versions_version_idx`(`version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `strategic_foundation` (
    `id` CHAR(36) NOT NULL,
    `vision` TEXT NOT NULL,
    `mission` TEXT NOT NULL,
    `coreValues` JSON NOT NULL,
    `bhag` TEXT NULL,
    `threeYearOutlook` TEXT NULL,
    `strategicPillars` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `swot_analysis` (
    `id` CHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `strengths` JSON NOT NULL,
    `weaknesses` JSON NOT NULL,
    `opportunities` JSON NOT NULL,
    `threats` JSON NOT NULL,
    `strategies` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `swot_analysis_year_idx`(`year`),
    UNIQUE INDEX `swot_analysis_year_key`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `annual_plans` (
    `id` CHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `theme` VARCHAR(191) NULL,
    `strategicPriorities` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `annual_plans_year_idx`(`year`),
    INDEX `annual_plans_status_idx`(`status`),
    UNIQUE INDEX `annual_plans_year_key`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_objectives` (
    `id` CHAR(36) NOT NULL,
    `annualPlanId` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `tags` JSON NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'Medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Not Started',
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `company_objectives_annualPlanId_idx`(`annualPlanId`),
    INDEX `company_objectives_ownerId_idx`(`ownerId`),
    INDEX `company_objectives_category_idx`(`category`),
    INDEX `company_objectives_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `key_results` (
    `id` CHAR(36) NOT NULL,
    `objectiveId` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `targetValue` DOUBLE NOT NULL,
    `currentValue` DOUBLE NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NOT NULL,
    `measurementType` VARCHAR(191) NOT NULL DEFAULT 'Numeric',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Not Started',
    `dueDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `key_results_objectiveId_idx`(`objectiveId`),
    INDEX `key_results_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `key_result_progress` (
    `id` CHAR(36) NOT NULL,
    `keyResultId` CHAR(36) NOT NULL,
    `value` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `recordedBy` CHAR(36) NOT NULL,
    `recordedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `key_result_progress_keyResultId_idx`(`keyResultId`),
    INDEX `key_result_progress_recordedDate_idx`(`recordedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `balanced_scorecard_kpis` (
    `id` CHAR(36) NOT NULL,
    `annualPlanId` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `targetValue` DOUBLE NOT NULL,
    `currentValue` DOUBLE NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `formula` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'On Track',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `balanced_scorecard_kpis_annualPlanId_idx`(`annualPlanId`),
    INDEX `balanced_scorecard_kpis_category_idx`(`category`),
    INDEX `balanced_scorecard_kpis_ownerId_idx`(`ownerId`),
    INDEX `balanced_scorecard_kpis_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bsc_kpi_measurements` (
    `id` CHAR(36) NOT NULL,
    `kpiId` CHAR(36) NOT NULL,
    `value` DOUBLE NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `recordedBy` CHAR(36) NOT NULL,
    `recordedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bsc_kpi_measurements_kpiId_idx`(`kpiId`),
    INDEX `bsc_kpi_measurements_period_idx`(`period`),
    INDEX `bsc_kpi_measurements_recordedDate_idx`(`recordedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `annual_initiatives` (
    `id` CHAR(36) NOT NULL,
    `annualPlanId` CHAR(36) NOT NULL,
    `objectiveId` CHAR(36) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `expectedImpact` TEXT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `ownerId` CHAR(36) NOT NULL,
    `departmentId` CHAR(36) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Planned',
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `budget` DOUBLE NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `annual_initiatives_annualPlanId_idx`(`annualPlanId`),
    INDEX `annual_initiatives_objectiveId_idx`(`objectiveId`),
    INDEX `annual_initiatives_ownerId_idx`(`ownerId`),
    INDEX `annual_initiatives_departmentId_idx`(`departmentId`),
    INDEX `annual_initiatives_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `department_plans` (
    `id` CHAR(36) NOT NULL,
    `annualPlanId` CHAR(36) NOT NULL,
    `departmentId` CHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `vision` TEXT NULL,
    `priorities` JSON NULL,
    `risks` JSON NULL,
    `dependencies` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `department_plans_annualPlanId_idx`(`annualPlanId`),
    INDEX `department_plans_departmentId_idx`(`departmentId`),
    INDEX `department_plans_year_idx`(`year`),
    UNIQUE INDEX `department_plans_annualPlanId_departmentId_key`(`annualPlanId`, `departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `department_objectives` (
    `id` CHAR(36) NOT NULL,
    `departmentPlanId` CHAR(36) NOT NULL,
    `companyObjectiveId` CHAR(36) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Not Started',
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `department_objectives_departmentPlanId_idx`(`departmentPlanId`),
    INDEX `department_objectives_companyObjectiveId_idx`(`companyObjectiveId`),
    INDEX `department_objectives_ownerId_idx`(`ownerId`),
    INDEX `department_objectives_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `department_kpis` (
    `id` CHAR(36) NOT NULL,
    `departmentPlanId` CHAR(36) NOT NULL,
    `companyKPIId` CHAR(36) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `targetValue` DOUBLE NOT NULL,
    `currentValue` DOUBLE NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'On Track',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `department_kpis_departmentPlanId_idx`(`departmentPlanId`),
    INDEX `department_kpis_companyKPIId_idx`(`companyKPIId`),
    INDEX `department_kpis_ownerId_idx`(`ownerId`),
    INDEX `department_kpis_category_idx`(`category`),
    INDEX `department_kpis_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `department_kpi_measurements` (
    `id` CHAR(36) NOT NULL,
    `kpiId` CHAR(36) NOT NULL,
    `value` DOUBLE NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `recordedBy` CHAR(36) NOT NULL,
    `recordedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `department_kpi_measurements_kpiId_idx`(`kpiId`),
    INDEX `department_kpi_measurements_period_idx`(`period`),
    INDEX `department_kpi_measurements_recordedDate_idx`(`recordedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `department_initiatives` (
    `id` CHAR(36) NOT NULL,
    `departmentPlanId` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `ownerId` CHAR(36) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Planned',
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `department_initiatives_departmentPlanId_idx`(`departmentPlanId`),
    INDEX `department_initiatives_ownerId_idx`(`ownerId`),
    INDEX `department_initiatives_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weekly_issues` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `departmentId` CHAR(36) NULL,
    `raisedById` CHAR(36) NOT NULL,
    `assignedToId` CHAR(36) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'Medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Open',
    `dueDate` DATETIME(3) NULL,
    `resolvedDate` DATETIME(3) NULL,
    `resolution` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `weekly_issues_departmentId_idx`(`departmentId`),
    INDEX `weekly_issues_raisedById_idx`(`raisedById`),
    INDEX `weekly_issues_assignedToId_idx`(`assignedToId`),
    INDEX `weekly_issues_status_idx`(`status`),
    INDEX `weekly_issues_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Building_projectId_idx` ON `Building`(`projectId`);

-- AddForeignKey
ALTER TABLE `ScopeSchedule` ADD CONSTRAINT `ScopeSchedule_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScopeSchedule` ADD CONSTRAINT `ScopeSchedule_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITP` ADD CONSTRAINT `ITP_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITP` ADD CONSTRAINT `ITP_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITP` ADD CONSTRAINT `ITP_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WPS` ADD CONSTRAINT `WPS_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WPS` ADD CONSTRAINT `WPS_preparedById_fkey` FOREIGN KEY (`preparedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WPS` ADD CONSTRAINT `WPS_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WPSPass` ADD CONSTRAINT `WPSPass_wpsId_fkey` FOREIGN KEY (`wpsId`) REFERENCES `WPS`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentCategory` ADD CONSTRAINT `DocumentCategory_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `DocumentCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `DocumentCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentReference` ADD CONSTRAINT `DocumentReference_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentReference` ADD CONSTRAINT `DocumentReference_referencedDocumentId_fkey` FOREIGN KEY (`referencedDocumentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyPart` ADD CONSTRAINT `AssemblyPart_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyPart` ADD CONSTRAINT `AssemblyPart_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyPart` ADD CONSTRAINT `AssemblyPart_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyPart` ADD CONSTRAINT `AssemblyPart_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionLog` ADD CONSTRAINT `ProductionLog_assemblyPartId_fkey` FOREIGN KEY (`assemblyPartId`) REFERENCES `AssemblyPart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionLog` ADD CONSTRAINT `ProductionLog_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFIRequest` ADD CONSTRAINT `RFIRequest_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFIRequest` ADD CONSTRAINT `RFIRequest_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFIRequest` ADD CONSTRAINT `RFIRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFIRequest` ADD CONSTRAINT `RFIRequest_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFIProductionLog` ADD CONSTRAINT `RFIProductionLog_rfiRequestId_fkey` FOREIGN KEY (`rfiRequestId`) REFERENCES `RFIRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFIProductionLog` ADD CONSTRAINT `RFIProductionLog_productionLogId_fkey` FOREIGN KEY (`productionLogId`) REFERENCES `ProductionLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_productionLogId_fkey` FOREIGN KEY (`productionLogId`) REFERENCES `ProductionLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_rfiRequestId_fkey` FOREIGN KEY (`rfiRequestId`) REFERENCES `RFIRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_raisedById_fkey` FOREIGN KEY (`raisedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NCRReport` ADD CONSTRAINT `NCRReport_closedById_fkey` FOREIGN KEY (`closedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialInspection` ADD CONSTRAINT `MaterialInspection_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialInspection` ADD CONSTRAINT `MaterialInspection_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeldingInspection` ADD CONSTRAINT `WeldingInspection_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeldingInspection` ADD CONSTRAINT `WeldingInspection_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeldingInspection` ADD CONSTRAINT `WeldingInspection_productionLogId_fkey` FOREIGN KEY (`productionLogId`) REFERENCES `ProductionLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeldingInspection` ADD CONSTRAINT `WeldingInspection_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DimensionalInspection` ADD CONSTRAINT `DimensionalInspection_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DimensionalInspection` ADD CONSTRAINT `DimensionalInspection_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DimensionalInspection` ADD CONSTRAINT `DimensionalInspection_productionLogId_fkey` FOREIGN KEY (`productionLogId`) REFERENCES `ProductionLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DimensionalInspection` ADD CONSTRAINT `DimensionalInspection_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NDTInspection` ADD CONSTRAINT `NDTInspection_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NDTInspection` ADD CONSTRAINT `NDTInspection_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NDTInspection` ADD CONSTRAINT `NDTInspection_productionLogId_fkey` FOREIGN KEY (`productionLogId`) REFERENCES `ProductionLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NDTInspection` ADD CONSTRAINT `NDTInspection_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITPActivity` ADD CONSTRAINT `ITPActivity_itpId_fkey` FOREIGN KEY (`itpId`) REFERENCES `ITP`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITPActivity` ADD CONSTRAINT `ITPActivity_signAId_fkey` FOREIGN KEY (`signAId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITPActivity` ADD CONSTRAINT `ITPActivity_signBId_fkey` FOREIGN KEY (`signBId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITPActivity` ADD CONSTRAINT `ITPActivity_signCId_fkey` FOREIGN KEY (`signCId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPlan` ADD CONSTRAINT `ProjectPlan_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPlan` ADD CONSTRAINT `ProjectPlan_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPlan` ADD CONSTRAINT `ProjectPlan_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIDefinition` ADD CONSTRAINT `KPIDefinition_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIDefinition` ADD CONSTRAINT `KPIDefinition_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIScore` ADD CONSTRAINT `KPIScore_kpiId_fkey` FOREIGN KEY (`kpiId`) REFERENCES `KPIDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPITarget` ADD CONSTRAINT `KPITarget_kpiId_fkey` FOREIGN KEY (`kpiId`) REFERENCES `KPIDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIManualEntry` ADD CONSTRAINT `KPIManualEntry_kpiId_fkey` FOREIGN KEY (`kpiId`) REFERENCES `KPIDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIManualEntry` ADD CONSTRAINT `KPIManualEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIManualEntry` ADD CONSTRAINT `KPIManualEntry_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIManualEntry` ADD CONSTRAINT `KPIManualEntry_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIHistory` ADD CONSTRAINT `KPIHistory_kpiId_fkey` FOREIGN KEY (`kpiId`) REFERENCES `KPIDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIHistory` ADD CONSTRAINT `KPIHistory_performedBy_fkey` FOREIGN KEY (`performedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIAlert` ADD CONSTRAINT `KPIAlert_kpiId_fkey` FOREIGN KEY (`kpiId`) REFERENCES `KPIDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIAlert` ADD CONSTRAINT `KPIAlert_acknowledgedBy_fkey` FOREIGN KEY (`acknowledgedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Initiative` ADD CONSTRAINT `Initiative_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Initiative` ADD CONSTRAINT `Initiative_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Initiative` ADD CONSTRAINT `Initiative_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Initiative` ADD CONSTRAINT `Initiative_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InitiativeMilestone` ADD CONSTRAINT `InitiativeMilestone_initiativeId_fkey` FOREIGN KEY (`initiativeId`) REFERENCES `Initiative`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InitiativeMilestone` ADD CONSTRAINT `InitiativeMilestone_responsibleId_fkey` FOREIGN KEY (`responsibleId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InitiativeTask` ADD CONSTRAINT `InitiativeTask_initiativeId_fkey` FOREIGN KEY (`initiativeId`) REFERENCES `Initiative`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InitiativeTask` ADD CONSTRAINT `InitiativeTask_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSubmission` ADD CONSTRAINT `DocumentSubmission_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSubmission` ADD CONSTRAINT `DocumentSubmission_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSubmission` ADD CONSTRAINT `DocumentSubmission_handledBy_fkey` FOREIGN KEY (`handledBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSubmission` ADD CONSTRAINT `DocumentSubmission_submittedBy_fkey` FOREIGN KEY (`submittedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentRevision` ADD CONSTRAINT `DocumentRevision_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `DocumentSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentRevision` ADD CONSTRAINT `DocumentRevision_submittedBy_fkey` FOREIGN KEY (`submittedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentRevision` ADD CONSTRAINT `DocumentRevision_handledBy_fkey` FOREIGN KEY (`handledBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperationEvent` ADD CONSTRAINT `OperationEvent_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperationEvent` ADD CONSTRAINT `OperationEvent_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperationEvent` ADD CONSTRAINT `OperationEvent_stage_fkey` FOREIGN KEY (`stage`) REFERENCES `OperationStageConfig`(`stageCode`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_objectives` ADD CONSTRAINT `company_objectives_annualPlanId_fkey` FOREIGN KEY (`annualPlanId`) REFERENCES `annual_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_objectives` ADD CONSTRAINT `company_objectives_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `key_results` ADD CONSTRAINT `key_results_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `company_objectives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `key_result_progress` ADD CONSTRAINT `key_result_progress_keyResultId_fkey` FOREIGN KEY (`keyResultId`) REFERENCES `key_results`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `key_result_progress` ADD CONSTRAINT `key_result_progress_recordedBy_fkey` FOREIGN KEY (`recordedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balanced_scorecard_kpis` ADD CONSTRAINT `balanced_scorecard_kpis_annualPlanId_fkey` FOREIGN KEY (`annualPlanId`) REFERENCES `annual_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balanced_scorecard_kpis` ADD CONSTRAINT `balanced_scorecard_kpis_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bsc_kpi_measurements` ADD CONSTRAINT `bsc_kpi_measurements_kpiId_fkey` FOREIGN KEY (`kpiId`) REFERENCES `balanced_scorecard_kpis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bsc_kpi_measurements` ADD CONSTRAINT `bsc_kpi_measurements_recordedBy_fkey` FOREIGN KEY (`recordedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_initiatives` ADD CONSTRAINT `annual_initiatives_annualPlanId_fkey` FOREIGN KEY (`annualPlanId`) REFERENCES `annual_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_initiatives` ADD CONSTRAINT `annual_initiatives_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `company_objectives`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_initiatives` ADD CONSTRAINT `annual_initiatives_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_initiatives` ADD CONSTRAINT `annual_initiatives_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_plans` ADD CONSTRAINT `department_plans_annualPlanId_fkey` FOREIGN KEY (`annualPlanId`) REFERENCES `annual_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_plans` ADD CONSTRAINT `department_plans_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_objectives` ADD CONSTRAINT `department_objectives_departmentPlanId_fkey` FOREIGN KEY (`departmentPlanId`) REFERENCES `department_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_objectives` ADD CONSTRAINT `department_objectives_companyObjectiveId_fkey` FOREIGN KEY (`companyObjectiveId`) REFERENCES `company_objectives`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_objectives` ADD CONSTRAINT `department_objectives_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_kpis` ADD CONSTRAINT `department_kpis_departmentPlanId_fkey` FOREIGN KEY (`departmentPlanId`) REFERENCES `department_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_kpis` ADD CONSTRAINT `department_kpis_companyKPIId_fkey` FOREIGN KEY (`companyKPIId`) REFERENCES `balanced_scorecard_kpis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_kpis` ADD CONSTRAINT `department_kpis_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_kpi_measurements` ADD CONSTRAINT `department_kpi_measurements_kpiId_fkey` FOREIGN KEY (`kpiId`) REFERENCES `department_kpis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_kpi_measurements` ADD CONSTRAINT `department_kpi_measurements_recordedBy_fkey` FOREIGN KEY (`recordedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_initiatives` ADD CONSTRAINT `department_initiatives_departmentPlanId_fkey` FOREIGN KEY (`departmentPlanId`) REFERENCES `department_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_initiatives` ADD CONSTRAINT `department_initiatives_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weekly_issues` ADD CONSTRAINT `weekly_issues_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weekly_issues` ADD CONSTRAINT `weekly_issues_raisedById_fkey` FOREIGN KEY (`raisedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weekly_issues` ADD CONSTRAINT `weekly_issues_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
