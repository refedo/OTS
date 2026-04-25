-- 19.16.5: Add leaveDaysCompensated column to PayrollAdjustment
-- Supports Annual Leave Allowance, Ticket Allowance, Exit/Re-entry Visa entitlements
DROP PROCEDURE IF EXISTS add_payroll_entitlements;
DELIMITER $$
CREATE PROCEDURE add_payroll_entitlements()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'PayrollAdjustment'
      AND COLUMN_NAME = 'leaveDaysCompensated'
  ) THEN
    ALTER TABLE PayrollAdjustment ADD COLUMN leaveDaysCompensated DECIMAL(6,2) NULL;
  END IF;
END$$
DELIMITER ;
CALL add_payroll_entitlements();
DROP PROCEDURE IF EXISTS add_payroll_entitlements;
