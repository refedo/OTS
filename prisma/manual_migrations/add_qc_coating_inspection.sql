-- Migration: Add QcCoatingInspection table (HEXA-FRM-022 Coating Inspection Record / DFT)
-- Sprint 22.7.0

CREATE PROCEDURE add_qc_coating_inspection()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'QcCoatingInspection') THEN

    CREATE TABLE `QcCoatingInspection` (
      `id`               CHAR(36)       NOT NULL,
      `inspectionNumber` VARCHAR(30)    NOT NULL,
      `projectId`        CHAR(36)       NULL,
      `coatingSystem`    VARCHAR(255)   NULL,
      `coatLayer`        VARCHAR(30)    NOT NULL,
      `surfacePrep`      VARCHAR(100)   NULL,
      `ambientTemp`      DECIMAL(5, 1)  NULL,
      `relativeHumidity` DECIMAL(5, 1)  NULL,
      `dewPoint`         DECIMAL(5, 1)  NULL,
      `nominalDft`       INT            NULL,
      `minDft`           INT            NULL,
      `maxDft`           INT            NULL,
      `readings`         TEXT           NULL,
      `averageDft`       DECIMAL(8, 2)  NULL,
      `result`           VARCHAR(20)    NOT NULL DEFAULT 'CONDITIONAL',
      `inspectorId`      CHAR(36)       NULL,
      `inspectionDate`   DATETIME(3)    NULL,
      `witnessedBy`      VARCHAR(255)   NULL,
      `remarks`          TEXT           NULL,
      `attachments`      TEXT           NULL,
      `deletedAt`        DATETIME(3)    NULL,
      `deletedById`      CHAR(36)       NULL,
      `createdAt`        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`        DATETIME(3)    NOT NULL,
      `createdById`      CHAR(36)       NULL,
      PRIMARY KEY (`id`),
      UNIQUE INDEX `QcCoatingInspection_inspectionNumber_key` (`inspectionNumber`),
      INDEX `QcCoatingInspection_projectId_idx` (`projectId`),
      INDEX `QcCoatingInspection_result_idx` (`result`),
      INDEX `QcCoatingInspection_coatLayer_idx` (`coatLayer`),
      INDEX `QcCoatingInspection_deletedAt_idx` (`deletedAt`),
      CONSTRAINT `QcCoatingInspection_projectId_fkey`
        FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `QcCoatingInspection_inspectorId_fkey`
        FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `QcCoatingInspection_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  END IF;
END;

CALL add_qc_coating_inspection();
DROP PROCEDURE IF EXISTS add_qc_coating_inspection;
