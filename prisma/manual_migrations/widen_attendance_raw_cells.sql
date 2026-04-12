-- Widen AttendanceRecord.rawCellA and rawCellP from VARCHAR(32) to TEXT.
--
-- Context: the original schema bounded the raw cell values at 32 chars,
-- assuming they would only ever hold a numeric hour count or a short
-- absence code like "AP". In practice the Overtime tab contains cells
-- such as:
--   "AP (لم تسجل لان علنظام ظهر رسالة Your leave request does not contain working day.)"
-- which is well over 32 chars. The sync then fails with
--   "The provided value for the column is too long for the column's type. Column: rawCellA"
--
-- Fix: widen both columns to TEXT. Idempotent — only runs the MODIFY if
-- the current data type is not already 'text'.

DROP PROCEDURE IF EXISTS widen_attendance_raw_cells;
DELIMITER $$
CREATE PROCEDURE widen_attendance_raw_cells()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'AttendanceRecord'
      AND COLUMN_NAME = 'rawCellA'
      AND DATA_TYPE <> 'text'
  ) THEN
    ALTER TABLE `AttendanceRecord` MODIFY COLUMN `rawCellA` TEXT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'AttendanceRecord'
      AND COLUMN_NAME = 'rawCellP'
      AND DATA_TYPE <> 'text'
  ) THEN
    ALTER TABLE `AttendanceRecord` MODIFY COLUMN `rawCellP` TEXT NULL;
  END IF;
END$$
DELIMITER ;

CALL widen_attendance_raw_cells();
DROP PROCEDURE IF EXISTS widen_attendance_raw_cells;
