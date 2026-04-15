-- 18.14.0 — Contracts & Documents Management
-- Idempotent migration: CREATE TABLE IF NOT EXISTS + stored procedures for ALTER TABLE

CREATE TABLE IF NOT EXISTS `Contract` (
  `id`               CHAR(36)       NOT NULL,
  `contractNumber`   VARCHAR(30)    NOT NULL,
  `title`            VARCHAR(300)   NOT NULL,
  `type`             ENUM('HEALTH_INSURANCE','MEDICAL_INSURANCE','IQAMA','CAR_REGISTRATION','VEHICLE_LICENSE','PROFESSIONAL_LICENSE','COMMERCIAL_REGISTRATION','LEGAL_DOCUMENT','OTHER') NOT NULL,
  `employeeId`       CHAR(36)       NULL,
  `issuingAuthority` VARCHAR(200)   NULL,
  `referenceNumber`  VARCHAR(100)   NULL,
  `issueDate`        DATE           NULL,
  `expiryDate`       DATE           NULL,
  `expiryDateHijri`  VARCHAR(20)    NULL,
  `status`           ENUM('ACTIVE','EXPIRED','PENDING_RENEWAL','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `notifyDaysBefore` INT            NOT NULL DEFAULT 30,
  `description`      TEXT           NULL,
  `filePath`         VARCHAR(500)   NULL,
  `createdById`      CHAR(36)       NOT NULL,
  `updatedById`      CHAR(36)       NULL,
  `createdAt`        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)    NOT NULL,
  `deletedAt`        DATETIME(3)    NULL,
  `deletedById`      CHAR(36)       NULL,
  `deleteReason`     VARCHAR(500)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Contract_contractNumber_key` (`contractNumber`),
  KEY `Contract_type_status_idx`  (`type`, `status`),
  KEY `Contract_employeeId_idx`   (`employeeId`),
  KEY `Contract_expiryDate_idx`   (`expiryDate`),
  KEY `Contract_deletedAt_idx`    (`deletedAt`),
  CONSTRAINT `Contract_employeeId_fkey`  FOREIGN KEY (`employeeId`)  REFERENCES `Employee` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Contract_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Contract_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Contract_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Seed hr.contracts.view + hr.contracts.manage into HR and CEO roles ───────
-- Idempotent: JSON_SEARCH guard prevents duplicate entries.

DROP PROCEDURE IF EXISTS add_contracts_permissions;
DELIMITER $$
CREATE PROCEDURE add_contracts_permissions()
BEGIN
  -- HR role: view
  IF EXISTS (SELECT 1 FROM `Role` WHERE `name` = 'HR') THEN
    UPDATE `Role`
    SET `permissions` = JSON_ARRAY_APPEND(IFNULL(`permissions`, JSON_ARRAY()), '$', 'hr.contracts.view')
    WHERE `name` = 'HR'
      AND JSON_SEARCH(IFNULL(`permissions`, JSON_ARRAY()), 'one', 'hr.contracts.view') IS NULL;
    -- HR role: manage
    UPDATE `Role`
    SET `permissions` = JSON_ARRAY_APPEND(IFNULL(`permissions`, JSON_ARRAY()), '$', 'hr.contracts.manage')
    WHERE `name` = 'HR'
      AND JSON_SEARCH(IFNULL(`permissions`, JSON_ARRAY()), 'one', 'hr.contracts.manage') IS NULL;
  END IF;

  -- CEO role: view
  IF EXISTS (SELECT 1 FROM `Role` WHERE `name` = 'CEO') THEN
    UPDATE `Role`
    SET `permissions` = JSON_ARRAY_APPEND(IFNULL(`permissions`, JSON_ARRAY()), '$', 'hr.contracts.view')
    WHERE `name` = 'CEO'
      AND JSON_SEARCH(IFNULL(`permissions`, JSON_ARRAY()), 'one', 'hr.contracts.view') IS NULL;
    -- CEO role: manage
    UPDATE `Role`
    SET `permissions` = JSON_ARRAY_APPEND(IFNULL(`permissions`, JSON_ARRAY()), '$', 'hr.contracts.manage')
    WHERE `name` = 'CEO'
      AND JSON_SEARCH(IFNULL(`permissions`, JSON_ARRAY()), 'one', 'hr.contracts.manage') IS NULL;
  END IF;

  -- Admin role: view
  IF EXISTS (SELECT 1 FROM `Role` WHERE `name` = 'Admin') THEN
    UPDATE `Role`
    SET `permissions` = JSON_ARRAY_APPEND(IFNULL(`permissions`, JSON_ARRAY()), '$', 'hr.contracts.view')
    WHERE `name` = 'Admin'
      AND JSON_SEARCH(IFNULL(`permissions`, JSON_ARRAY()), 'one', 'hr.contracts.view') IS NULL;
    -- Admin role: manage
    UPDATE `Role`
    SET `permissions` = JSON_ARRAY_APPEND(IFNULL(`permissions`, JSON_ARRAY()), '$', 'hr.contracts.manage')
    WHERE `name` = 'Admin'
      AND JSON_SEARCH(IFNULL(`permissions`, JSON_ARRAY()), 'one', 'hr.contracts.manage') IS NULL;
  END IF;
END$$
DELIMITER ;
CALL add_contracts_permissions();
DROP PROCEDURE IF EXISTS add_contracts_permissions;
