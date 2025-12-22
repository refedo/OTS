-- Knowledge Center Module Migration
-- Phase 1: Foundational Knowledge System

-- Create KnowledgeEntry table
CREATE TABLE IF NOT EXISTS `KnowledgeEntry` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM('CHALLENGE', 'ISSUE', 'LESSON', 'BEST_PRACTICE') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `rootCause` TEXT NULL,
    `resolution` TEXT NULL,
    `recommendation` TEXT NULL,
    `severity` ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
    `status` ENUM('Open', 'InProgress', 'PendingValidation', 'Validated', 'Archived') NOT NULL,
    `process` ENUM('Design', 'Detailing', 'Procurement', 'Production', 'QC', 'Erection') NOT NULL,
    `projectId` CHAR(36) NULL,
    `buildingId` CHAR(36) NULL,
    `workUnitId` CHAR(36) NULL,
    `evidenceLinks` JSON NULL,
    `tags` JSON NULL,
    `reportedById` CHAR(36) NOT NULL,
    `ownerId` CHAR(36) NULL,
    `validatedById` CHAR(36) NULL,
    `promotionSourceIssueId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `validatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`),
    INDEX `KnowledgeEntry_type_idx`(`type`),
    INDEX `KnowledgeEntry_status_idx`(`status`),
    INDEX `KnowledgeEntry_process_idx`(`process`),
    INDEX `KnowledgeEntry_severity_idx`(`severity`),
    INDEX `KnowledgeEntry_projectId_idx`(`projectId`),
    INDEX `KnowledgeEntry_buildingId_idx`(`buildingId`),
    INDEX `KnowledgeEntry_workUnitId_idx`(`workUnitId`),
    INDEX `KnowledgeEntry_reportedById_idx`(`reportedById`),
    INDEX `KnowledgeEntry_validatedById_idx`(`validatedById`),
    INDEX `KnowledgeEntry_createdAt_idx`(`createdAt`),
    
    CONSTRAINT `KnowledgeEntry_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `KnowledgeEntry_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `KnowledgeEntry_workUnitId_fkey` FOREIGN KEY (`workUnitId`) REFERENCES `work_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `KnowledgeEntry_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `KnowledgeEntry_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `KnowledgeEntry_validatedById_fkey` FOREIGN KEY (`validatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `KnowledgeEntry_promotionSourceIssueId_fkey` FOREIGN KEY (`promotionSourceIssueId`) REFERENCES `KnowledgeEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create KnowledgeApplication table (Phase 2)
CREATE TABLE IF NOT EXISTS `KnowledgeApplication` (
    `id` CHAR(36) NOT NULL,
    `knowledgeEntryId` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `workUnitId` CHAR(36) NULL,
    `appliedById` CHAR(36) NOT NULL,
    `outcomeNotes` TEXT NULL,
    `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `KnowledgeApplication_knowledgeEntryId_idx`(`knowledgeEntryId`),
    INDEX `KnowledgeApplication_projectId_idx`(`projectId`),
    INDEX `KnowledgeApplication_appliedById_idx`(`appliedById`),
    INDEX `KnowledgeApplication_appliedAt_idx`(`appliedAt`),
    
    CONSTRAINT `KnowledgeApplication_knowledgeEntryId_fkey` FOREIGN KEY (`knowledgeEntryId`) REFERENCES `KnowledgeEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `KnowledgeApplication_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `KnowledgeApplication_workUnitId_fkey` FOREIGN KEY (`workUnitId`) REFERENCES `work_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `KnowledgeApplication_appliedById_fkey` FOREIGN KEY (`appliedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create RiskPattern table (Phase 3)
CREATE TABLE IF NOT EXISTS `RiskPattern` (
    `id` CHAR(36) NOT NULL,
    `patternKey` VARCHAR(191) NOT NULL,
    `process` ENUM('Design', 'Detailing', 'Procurement', 'Production', 'QC', 'Erection') NOT NULL,
    `tags` JSON NOT NULL,
    `occurrenceCount` INTEGER NOT NULL,
    `timeWindow` VARCHAR(191) NOT NULL,
    `status` ENUM('Observed', 'Escalated', 'Addressed') NOT NULL DEFAULT 'Observed',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RiskPattern_patternKey_key`(`patternKey`),
    PRIMARY KEY (`id`),
    INDEX `RiskPattern_process_idx`(`process`),
    INDEX `RiskPattern_status_idx`(`status`),
    INDEX `RiskPattern_occurrenceCount_idx`(`occurrenceCount`),
    INDEX `RiskPattern_createdAt_idx`(`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create RiskPatternEntry junction table (Phase 3)
CREATE TABLE IF NOT EXISTS `RiskPatternEntry` (
    `id` CHAR(36) NOT NULL,
    `riskPatternId` CHAR(36) NOT NULL,
    `knowledgeEntryId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RiskPatternEntry_riskPatternId_knowledgeEntryId_key`(`riskPatternId`, `knowledgeEntryId`),
    PRIMARY KEY (`id`),
    INDEX `RiskPatternEntry_riskPatternId_idx`(`riskPatternId`),
    INDEX `RiskPatternEntry_knowledgeEntryId_idx`(`knowledgeEntryId`),
    
    CONSTRAINT `RiskPatternEntry_riskPatternId_fkey` FOREIGN KEY (`riskPatternId`) REFERENCES `RiskPattern`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `RiskPatternEntry_knowledgeEntryId_fkey` FOREIGN KEY (`knowledgeEntryId`) REFERENCES `KnowledgeEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
