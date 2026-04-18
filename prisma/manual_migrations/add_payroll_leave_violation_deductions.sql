-- 19.2.1 migration: Add absenceWithPermissionDeduction and violationDeduction
-- columns to PayrollLine. Uses the stored-procedure pattern because MySQL
-- does not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS.

DROP PROCEDURE IF EXISTS add_payroll_leave_violation_deductions;
DELIMITER $$
CREATE PROCEDURE add_payroll_leave_violation_deductions()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'PayrollLine'
      AND COLUMN_NAME = 'absenceWithPermissionDeduction'
  ) THEN
    ALTER TABLE PayrollLine ADD COLUMN absenceWithPermissionDeduction DECIMAL(12,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'PayrollLine'
      AND COLUMN_NAME = 'violationDeduction'
  ) THEN
    ALTER TABLE PayrollLine ADD COLUMN violationDeduction DECIMAL(12,2) NOT NULL DEFAULT 0;
  END IF;
END$$
DELIMITER ;
CALL add_payroll_leave_violation_deductions();
DROP PROCEDURE IF EXISTS add_payroll_leave_violation_deductions;
