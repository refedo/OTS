-- =============================================================================
-- Phase 4: Manpower Billing & Attendance Archive Integration
-- Adds ManpowerInvoiceDraft and ManpowerInvoiceLine tables +
-- dolibarrThirdPartyId column on Agency.
-- Idempotent — safe to run multiple times.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add dolibarrThirdPartyId to Agency (links to Dolibarr fournisseur)
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_agency_dolibarr_thirdparty_id;
DELIMITER $$
CREATE PROCEDURE add_agency_dolibarr_thirdparty_id()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Agency'
      AND COLUMN_NAME  = 'dolibarrThirdPartyId'
  ) THEN
    ALTER TABLE `Agency` ADD COLUMN `dolibarrThirdPartyId` VARCHAR(40) NULL;
  END IF;
END$$
DELIMITER ;
CALL add_agency_dolibarr_thirdparty_id();
DROP PROCEDURE IF EXISTS add_agency_dolibarr_thirdparty_id;

-- ---------------------------------------------------------------------------
-- 2. InvoiceDraftStatus enum is handled by the ENUM column definition below
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3. ManpowerInvoiceDraft table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ManpowerInvoiceDraft` (
  `id`                 CHAR(36)      NOT NULL,
  `agencyId`           CHAR(36)      NOT NULL,
  `payrollPeriodId`    CHAR(36)      NOT NULL,
  `periodStart`        DATE          NOT NULL,
  `periodEnd`          DATE          NOT NULL,
  `status`             ENUM('DRAFT','CONFIRMED','PUSHED','PAID') NOT NULL DEFAULT 'DRAFT',
  `totalHours`         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `totalAmount`        DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `dolibarrInvoiceId`  VARCHAR(40)   NULL,
  `dolibarrInvoiceRef` VARCHAR(80)   NULL,
  `pushedAt`           DATETIME(3)   NULL,
  `notes`              VARCHAR(1000) NULL,
  `createdById`        CHAR(36)      NOT NULL,
  `updatedById`        CHAR(36)      NULL,
  `createdAt`          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`          DATETIME(3)   NULL,
  `deletedById`        CHAR(36)      NULL,
  `deleteReason`       VARCHAR(500)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ManpowerInvoiceDraft_agencyId_payrollPeriodId_key` (`agencyId`, `payrollPeriodId`),
  INDEX `ManpowerInvoiceDraft_agencyId_status_idx`  (`agencyId`, `status`),
  INDEX `ManpowerInvoiceDraft_payrollPeriodId_idx`  (`payrollPeriodId`),
  INDEX `ManpowerInvoiceDraft_status_idx`           (`status`),
  INDEX `ManpowerInvoiceDraft_deletedAt_idx`        (`deletedAt`),
  CONSTRAINT `ManpowerInvoiceDraft_agencyId_fkey`
    FOREIGN KEY (`agencyId`) REFERENCES `Agency` (`id`),
  CONSTRAINT `ManpowerInvoiceDraft_payrollPeriodId_fkey`
    FOREIGN KEY (`payrollPeriodId`) REFERENCES `PayrollPeriod` (`id`),
  CONSTRAINT `ManpowerInvoiceDraft_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ManpowerInvoiceDraft_updatedById_fkey`
    FOREIGN KEY (`updatedById`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ManpowerInvoiceDraft_deletedById_fkey`
    FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. ManpowerInvoiceLine table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ManpowerInvoiceLine` (
  `id`             CHAR(36)      NOT NULL,
  `invoiceDraftId` CHAR(36)      NOT NULL,
  `manpowerSlotId` CHAR(36)      NOT NULL,
  `totalHours`     DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  `hourlyRate`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `lineTotal`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `createdAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ManpowerInvoiceLine_invoiceDraftId_idx` (`invoiceDraftId`),
  INDEX `ManpowerInvoiceLine_manpowerSlotId_idx` (`manpowerSlotId`),
  CONSTRAINT `ManpowerInvoiceLine_invoiceDraftId_fkey`
    FOREIGN KEY (`invoiceDraftId`) REFERENCES `ManpowerInvoiceDraft` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ManpowerInvoiceLine_manpowerSlotId_fkey`
    FOREIGN KEY (`manpowerSlotId`) REFERENCES `ManpowerSlot` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
