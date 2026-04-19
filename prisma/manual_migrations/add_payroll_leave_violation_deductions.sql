-- 19.3.0 migration: Add absenceWithPermissionDeduction and violationDeduction
-- columns to PayrollLine.
--
-- Uses bare ALTER TABLE (no stored procedure) because this MySQL instance
-- rejects CREATE PROCEDURE via the prepared statement protocol (error 1295).
-- If the columns already exist the ALTER will fail with "Duplicate column name"
-- which the startup migration runner logs as a non-fatal warning and skips.

ALTER TABLE `PayrollLine`
  ADD COLUMN `absenceWithPermissionDeduction` DECIMAL(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE `PayrollLine`
  ADD COLUMN `violationDeduction` DECIMAL(12,2) NOT NULL DEFAULT 0.00;
