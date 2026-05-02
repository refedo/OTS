-- Migration: Add QcWelderQualification table (HEXA-FRM-017 Welder Qualification Test Record)
-- Sprint 22.7.0

CREATE PROCEDURE add_qc_welder_qualification()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'QcWelderQualification') THEN

    CREATE TABLE `QcWelderQualification` (
      `id`                  CHAR(36)     NOT NULL,
      `wqtNumber`           VARCHAR(30)  NOT NULL,
      `welderName`          VARCHAR(255) NOT NULL,
      `welderCode`          VARCHAR(100) NULL,
      `weldingProcess`      VARCHAR(30)  NOT NULL,
      `position`            VARCHAR(20)  NULL,
      `baseMaterial`        VARCHAR(255) NULL,
      `fillMaterial`        VARCHAR(255) NULL,
      `thickness`           VARCHAR(50)  NULL,
      `diameter`            VARCHAR(50)  NULL,
      `testDate`            DATETIME(3)  NULL,
      `testLocation`        VARCHAR(255) NULL,
      `inspectorId`         CHAR(36)     NULL,
      `visualResult`        VARCHAR(10)  NULL,
      `bendTestResult`      VARCHAR(10)  NULL,
      `radiographyResult`   VARCHAR(10)  NULL,
      `overallResult`       VARCHAR(20)  NOT NULL DEFAULT 'NOT_QUALIFIED',
      `qualificationRange`  TEXT         NULL,
      `certificationNumber` VARCHAR(100) NULL,
      `validFrom`           DATETIME(3)  NULL,
      `expiryDate`          DATETIME(3)  NULL,
      `renewalDate`         DATETIME(3)  NULL,
      `notes`               TEXT         NULL,
      `deletedAt`           DATETIME(3)  NULL,
      `deletedById`         CHAR(36)     NULL,
      `createdAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`           DATETIME(3)  NOT NULL,
      `createdById`         CHAR(36)     NULL,
      PRIMARY KEY (`id`),
      UNIQUE INDEX `QcWelderQualification_wqtNumber_key` (`wqtNumber`),
      INDEX `QcWelderQualification_overallResult_idx` (`overallResult`),
      INDEX `QcWelderQualification_expiryDate_idx` (`expiryDate`),
      INDEX `QcWelderQualification_weldingProcess_idx` (`weldingProcess`),
      INDEX `QcWelderQualification_deletedAt_idx` (`deletedAt`),
      CONSTRAINT `QcWelderQualification_inspectorId_fkey`
        FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `QcWelderQualification_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  END IF;
END;

CALL add_qc_welder_qualification();
DROP PROCEDURE IF EXISTS add_qc_welder_qualification;
