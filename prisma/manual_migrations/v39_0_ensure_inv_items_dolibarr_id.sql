-- v39_0_ensure_inv_items_dolibarr_id.sql
-- Re-ensures dolibarr_id column and index on inv_items.
-- v38_0 migration may have been tracked as applied on production before
-- the statements executed (silent failure), leaving the column absent.

DROP PROCEDURE IF EXISTS _v39_inv_dolibarr_id;
DELIMITER $$
CREATE PROCEDURE _v39_inv_dolibarr_id()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_items'
      AND COLUMN_NAME  = 'dolibarr_id'
  ) THEN
    ALTER TABLE inv_items
      ADD COLUMN dolibarr_id INT NULL;
  END IF;
END$$
DELIMITER ;
CALL _v39_inv_dolibarr_id();
DROP PROCEDURE IF EXISTS _v39_inv_dolibarr_id;

DROP PROCEDURE IF EXISTS _v39_idx_inv_dolibarr_id;
DELIMITER $$
CREATE PROCEDURE _v39_idx_inv_dolibarr_id()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_items'
      AND INDEX_NAME   = 'idx_inv_items_dolibarr_id'
  ) THEN
    ALTER TABLE inv_items ADD INDEX idx_inv_items_dolibarr_id (dolibarr_id);
  END IF;
END$$
DELIMITER ;
CALL _v39_idx_inv_dolibarr_id();
DROP PROCEDURE IF EXISTS _v39_idx_inv_dolibarr_id;
