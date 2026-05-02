-- Migration: Add ScApprovedSupplier table (HEXA-FRM-003 Approved Supplier List)
-- Sprint 22.7.0

DROP PROCEDURE IF EXISTS add_sc_approved_suppliers;
DELIMITER $$
CREATE PROCEDURE add_sc_approved_suppliers()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ScApprovedSupplier') THEN

    CREATE TABLE `ScApprovedSupplier` (
      `id`                 CHAR(36)     NOT NULL,
      `supplierCode`       VARCHAR(20)  NOT NULL,
      `name`               VARCHAR(255) NOT NULL,
      `category`           VARCHAR(100) NULL,
      `scopeOfApproval`    TEXT         NULL,
      `approvalStatus`     VARCHAR(20)  NOT NULL DEFAULT 'APPROVED',
      `approvalDate`       DATETIME(3)  NULL,
      `expiryDate`         DATETIME(3)  NULL,
      `lastAuditDate`      DATETIME(3)  NULL,
      `auditFrequencyDays` INT          NULL,
      `rating`             VARCHAR(10)  NULL,
      `notes`              TEXT         NULL,
      `deletedAt`          DATETIME(3)  NULL,
      `deletedById`        CHAR(36)     NULL,
      `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`          DATETIME(3)  NOT NULL,
      `createdById`        CHAR(36)     NULL,
      PRIMARY KEY (`id`),
      UNIQUE INDEX `ScApprovedSupplier_supplierCode_key` (`supplierCode`),
      INDEX `ScApprovedSupplier_approvalStatus_idx` (`approvalStatus`),
      INDEX `ScApprovedSupplier_deletedAt_idx` (`deletedAt`),
      CONSTRAINT `ScApprovedSupplier_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  END IF;
END$$
DELIMITER ;

CALL add_sc_approved_suppliers();
DROP PROCEDURE IF EXISTS add_sc_approved_suppliers;
