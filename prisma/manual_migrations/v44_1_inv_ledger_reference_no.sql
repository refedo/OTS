-- v44_1: Add reference_no to inv_stock_ledger

DROP PROCEDURE IF EXISTS _v44_reference_no;
DELIMITER $$
CREATE PROCEDURE _v44_reference_no()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_stock_ledger'
      AND COLUMN_NAME  = 'referenceNo'
  ) THEN
    ALTER TABLE inv_stock_ledger
      ADD COLUMN referenceNo VARCHAR(50) NULL AFTER referenceId;
  END IF;
END$$
DELIMITER ;
CALL _v44_reference_no();
DROP PROCEDURE IF EXISTS _v44_reference_no;
