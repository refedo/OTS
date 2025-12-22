/*
  Warnings:

  - Made the column `theme` on table `annual_plans` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `department_plans` DROP FOREIGN KEY `department_plans_annualPlanId_fkey`;

-- DropIndex
DROP INDEX `department_plans_annualPlanId_departmentId_key` ON `department_plans`;

-- DropIndex
DROP INDEX `swot_analysis_year_key` ON `swot_analysis`;

-- AlterTable
ALTER TABLE `annual_initiatives` ALTER COLUMN `year` DROP DEFAULT;

-- AlterTable
ALTER TABLE `annual_plans` MODIFY `theme` VARCHAR(191) NOT NULL,
    MODIFY `strategicPriorities` JSON NULL;

-- AlterTable
ALTER TABLE `assemblypart` ADD COLUMN `deleteReason` VARCHAR(500) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` CHAR(36) NULL,
    ADD COLUMN `externalRef` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `balanced_scorecard_kpis` ALTER COLUMN `year` DROP DEFAULT;

-- AlterTable
ALTER TABLE `building` ADD COLUMN `deleteReason` VARCHAR(500) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `company_objectives` ALTER COLUMN `year` DROP DEFAULT;

-- AlterTable
ALTER TABLE `department_plans` ADD COLUMN `name` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `productionlog` ADD COLUMN `externalRef` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'OTS';

-- AlterTable
ALTER TABLE `project` ADD COLUMN `deleteReason` VARCHAR(500) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `systemevent` ADD COLUMN `requestId` VARCHAR(64) NULL,
    ADD COLUMN `severity` ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL DEFAULT 'INFO',
    MODIFY `eventType` VARCHAR(191) NOT NULL,
    MODIFY `category` VARCHAR(191) NOT NULL,
    MODIFY `entityType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `task` ADD COLUMN `backlogItemId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `customPermissions` JSON NULL;

-- AlterTable
ALTER TABLE `wps` ADD COLUMN `backingType2` VARCHAR(191) NULL,
    ADD COLUMN `backingUsed` VARCHAR(191) NULL,
    ADD COLUMN `baseMetalFillet` VARCHAR(191) NULL,
    ADD COLUMN `baseMetalGroove` VARCHAR(191) NULL,
    ADD COLUMN `jointDiagram` VARCHAR(191) NULL,
    ADD COLUMN `materialGroup` VARCHAR(191) NULL,
    ADD COLUMN `materialSpec` VARCHAR(191) NULL,
    ADD COLUMN `materialThickness` DECIMAL(10, 2) NULL,
    ADD COLUMN `thicknessRange` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` CHAR(36) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL DEFAULT 'HEXA STEEL',
    `companyTagline` VARCHAR(191) NOT NULL DEFAULT 'THRIVE DIFFERENT',
    `companyLogo` VARCHAR(191) NULL,
    `companyAddress` TEXT NULL,
    `companyPhone` VARCHAR(191) NULL,
    `companyEmail` VARCHAR(191) NULL,
    `companyWebsite` VARCHAR(191) NULL,
    `defaultReportTheme` VARCHAR(191) NOT NULL DEFAULT 'blue',
    `reportFooterText` VARCHAR(191) NOT NULL DEFAULT 'HEXA STEEL - Professional Report',
    `dateFormat` VARCHAR(191) NOT NULL DEFAULT 'DD-MM-YYYY',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC+03:00',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'SAR',
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `smsNotifications` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `processing_teams` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `processing_teams_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `processing_locations` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `processing_locations_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `type` ENUM('TASK_ASSIGNED', 'APPROVAL_REQUIRED', 'DEADLINE_WARNING', 'APPROVED', 'REJECTED', 'SYSTEM') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `relatedEntityType` VARCHAR(191) NULL,
    `relatedEntityId` CHAR(36) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `archivedAt` DATETIME(3) NULL,
    `deadlineAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_type_idx`(`type`),
    INDEX `notifications_isRead_idx`(`isRead`),
    INDEX `notifications_isArchived_idx`(`isArchived`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    INDEX `notifications_deadlineAt_idx`(`deadlineAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_dashboard_widgets` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `widgetType` VARCHAR(191) NOT NULL,
    `widgetSize` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `position` INTEGER NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `settings` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_dashboard_widgets_userId_idx`(`userId`),
    INDEX `user_dashboard_widgets_widgetType_idx`(`widgetType`),
    INDEX `user_dashboard_widgets_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrder` (
    `id` CHAR(36) NOT NULL,
    `workOrderNumber` VARCHAR(191) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `buildingId` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `selectedGroups` JSON NOT NULL,
    `productionEngineerId` CHAR(36) NOT NULL,
    `processingLocation` VARCHAR(191) NULL,
    `processingTeam` VARCHAR(191) NULL,
    `totalWeight` DECIMAL(10, 2) NOT NULL,
    `weightPercentage` DECIMAL(5, 2) NOT NULL,
    `plannedStartDate` DATETIME(3) NOT NULL,
    `plannedEndDate` DATETIME(3) NOT NULL,
    `actualStartDate` DATETIME(3) NULL,
    `actualEndDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `progress` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WorkOrder_workOrderNumber_key`(`workOrderNumber`),
    INDEX `WorkOrder_projectId_idx`(`projectId`),
    INDEX `WorkOrder_buildingId_idx`(`buildingId`),
    INDEX `WorkOrder_productionEngineerId_idx`(`productionEngineerId`),
    INDEX `WorkOrder_status_idx`(`status`),
    INDEX `WorkOrder_plannedStartDate_idx`(`plannedStartDate`),
    INDEX `WorkOrder_plannedEndDate_idx`(`plannedEndDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrderPart` (
    `id` CHAR(36) NOT NULL,
    `workOrderId` CHAR(36) NOT NULL,
    `assemblyPartId` CHAR(36) NOT NULL,
    `partDesignation` VARCHAR(191) NOT NULL,
    `assemblyMark` VARCHAR(191) NOT NULL,
    `partMark` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `weight` DECIMAL(10, 2) NOT NULL,
    `processedQuantity` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WorkOrderPart_workOrderId_idx`(`workOrderId`),
    INDEX `WorkOrderPart_assemblyPartId_idx`(`assemblyPartId`),
    INDEX `WorkOrderPart_status_idx`(`status`),
    UNIQUE INDEX `WorkOrderPart_workOrderId_assemblyPartId_key`(`workOrderId`, `assemblyPartId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_units` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `type` ENUM('DESIGN', 'PROCUREMENT', 'PRODUCTION', 'QC', 'DOCUMENTATION') NOT NULL,
    `referenceModule` VARCHAR(191) NOT NULL,
    `referenceId` CHAR(36) NOT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `plannedStart` DATETIME(3) NOT NULL,
    `plannedEnd` DATETIME(3) NOT NULL,
    `actualStart` DATETIME(3) NULL,
    `actualEnd` DATETIME(3) NULL,
    `quantity` DOUBLE NULL,
    `weight` DOUBLE NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `work_units_projectId_idx`(`projectId`),
    INDEX `work_units_ownerId_idx`(`ownerId`),
    INDEX `work_units_type_idx`(`type`),
    INDEX `work_units_status_idx`(`status`),
    INDEX `work_units_referenceModule_referenceId_idx`(`referenceModule`, `referenceId`),
    INDEX `work_units_plannedStart_idx`(`plannedStart`),
    INDEX `work_units_plannedEnd_idx`(`plannedEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_unit_dependencies` (
    `id` CHAR(36) NOT NULL,
    `fromWorkUnitId` CHAR(36) NOT NULL,
    `toWorkUnitId` CHAR(36) NOT NULL,
    `dependencyType` ENUM('FS', 'SS', 'FF') NOT NULL DEFAULT 'FS',
    `lagDays` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `work_unit_dependencies_fromWorkUnitId_idx`(`fromWorkUnitId`),
    INDEX `work_unit_dependencies_toWorkUnitId_idx`(`toWorkUnitId`),
    UNIQUE INDEX `work_unit_dependencies_fromWorkUnitId_toWorkUnitId_key`(`fromWorkUnitId`, `toWorkUnitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resource_capacities` (
    `id` CHAR(36) NOT NULL,
    `resourceType` ENUM('DESIGNER', 'LASER', 'WELDER', 'QC', 'PROCUREMENT') NOT NULL,
    `resourceId` CHAR(36) NULL,
    `resourceName` VARCHAR(191) NOT NULL,
    `capacityPerDay` DOUBLE NOT NULL,
    `unit` ENUM('HOURS', 'TONS', 'DRAWINGS') NOT NULL,
    `workingDaysPerWeek` INTEGER NOT NULL DEFAULT 5,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `resource_capacities_resourceType_idx`(`resourceType`),
    INDEX `resource_capacities_resourceId_idx`(`resourceId`),
    INDEX `resource_capacities_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dependency_blueprints` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `structureType` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dependency_blueprints_name_key`(`name`),
    INDEX `dependency_blueprints_isActive_idx`(`isActive`),
    INDEX `dependency_blueprints_structureType_idx`(`structureType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dependency_blueprint_steps` (
    `id` CHAR(36) NOT NULL,
    `blueprintId` CHAR(36) NOT NULL,
    `fromType` ENUM('DESIGN', 'PROCUREMENT', 'PRODUCTION', 'QC', 'DOCUMENTATION') NOT NULL,
    `toType` ENUM('DESIGN', 'PROCUREMENT', 'PRODUCTION', 'QC', 'DOCUMENTATION') NOT NULL,
    `dependencyType` ENUM('FS', 'SS', 'FF') NOT NULL DEFAULT 'FS',
    `lagDays` INTEGER NOT NULL DEFAULT 0,
    `fromReferenceModule` VARCHAR(191) NULL,
    `toReferenceModule` VARCHAR(191) NULL,
    `sequenceOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `dependency_blueprint_steps_blueprintId_idx`(`blueprintId`),
    INDEX `dependency_blueprint_steps_fromType_idx`(`fromType`),
    INDEX `dependency_blueprint_steps_toType_idx`(`toType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_events` (
    `id` CHAR(36) NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `type` ENUM('DELAY', 'BOTTLENECK', 'DEPENDENCY', 'OVERLOAD') NOT NULL,
    `affectedProjectIds` JSON NOT NULL,
    `affectedWorkUnitIds` JSON NOT NULL,
    `reason` TEXT NOT NULL,
    `recommendedAction` TEXT NOT NULL,
    `fingerprint` VARCHAR(255) NOT NULL,
    `detectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `risk_events_fingerprint_key`(`fingerprint`),
    INDEX `risk_events_severity_idx`(`severity`),
    INDEX `risk_events_type_idx`(`type`),
    INDEX `risk_events_detectedAt_idx`(`detectedAt`),
    INDEX `risk_events_resolvedAt_idx`(`resolvedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pts_sync_configs` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `spreadsheetId` VARCHAR(191) NOT NULL,
    `sheetName` VARCHAR(191) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `columnMapping` JSON NOT NULL,
    `headerRow` INTEGER NOT NULL DEFAULT 1,
    `dataStartRow` INTEGER NOT NULL DEFAULT 2,
    `syncInterval` INTEGER NOT NULL DEFAULT 0,
    `lastSyncAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `autoCreateParts` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pts_sync_configs_projectId_idx`(`projectId`),
    INDEX `pts_sync_configs_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pts_sync_logs` (
    `id` CHAR(36) NOT NULL,
    `configId` CHAR(36) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `totalRows` INTEGER NOT NULL,
    `syncedRows` INTEGER NOT NULL,
    `skippedRows` INTEGER NOT NULL,
    `errors` JSON NOT NULL,
    `duration` INTEGER NOT NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pts_sync_logs_configId_idx`(`configId`),
    INDEX `pts_sync_logs_syncedAt_idx`(`syncedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` CHAR(36) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` CHAR(36) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'APPROVE', 'REJECT', 'SYNC') NOT NULL,
    `changes` JSON NULL,
    `performedById` CHAR(36) NOT NULL,
    `performedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requestId` VARCHAR(64) NULL,
    `sourceModule` VARCHAR(100) NULL,
    `reason` TEXT NULL,
    `metadata` JSON NULL,

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_performedById_idx`(`performedById`),
    INDEX `AuditLog_performedAt_idx`(`performedAt`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EntityVersion` (
    `id` CHAR(36) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` CHAR(36) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `snapshot` JSON NOT NULL,
    `changeReason` VARCHAR(500) NULL,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EntityVersion_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `EntityVersion_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `EntityVersion_entityType_entityId_versionNumber_key`(`entityType`, `entityId`, `versionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PTSSyncBatch` (
    `id` CHAR(36) NOT NULL,
    `syncType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `partsCreated` INTEGER NOT NULL DEFAULT 0,
    `partsUpdated` INTEGER NOT NULL DEFAULT 0,
    `logsCreated` INTEGER NOT NULL DEFAULT 0,
    `logsUpdated` INTEGER NOT NULL DEFAULT 0,
    `errorsCount` INTEGER NOT NULL DEFAULT 0,
    `projectNumbers` JSON NOT NULL,
    `durationMs` INTEGER NOT NULL,
    `metadata` JSON NULL,
    `userId` CHAR(36) NOT NULL,
    `rolledBack` BOOLEAN NOT NULL DEFAULT false,
    `rolledBackAt` DATETIME(3) NULL,
    `rolledBackById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PTSSyncBatch_userId_idx`(`userId`),
    INDEX `PTSSyncBatch_createdAt_idx`(`createdAt`),
    INDEX `PTSSyncBatch_rolledBack_idx`(`rolledBack`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductBacklogItem` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` ENUM('FEATURE', 'BUG', 'TECH_DEBT', 'PERFORMANCE', 'REPORTING', 'REFACTOR', 'COMPLIANCE', 'INSIGHT') NOT NULL,
    `category` ENUM('CORE_SYSTEM', 'PRODUCTION', 'DESIGN', 'DETAILING', 'PROCUREMENT', 'QC', 'LOGISTICS', 'FINANCE', 'REPORTING', 'AI', 'GOVERNANCE') NOT NULL,
    `businessReason` TEXT NOT NULL,
    `expectedValue` TEXT NULL,
    `priority` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL,
    `status` ENUM('IDEA', 'UNDER_REVIEW', 'APPROVED', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'DROPPED') NOT NULL,
    `affectedModules` JSON NOT NULL,
    `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    `complianceFlag` BOOLEAN NOT NULL DEFAULT false,
    `linkedObjectiveId` CHAR(36) NULL,
    `linkedKpiId` CHAR(36) NULL,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedById` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `plannedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ProductBacklogItem_code_key`(`code`),
    INDEX `ProductBacklogItem_type_status_priority_idx`(`type`, `status`, `priority`),
    INDEX `ProductBacklogItem_category_idx`(`category`),
    INDEX `ProductBacklogItem_status_idx`(`status`),
    INDEX `ProductBacklogItem_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ProductionLog_source_idx` ON `ProductionLog`(`source`);

-- CreateIndex
CREATE INDEX `ProductionLog_externalRef_idx` ON `ProductionLog`(`externalRef`);

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Building` ADD CONSTRAINT `Building_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_backlogItemId_fkey` FOREIGN KEY (`backlogItemId`) REFERENCES `ProductBacklogItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyPart` ADD CONSTRAINT `AssemblyPart_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_interactions` ADD CONSTRAINT `ai_interactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_dashboard_widgets` ADD CONSTRAINT `user_dashboard_widgets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_productionEngineerId_fkey` FOREIGN KEY (`productionEngineerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrderPart` ADD CONSTRAINT `WorkOrderPart_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `WorkOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrderPart` ADD CONSTRAINT `WorkOrderPart_assemblyPartId_fkey` FOREIGN KEY (`assemblyPartId`) REFERENCES `AssemblyPart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_units` ADD CONSTRAINT `work_units_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_units` ADD CONSTRAINT `work_units_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_unit_dependencies` ADD CONSTRAINT `work_unit_dependencies_fromWorkUnitId_fkey` FOREIGN KEY (`fromWorkUnitId`) REFERENCES `work_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_unit_dependencies` ADD CONSTRAINT `work_unit_dependencies_toWorkUnitId_fkey` FOREIGN KEY (`toWorkUnitId`) REFERENCES `work_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dependency_blueprint_steps` ADD CONSTRAINT `dependency_blueprint_steps_blueprintId_fkey` FOREIGN KEY (`blueprintId`) REFERENCES `dependency_blueprints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pts_sync_logs` ADD CONSTRAINT `pts_sync_logs_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `pts_sync_configs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntityVersion` ADD CONSTRAINT `EntityVersion_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PTSSyncBatch` ADD CONSTRAINT `PTSSyncBatch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PTSSyncBatch` ADD CONSTRAINT `PTSSyncBatch_rolledBackById_fkey` FOREIGN KEY (`rolledBackById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
