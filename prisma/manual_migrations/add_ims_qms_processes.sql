-- Migration: Add ImsQmsProcess table (HEXA-FRM-002/004 Master List of QMS Processes)
-- Sprint 22.7.0

DROP PROCEDURE IF EXISTS add_ims_qms_processes;
DELIMITER $$
CREATE PROCEDURE add_ims_qms_processes()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsQmsProcess') THEN

    CREATE TABLE `ImsQmsProcess` (
      `id`                     CHAR(36)     NOT NULL,
      `processNumber`          VARCHAR(20)  NOT NULL,
      `name`                   VARCHAR(255) NOT NULL,
      `processOwner`           VARCHAR(255) NULL,
      `ownerId`                CHAR(36)     NULL,
      `processType`            VARCHAR(30)  NOT NULL DEFAULT 'CORE',
      `inputs`                 TEXT         NULL,
      `outputs`                TEXT         NULL,
      `kpis`                   TEXT         NULL,
      `relatedDocumentNumbers` TEXT         NULL,
      `isoClause`              VARCHAR(50)  NULL,
      `status`                 VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
      `notes`                  TEXT         NULL,
      `deletedAt`              DATETIME(3)  NULL,
      `deletedById`            CHAR(36)     NULL,
      `createdAt`              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`              DATETIME(3)  NOT NULL,
      `createdById`            CHAR(36)     NULL,
      PRIMARY KEY (`id`),
      UNIQUE INDEX `ImsQmsProcess_processNumber_key` (`processNumber`),
      INDEX `ImsQmsProcess_processType_idx` (`processType`),
      INDEX `ImsQmsProcess_status_idx` (`status`),
      INDEX `ImsQmsProcess_deletedAt_idx` (`deletedAt`),
      CONSTRAINT `ImsQmsProcess_ownerId_fkey`
        FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `ImsQmsProcess_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  END IF;
END$$
DELIMITER ;

CALL add_ims_qms_processes();
DROP PROCEDURE IF EXISTS add_ims_qms_processes;
