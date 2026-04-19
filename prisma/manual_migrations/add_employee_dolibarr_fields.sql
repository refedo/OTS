-- 19.5.0 — Add extended Dolibarr extrafields to Employee table.
-- These columns mirror the custom extrafields configured in Dolibarr
-- (erp/user/admin/user_extrafields.php) so the employee sync can populate them.
-- Idempotent: each column is guarded by an information_schema check.

DROP PROCEDURE IF EXISTS add_employee_dolibarr_fields;
DELIMITER $$
CREATE PROCEDURE add_employee_dolibarr_fields()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'employeeNo'
  ) THEN
    ALTER TABLE Employee ADD COLUMN employeeNo VARCHAR(20) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'boarderNumber'
  ) THEN
    ALTER TABLE Employee ADD COLUMN boarderNumber VARCHAR(255) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'maritalStatus'
  ) THEN
    ALTER TABLE Employee ADD COLUMN maritalStatus VARCHAR(50) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'occupationAr'
  ) THEN
    ALTER TABLE Employee ADD COLUMN occupationAr VARCHAR(100) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'gosiSubscriptionNo'
  ) THEN
    ALTER TABLE Employee ADD COLUMN gosiSubscriptionNo VARCHAR(100) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'contractEndDate'
  ) THEN
    ALTER TABLE Employee ADD COLUMN contractEndDate DATE NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'contractDuration'
  ) THEN
    ALTER TABLE Employee ADD COLUMN contractDuration VARCHAR(100) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'passportNumber'
  ) THEN
    ALTER TABLE Employee ADD COLUMN passportNumber VARCHAR(100) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'iqamaUrl'
  ) THEN
    ALTER TABLE Employee ADD COLUMN iqamaUrl VARCHAR(255) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'passportUrl'
  ) THEN
    ALTER TABLE Employee ADD COLUMN passportUrl VARCHAR(255) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'sponsorNumber'
  ) THEN
    ALTER TABLE Employee ADD COLUMN sponsorNumber VARCHAR(30) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'contractType'
  ) THEN
    ALTER TABLE Employee ADD COLUMN contractType VARCHAR(100) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'workingLocation'
  ) THEN
    ALTER TABLE Employee ADD COLUMN workingLocation VARCHAR(100) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employee' AND COLUMN_NAME = 'transferType'
  ) THEN
    ALTER TABLE Employee ADD COLUMN transferType VARCHAR(100) NULL;
  END IF;
END$$
DELIMITER ;
CALL add_employee_dolibarr_fields();
DROP PROCEDURE IF EXISTS add_employee_dolibarr_fields;
