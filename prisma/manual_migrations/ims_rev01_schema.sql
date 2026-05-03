-- IMS Rev.01 Schema Migration (22.9.0)
-- Hexa-ISM-001 Rev.01 updates:
--   • ImsRisk: residualLikelihood, residualSeverity
--   • ImsManagementReview: steel-specific input fields + additionalItems
--   • ImsDocument: domain field (SYSTEM|OPERATIONS|HSE|TECHNICAL)
--   • SystemSettings: logoWhite field

SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci';

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. ImsRisk — residual rating fields
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS migrate_ims_risk_residual;
DELIMITER $$
CREATE PROCEDURE migrate_ims_risk_residual()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ImsRisk'
      AND COLUMN_NAME  = 'residualLikelihood'
  ) THEN
    ALTER TABLE ImsRisk ADD COLUMN residualLikelihood INT NULL AFTER currentRiskRating;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ImsRisk'
      AND COLUMN_NAME  = 'residualSeverity'
  ) THEN
    ALTER TABLE ImsRisk ADD COLUMN residualSeverity INT NULL AFTER residualLikelihood;
  END IF;
END$$
DELIMITER ;
CALL migrate_ims_risk_residual();
DROP PROCEDURE IF EXISTS migrate_ims_risk_residual;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ImsManagementReview — steel-specific fields + additional Q&A
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS migrate_mgmt_review_fields;
DELIMITER $$
CREATE PROCEDURE migrate_mgmt_review_fields()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ImsManagementReview'
      AND COLUMN_NAME  = 'inputSalesOrderIntake'
  ) THEN
    ALTER TABLE ImsManagementReview ADD COLUMN inputSalesOrderIntake LONGTEXT NULL AFTER inputEnvironmentalPerf;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ImsManagementReview'
      AND COLUMN_NAME  = 'inputProjectDelivery'
  ) THEN
    ALTER TABLE ImsManagementReview ADD COLUMN inputProjectDelivery LONGTEXT NULL AFTER inputSalesOrderIntake;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ImsManagementReview'
      AND COLUMN_NAME  = 'inputProductionTonnage'
  ) THEN
    ALTER TABLE ImsManagementReview ADD COLUMN inputProductionTonnage LONGTEXT NULL AFTER inputProjectDelivery;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ImsManagementReview'
      AND COLUMN_NAME  = 'inputProcurementDelays'
  ) THEN
    ALTER TABLE ImsManagementReview ADD COLUMN inputProcurementDelays LONGTEXT NULL AFTER inputProductionTonnage;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ImsManagementReview'
      AND COLUMN_NAME  = 'inputRisksOpportunities'
  ) THEN
    ALTER TABLE ImsManagementReview ADD COLUMN inputRisksOpportunities LONGTEXT NULL AFTER inputProcurementDelays;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ImsManagementReview'
      AND COLUMN_NAME  = 'inputAdditionalItems'
  ) THEN
    ALTER TABLE ImsManagementReview ADD COLUMN inputAdditionalItems JSON NULL AFTER inputRisksOpportunities;
  END IF;
END$$
DELIMITER ;
CALL migrate_mgmt_review_fields();
DROP PROCEDURE IF EXISTS migrate_mgmt_review_fields;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. ImsDocument — domain field for ISP categorisation
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS migrate_ims_document_domain;
DELIMITER $$
CREATE PROCEDURE migrate_ims_document_domain()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ImsDocument'
      AND COLUMN_NAME  = 'domain'
  ) THEN
    ALTER TABLE ImsDocument ADD COLUMN domain VARCHAR(30) NULL AFTER issuedAt;
  END IF;
END$$
DELIMITER ;
CALL migrate_ims_document_domain();
DROP PROCEDURE IF EXISTS migrate_ims_document_domain;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. SystemSettings — logoWhite for dark background PDF headers
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS migrate_settings_logo_white;
DELIMITER $$
CREATE PROCEDURE migrate_settings_logo_white()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'system_settings'
      AND COLUMN_NAME  = 'logoWhite'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN logoWhite VARCHAR(500) NULL AFTER companyLogo;
  END IF;
END$$
DELIMITER ;
CALL migrate_settings_logo_white();
DROP PROCEDURE IF EXISTS migrate_settings_logo_white;
