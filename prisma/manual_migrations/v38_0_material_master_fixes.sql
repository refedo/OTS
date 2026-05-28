-- v38_0_material_master_fixes.sql
-- 1. Fix reviewed_by column type in dolibarr_products (INT → CHAR(36) for OTS UUID users)
-- 2. Add dolibarr_id to inv_items for bidirectional linking

DROP PROCEDURE IF EXISTS _mm_fix_reviewed_by;
DELIMITER $$
CREATE PROCEDURE _mm_fix_reviewed_by()
BEGIN
  DECLARE col_type VARCHAR(64);
  SELECT DATA_TYPE INTO col_type
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'dolibarr_products'
    AND COLUMN_NAME  = 'reviewed_by';

  IF col_type = 'int' THEN
    ALTER TABLE dolibarr_products
      MODIFY COLUMN reviewed_by CHAR(36) NULL;
  END IF;
END$$
DELIMITER ;
CALL _mm_fix_reviewed_by();
DROP PROCEDURE IF EXISTS _mm_fix_reviewed_by;

-- Add dolibarr_id to inv_items (for linking OTS items back to material master)
DROP PROCEDURE IF EXISTS _mm_inv_dolibarr_id;
DELIMITER $$
CREATE PROCEDURE _mm_inv_dolibarr_id()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_items'
      AND COLUMN_NAME  = 'dolibarr_id'
  ) THEN
    ALTER TABLE inv_items
      ADD COLUMN dolibarr_id INT NULL AFTER is_active;
  END IF;
END$$
DELIMITER ;
CALL _mm_inv_dolibarr_id();
DROP PROCEDURE IF EXISTS _mm_inv_dolibarr_id;

DROP PROCEDURE IF EXISTS _mm_idx_inv_dolibarr_id;
DELIMITER $$
CREATE PROCEDURE _mm_idx_inv_dolibarr_id()
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
CALL _mm_idx_inv_dolibarr_id();
DROP PROCEDURE IF EXISTS _mm_idx_inv_dolibarr_id;
