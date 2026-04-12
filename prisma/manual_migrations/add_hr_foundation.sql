-- ============================================================================
-- HR Foundation & Master Data (Phase 1 of OTS-MSS-HR-PAYROLL-v1)
-- ============================================================================
-- Creates:
--   - Employee, Agency, ManpowerSlot, DolibarrEmployeeSyncLog, SystemConfig
--   - EmployeeStatus / AgencyStatus / CardStatus / DolibarrEmployeeSyncStatus
--     as native MySQL ENUMs (matches Prisma enum mapping)
--   - User column additions for identity reconciliation
--   - SystemConfig seed row: identityReconciliationComplete = "false"
--
-- IMPORTANT: This migration follows the OTS convention of stored-procedure
-- guards with information_schema checks, because MySQL does NOT support
-- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Running this file twice is a
-- no-op.
--
-- In normal operation the Prisma migration engine creates these tables via
-- `prisma migrate deploy`. This file exists as a hand-verified fallback so
-- staging can be brought up even if migration history needs to be rebuilt,
-- and to idempotently add the User columns when the table already contains
-- data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Employee
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Employee` (
  `id`                        CHAR(36)       NOT NULL,
  `employmentId`              VARCHAR(64)    NOT NULL,
  `fullNameEn`                VARCHAR(255)   NOT NULL,
  `fullNameAr`                VARCHAR(255)   NULL,
  `nationalId`                VARCHAR(32)    NULL,
  `nationality`               VARCHAR(80)    NULL,
  `dateOfBirth`               DATE           NULL,
  `dateOfJoining`             DATE           NOT NULL,
  `dateOfLeaving`             DATE           NULL,
  `status`                    ENUM('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED','RESIGNED') NOT NULL DEFAULT 'ACTIVE',
  `trade`                     VARCHAR(120)   NULL,
  `department`                VARCHAR(120)   NULL,
  `jobTitleEn`                VARCHAR(200)   NULL,
  `jobTitleAr`                VARCHAR(200)   NULL,
  `reportsToId`               CHAR(36)       NULL,
  `basicSalary`               DECIMAL(12,2)  NOT NULL,
  `housingAllowance`          DECIMAL(12,2)  NOT NULL DEFAULT 0,
  `transportAllowance`        DECIMAL(12,2)  NOT NULL DEFAULT 0,
  `mobileAllowance`           DECIMAL(12,2)  NOT NULL DEFAULT 0,
  `foodAllowance`             DECIMAL(12,2)  NOT NULL DEFAULT 0,
  `otherAllowances`           DECIMAL(12,2)  NOT NULL DEFAULT 0,
  `standardDailyHours`        INT            NOT NULL DEFAULT 8,
  `workWeekDaysCount`         INT            NOT NULL DEFAULT 6,
  `bankName`                  VARCHAR(200)   NULL,
  `bankIban`                  VARCHAR(34)    NULL,
  `lastSyncedFromDolibarrAt`  DATETIME(3)    NULL,
  `manuallyEditedFields`      JSON           NULL,
  `createdById`               CHAR(36)       NOT NULL,
  `updatedById`               CHAR(36)       NULL,
  `createdAt`                 DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`                 DATETIME(3)    NOT NULL,
  `deletedAt`                 DATETIME(3)    NULL,
  `deletedById`               CHAR(36)       NULL,
  `deleteReason`              VARCHAR(500)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Employee_employmentId_key` (`employmentId`),
  UNIQUE KEY `Employee_nationalId_key` (`nationalId`),
  KEY `Employee_status_idx` (`status`),
  KEY `Employee_trade_idx` (`trade`),
  KEY `Employee_department_idx` (`department`),
  KEY `Employee_deletedAt_idx` (`deletedAt`),
  KEY `Employee_reportsToId_fkey` (`reportsToId`),
  KEY `Employee_createdById_fkey` (`createdById`),
  KEY `Employee_updatedById_fkey` (`updatedById`),
  KEY `Employee_deletedById_fkey` (`deletedById`),
  CONSTRAINT `Employee_reportsToId_fkey` FOREIGN KEY (`reportsToId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Employee_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `Employee_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Employee_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Agency
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Agency` (
  `id`             CHAR(36)       NOT NULL,
  `nameEn`         VARCHAR(255)   NOT NULL,
  `nameAr`         VARCHAR(255)   NULL,
  `contactPerson`  VARCHAR(200)   NULL,
  `contactPhone`   VARCHAR(40)    NULL,
  `contractRef`    VARCHAR(120)   NULL,
  `contractStart`  DATE           NULL,
  `contractEnd`    DATE           NULL,
  `status`         ENUM('ACTIVE','INACTIVE','TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  `createdById`    CHAR(36)       NOT NULL,
  `updatedById`    CHAR(36)       NULL,
  `createdAt`      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)    NOT NULL,
  `deletedAt`      DATETIME(3)    NULL,
  `deletedById`    CHAR(36)       NULL,
  `deleteReason`   VARCHAR(500)   NULL,
  PRIMARY KEY (`id`),
  KEY `Agency_status_idx` (`status`),
  KEY `Agency_deletedAt_idx` (`deletedAt`),
  KEY `Agency_createdById_fkey` (`createdById`),
  KEY `Agency_updatedById_fkey` (`updatedById`),
  KEY `Agency_deletedById_fkey` (`deletedById`),
  CONSTRAINT `Agency_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `Agency_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Agency_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- ManpowerSlot
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ManpowerSlot` (
  `id`            CHAR(36)       NOT NULL,
  `agencyId`      CHAR(36)       NOT NULL,
  `slotCode`      VARCHAR(40)    NOT NULL,
  `trade`         VARCHAR(120)   NOT NULL,
  `hourlyRate`    DECIMAL(10,2)  NOT NULL,
  `cardStatus`    ENUM('ACTIVE','LOST','RETURNED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `notes`         VARCHAR(500)   NULL,
  `createdById`   CHAR(36)       NOT NULL,
  `updatedById`   CHAR(36)       NULL,
  `createdAt`     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)    NOT NULL,
  `deletedAt`     DATETIME(3)    NULL,
  `deletedById`   CHAR(36)       NULL,
  `deleteReason`  VARCHAR(500)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ManpowerSlot_slotCode_key` (`slotCode`),
  KEY `ManpowerSlot_agencyId_cardStatus_idx` (`agencyId`, `cardStatus`),
  KEY `ManpowerSlot_trade_idx` (`trade`),
  KEY `ManpowerSlot_deletedAt_idx` (`deletedAt`),
  KEY `ManpowerSlot_createdById_fkey` (`createdById`),
  KEY `ManpowerSlot_updatedById_fkey` (`updatedById`),
  KEY `ManpowerSlot_deletedById_fkey` (`deletedById`),
  CONSTRAINT `ManpowerSlot_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `ManpowerSlot_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `ManpowerSlot_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ManpowerSlot_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DolibarrEmployeeSyncLog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `DolibarrEmployeeSyncLog` (
  `id`                CHAR(36)       NOT NULL,
  `startedAt`         DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt`        DATETIME(3)    NULL,
  `triggeredById`     CHAR(36)       NOT NULL,
  `status`            ENUM('RUNNING','SUCCESS','PARTIAL','FAILED') NOT NULL,
  `rowsRead`          INT            NOT NULL DEFAULT 0,
  `rowsCreated`       INT            NOT NULL DEFAULT 0,
  `rowsUpdated`       INT            NOT NULL DEFAULT 0,
  `rowsSkipped`       INT            NOT NULL DEFAULT 0,
  `fieldsPreserved`   INT            NOT NULL DEFAULT 0,
  `linksEstablished`  INT            NOT NULL DEFAULT 0,
  `hardErrors`        JSON           NULL,
  `softWarnings`      JSON           NULL,
  `apiResponseMs`     INT            NULL,
  PRIMARY KEY (`id`),
  KEY `DolibarrEmployeeSyncLog_status_idx` (`status`),
  KEY `DolibarrEmployeeSyncLog_startedAt_idx` (`startedAt`),
  KEY `DolibarrEmployeeSyncLog_triggeredById_fkey` (`triggeredById`),
  CONSTRAINT `DolibarrEmployeeSyncLog_triggeredById_fkey` FOREIGN KEY (`triggeredById`) REFERENCES `User`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- SystemConfig (key/value store)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `SystemConfig` (
  `id`           CHAR(36)       NOT NULL,
  `key`          VARCHAR(120)   NOT NULL,
  `value`        TEXT           NOT NULL,
  `description`  VARCHAR(500)   NULL,
  `updatedById`  CHAR(36)       NULL,
  `updatedAt`    DATETIME(3)    NOT NULL,
  `createdAt`    DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `SystemConfig_key_key` (`key`),
  KEY `SystemConfig_key_idx` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- User — idempotent column additions for identity reconciliation
-- Cannot use `ADD COLUMN IF NOT EXISTS` (MySQL 8 rejects this syntax),
-- so we wrap each column in a stored procedure guarded on information_schema.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_hr_user_columns;
DELIMITER $$
CREATE PROCEDURE add_hr_user_columns()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'User'
      AND COLUMN_NAME = 'employeeId'
  ) THEN
    ALTER TABLE `User` ADD COLUMN `employeeId` CHAR(36) NULL;
    ALTER TABLE `User` ADD UNIQUE KEY `User_employeeId_key` (`employeeId`);
    ALTER TABLE `User`
      ADD CONSTRAINT `User_employeeId_fkey`
      FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'User'
      AND COLUMN_NAME = 'dolibarrUserId'
  ) THEN
    ALTER TABLE `User` ADD COLUMN `dolibarrUserId` INT NULL;
    ALTER TABLE `User` ADD UNIQUE KEY `User_dolibarrUserId_key` (`dolibarrUserId`);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'User'
      AND COLUMN_NAME = 'reconciledAt'
  ) THEN
    ALTER TABLE `User` ADD COLUMN `reconciledAt` DATETIME(3) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'User'
      AND COLUMN_NAME = 'reconciledById'
  ) THEN
    ALTER TABLE `User` ADD COLUMN `reconciledById` CHAR(36) NULL;
    ALTER TABLE `User`
      ADD CONSTRAINT `User_reconciledById_fkey`
      FOREIGN KEY (`reconciledById`) REFERENCES `User`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$
DELIMITER ;
CALL add_hr_user_columns();
DROP PROCEDURE IF EXISTS add_hr_user_columns;

-- ---------------------------------------------------------------------------
-- Seed: SystemConfig.identityReconciliationComplete = "false"
-- Gate flag for the Dolibarr employee sync. Flipped to "true" via the
-- reconciliation wizard (POST /api/admin/identity-reconciliation/complete)
-- after Walid has linked every OTS User to its Dolibarr llx_user counterpart.
-- ---------------------------------------------------------------------------
INSERT INTO `SystemConfig` (`id`, `key`, `value`, `description`, `updatedAt`, `createdAt`)
SELECT UUID(), 'identityReconciliationComplete', 'false',
       'Gate flag for the Dolibarr employee sync. Set to "true" once all OTS Users have been linked to their Dolibarr llx_user counterparts via the identity reconciliation wizard.',
       CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `SystemConfig` WHERE `key` = 'identityReconciliationComplete'
);
