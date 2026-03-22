-- Supply Chain Module — LCR (Least Cost Routing)
-- Creates lcr_entries, lcr_alias_map, and lcr_sync_logs tables

CREATE TABLE IF NOT EXISTS `lcr_entries` (
  `id` CHAR(36) NOT NULL,
  `sheetRowId` VARCHAR(100) NOT NULL,
  `rowHash` VARCHAR(32) NOT NULL,
  `syncedAt` DATETIME(3) NOT NULL,
  `isDeleted` BOOLEAN NOT NULL DEFAULT false,
  `resolutionStatus` VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Identity
  `sn` VARCHAR(50) DEFAULT NULL,
  `projectNumber` VARCHAR(50) DEFAULT NULL,
  `projectId` CHAR(36) DEFAULT NULL,
  `itemLabel` VARCHAR(500) DEFAULT NULL,
  `productId` INT DEFAULT NULL,
  `qty` DECIMAL(15, 3) DEFAULT NULL,
  `amount` DECIMAL(15, 2) DEFAULT NULL,
  `status` VARCHAR(100) DEFAULT NULL,
  `buildingNameRaw` VARCHAR(255) DEFAULT NULL,
  `buildingId` CHAR(36) DEFAULT NULL,
  `mrfNumber` VARCHAR(100) DEFAULT NULL,

  -- Timeline
  `requestDate` DATE DEFAULT NULL,
  `neededFromDate` DATE DEFAULT NULL,
  `neededToDate` DATE DEFAULT NULL,
  `buyingDate` DATE DEFAULT NULL,
  `receivingDate` DATE DEFAULT NULL,

  -- Purchase
  `poNumber` VARCHAR(100) DEFAULT NULL,
  `dnNumber` VARCHAR(100) DEFAULT NULL,
  `awardedToRaw` VARCHAR(255) DEFAULT NULL,
  `supplierId` INT DEFAULT NULL,
  `weight` DECIMAL(15, 3) DEFAULT NULL,
  `totalWeight` DECIMAL(15, 3) DEFAULT NULL,
  `thickness` VARCHAR(100) DEFAULT NULL,
  `targetPrice` DECIMAL(15, 2) DEFAULT NULL,

  -- LCR1
  `totalLcr1` DECIMAL(15, 2) DEFAULT NULL,
  `ratio1to2Lcr1` DECIMAL(10, 4) DEFAULT NULL,
  `lcr1Amount` DECIMAL(15, 2) DEFAULT NULL,
  `lcr1PricePerTon` DECIMAL(15, 2) DEFAULT NULL,

  -- LCR2
  `totalLcr2` DECIMAL(15, 2) DEFAULT NULL,
  `lcr2` VARCHAR(255) DEFAULT NULL,
  `lcr2Amount` DECIMAL(15, 2) DEFAULT NULL,
  `lcr2PricePerTon` DECIMAL(15, 2) DEFAULT NULL,

  -- LCR3
  `lcr3` VARCHAR(255) DEFAULT NULL,
  `lcr3Amount` DECIMAL(15, 2) DEFAULT NULL,
  `lcr3PricePerTon` DECIMAL(15, 2) DEFAULT NULL,

  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sheet_row_id` (`sheetRowId`),
  INDEX `idx_lcr_project` (`projectId`),
  INDEX `idx_lcr_building` (`buildingId`),
  INDEX `idx_lcr_status` (`status`),
  INDEX `idx_lcr_resolution` (`resolutionStatus`),
  INDEX `idx_lcr_deleted` (`isDeleted`),
  INDEX `idx_lcr_needed_to` (`neededToDate`),
  INDEX `idx_lcr_receiving` (`receivingDate`),
  INDEX `idx_lcr_synced` (`syncedAt`),

  CONSTRAINT `fk_lcr_project` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_lcr_building` FOREIGN KEY (`buildingId`) REFERENCES `Building` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lcr_alias_map` (
  `id` CHAR(36) NOT NULL,
  `aliasText` VARCHAR(255) NOT NULL,
  `entityType` VARCHAR(20) NOT NULL,
  `entityId` VARCHAR(36) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `createdById` CHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_alias_entity_type` (`aliasText`, `entityType`),
  INDEX `idx_alias_entity_type` (`entityType`),

  CONSTRAINT `fk_alias_created_by` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lcr_sync_logs` (
  `id` CHAR(36) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `triggeredBy` VARCHAR(20) NOT NULL,
  `totalRows` INT NOT NULL DEFAULT 0,
  `rowsInserted` INT NOT NULL DEFAULT 0,
  `rowsUpdated` INT NOT NULL DEFAULT 0,
  `rowsUnchanged` INT NOT NULL DEFAULT 0,
  `rowsDeleted` INT NOT NULL DEFAULT 0,
  `pendingAliases` INT NOT NULL DEFAULT 0,
  `durationMs` INT NOT NULL DEFAULT 0,
  `errorMessage` TEXT DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `idx_sync_status` (`status`),
  INDEX `idx_sync_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
