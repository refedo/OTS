-- ============================================================
-- Add CANCELLED to HrLetterStatus enum
-- Safe to re-run: checks information_schema before altering
-- ============================================================

DROP PROCEDURE IF EXISTS add_letter_cancelled_status;
DELIMITER $$
CREATE PROCEDURE add_letter_cancelled_status()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'HrLetter'
      AND COLUMN_NAME  = 'status'
      AND COLUMN_TYPE LIKE '%cancelled%'
  ) THEN
    ALTER TABLE `HrLetter`
      MODIFY COLUMN `status`
        ENUM('DRAFT','PENDING_CEO','APPROVED','REJECTED','CANCELLED')
        NOT NULL DEFAULT 'PENDING_CEO';
  END IF;
END$$
DELIMITER ;

CALL add_letter_cancelled_status();
DROP PROCEDURE IF EXISTS add_letter_cancelled_status;
