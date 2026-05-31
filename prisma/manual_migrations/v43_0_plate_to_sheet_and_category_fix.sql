-- v43_0_plate_to_sheet_and_category_fix.sql
-- Renames PLATE → SHEET in inv_items.category enum,
-- updates dolibarr_products.material_category PLATE → SHEET,
-- and backfills inv_items.category from dolibarr_products for all items
-- that still have category = 'OTHER' but have a matched dolibarr product.

-- ── Step 1: Add SHEET to enum (only if not already present) ───────────────
DROP PROCEDURE IF EXISTS _v43_add_sheet_enum;
DELIMITER $$
CREATE PROCEDURE _v43_add_sheet_enum()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_items'
      AND COLUMN_NAME  = 'category'
      AND COLUMN_TYPE  LIKE "%'SHEET'%"
  ) THEN
    ALTER TABLE inv_items MODIFY COLUMN category
      ENUM('STRUCTURAL_STEEL','SHEET','PLATE','PIPE','CONSUMABLE','FASTENER','PAINT','ELECTRICAL','OFFCUT','OTHER') NOT NULL;
  END IF;
END$$
DELIMITER ;
CALL _v43_add_sheet_enum();
DROP PROCEDURE IF EXISTS _v43_add_sheet_enum;

-- ── Step 2: Migrate PLATE data → SHEET ────────────────────────────────────
UPDATE inv_items SET category = 'SHEET' WHERE category = 'PLATE';

-- ── Step 3: Remove PLATE from enum (safe now that no rows have PLATE) ─────
DROP PROCEDURE IF EXISTS _v43_remove_plate_enum;
DELIMITER $$
CREATE PROCEDURE _v43_remove_plate_enum()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_items'
      AND COLUMN_NAME  = 'category'
      AND COLUMN_TYPE  LIKE "%'PLATE'%"
  ) THEN
    ALTER TABLE inv_items MODIFY COLUMN category
      ENUM('STRUCTURAL_STEEL','SHEET','PIPE','CONSUMABLE','FASTENER','PAINT','ELECTRICAL','OFFCUT','OTHER') NOT NULL;
  END IF;
END$$
DELIMITER ;
CALL _v43_remove_plate_enum();
DROP PROCEDURE IF EXISTS _v43_remove_plate_enum;

-- ── Step 4: Update dolibarr_products PLATE → SHEET ────────────────────────
UPDATE dolibarr_products SET material_category = 'SHEET' WHERE material_category = 'PLATE';

-- ── Step 5: Backfill inv_items.category from dolibarr_products ────────────
-- Maps the rich dolibarr material_category to the simpler InvItemCategory enum.
-- Only updates items that have a dolibarr_id link and are not deleted.
DROP PROCEDURE IF EXISTS _v43_backfill_item_categories;
DELIMITER $$
CREATE PROCEDURE _v43_backfill_item_categories()
BEGIN
  UPDATE inv_items i
  INNER JOIN dolibarr_products dp ON dp.dolibarr_id = i.dolibarr_id
  SET i.category = CASE dp.material_category
    WHEN 'SHEET'             THEN 'SHEET'
    WHEN 'PIPE'              THEN 'PIPE'
    WHEN 'PROFILE_H'         THEN 'STRUCTURAL_STEEL'
    WHEN 'PROFILE_I'         THEN 'STRUCTURAL_STEEL'
    WHEN 'PROFILE_HEA'       THEN 'STRUCTURAL_STEEL'
    WHEN 'PROFILE_HEB'       THEN 'STRUCTURAL_STEEL'
    WHEN 'PROFILE_IPE'       THEN 'STRUCTURAL_STEEL'
    WHEN 'PROFILE_C'         THEN 'STRUCTURAL_STEEL'
    WHEN 'PROFILE_ANGLE'     THEN 'STRUCTURAL_STEEL'
    WHEN 'FLAT_BAR'          THEN 'STRUCTURAL_STEEL'
    WHEN 'ROUND_BAR'         THEN 'STRUCTURAL_STEEL'
    WHEN 'BOLT'              THEN 'FASTENER'
    WHEN 'NUT'               THEN 'FASTENER'
    WHEN 'WELDING_ELECTRODE' THEN 'CONSUMABLE'
    WHEN 'WELDING_WIRE_FLUX' THEN 'CONSUMABLE'
    WHEN 'WELDING_PPE'       THEN 'CONSUMABLE'
    WHEN 'GAS_CYLINDER'      THEN 'CONSUMABLE'
    WHEN 'PAINT'             THEN 'PAINT'
    ELSE 'OTHER'
  END
  WHERE i.dolibarr_id IS NOT NULL
    AND i.deletedAt IS NULL
    AND dp.material_category IS NOT NULL
    AND dp.material_category != '';
END$$
DELIMITER ;
CALL _v43_backfill_item_categories();
DROP PROCEDURE IF EXISTS _v43_backfill_item_categories;
