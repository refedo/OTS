-- v40_0: Add target_site_id to MIR receipts + default_wh_type to material master
-- target_site_id lets operators explicitly choose which factory receives the delivery.
-- default_wh_type stores the preferred warehouse type per product in dolibarr_products.

-- ── material_inspection_receipts.target_site_id ──────────────────────────────

DROP PROCEDURE IF EXISTS _v40_mir_target_site;
DELIMITER $$
CREATE PROCEDURE _v40_mir_target_site()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'material_inspection_receipts'
      AND COLUMN_NAME  = 'target_site_id'
  ) THEN
    ALTER TABLE material_inspection_receipts
      ADD COLUMN target_site_id VARCHAR(10) NULL AFTER dolibarr_po_ref;
  END IF;
END$$
DELIMITER ;
CALL _v40_mir_target_site();
DROP PROCEDURE IF EXISTS _v40_mir_target_site;

-- ── dolibarr_products.default_wh_type ────────────────────────────────────────

DROP PROCEDURE IF EXISTS _v40_dp_default_wh_type;
DELIMITER $$
CREATE PROCEDURE _v40_dp_default_wh_type()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'default_wh_type'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN default_wh_type ENUM('RAW_MATERIAL','CONSUMABLE','OFFCUT') NULL AFTER material_category;
  END IF;
END$$
DELIMITER ;
CALL _v40_dp_default_wh_type();
DROP PROCEDURE IF EXISTS _v40_dp_default_wh_type;

-- Backfill default_wh_type from existing item_class / material_nature
UPDATE dolibarr_products
SET default_wh_type = CASE
  WHEN item_class = 'CONSUMABLE' OR material_nature = 'CONSUMABLE' THEN 'CONSUMABLE'
  WHEN item_class IS NOT NULL AND item_class != 'UNKNOWN'          THEN 'RAW_MATERIAL'
  ELSE NULL
END
WHERE default_wh_type IS NULL;
