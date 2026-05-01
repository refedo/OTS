-- 22.2.0 — Gap 4: Calibration Register — Asset model extension (ISO 9001 §7.1.5)

DROP PROCEDURE IF EXISTS add_asset_calibration_fields;
DELIMITER $$
CREATE PROCEDURE add_asset_calibration_fields()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Asset' AND COLUMN_NAME = 'calibrationRequired'
  ) THEN
    ALTER TABLE `Asset`
      ADD COLUMN `calibrationRequired`  TINYINT(1)   NOT NULL DEFAULT 0,
      ADD COLUMN `calibrationFrequency` VARCHAR(50)  NULL,
      ADD COLUMN `lastCalibratedAt`     DATETIME(3)  NULL,
      ADD COLUMN `calibrationDueAt`     DATETIME(3)  NULL,
      ADD COLUMN `calibrationCertRef`   VARCHAR(255) NULL,
      ADD COLUMN `calibrationBody`      VARCHAR(255) NULL,
      ADD COLUMN `calibrationStatus`    VARCHAR(20)  NULL;
  END IF;
END$$
DELIMITER ;
CALL add_asset_calibration_fields();
DROP PROCEDURE IF EXISTS add_asset_calibration_fields;

-- ── Index on calibration fields ───────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_asset_calibration_index;
DELIMITER $$
CREATE PROCEDURE add_asset_calibration_index()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Asset'
      AND INDEX_NAME = 'Asset_calibrationRequired_idx'
  ) THEN
    ALTER TABLE `Asset`
      ADD INDEX `Asset_calibrationRequired_idx` (`calibrationRequired`),
      ADD INDEX `Asset_calibrationDueAt_idx`    (`calibrationDueAt`),
      ADD INDEX `Asset_calibrationStatus_idx`   (`calibrationStatus`);
  END IF;
END$$
DELIMITER ;
CALL add_asset_calibration_index();
DROP PROCEDURE IF EXISTS add_asset_calibration_index;

-- ── Seed 20 calibration-required measuring equipment records ──────────────────
-- This seeds calibration metadata on existing assets matching HX-TOR-*, HX-CAL-*, HX-TIS-* patterns.
-- If those assets don't yet exist, this is a no-op (safe to run multiple times).
DROP PROCEDURE IF EXISTS seed_asset_calibration;
DELIMITER $$
CREATE PROCEDURE seed_asset_calibration()
BEGIN
  DECLARE v_next_due DATETIME(3);
  SET v_next_due = DATE_ADD(NOW(), INTERVAL 1 YEAR);

  -- Mark torque wrenches as calibration-required (Annual)
  UPDATE `Asset`
    SET
      `calibrationRequired`  = 1,
      `calibrationFrequency` = 'Annual',
      `calibrationStatus`    = 'CURRENT',
      `calibrationDueAt`     = v_next_due,
      `calibrationBody`      = 'SASO-accredited lab'
  WHERE `assetCode` LIKE 'HX-TOR-%'
    AND `calibrationRequired` = 0;

  -- Mark calipers as calibration-required (Annual)
  UPDATE `Asset`
    SET
      `calibrationRequired`  = 1,
      `calibrationFrequency` = 'Annual',
      `calibrationStatus`    = 'CURRENT',
      `calibrationDueAt`     = v_next_due,
      `calibrationBody`      = 'SASO-accredited lab'
  WHERE `assetCode` LIKE 'HX-CAL-%'
    AND `calibrationRequired` = 0;

  -- Mark TIS (Testing & Inspection) equipment as calibration-required (Annual)
  UPDATE `Asset`
    SET
      `calibrationRequired`  = 1,
      `calibrationFrequency` = 'Annual',
      `calibrationStatus`    = 'CURRENT',
      `calibrationDueAt`     = v_next_due,
      `calibrationBody`      = 'SASO-accredited lab'
  WHERE `assetCode` LIKE 'HX-TIS-%'
    AND `calibrationRequired` = 0;

  -- Mark measuring tape assets as calibration-required (Annual)
  UPDATE `Asset`
    SET
      `calibrationRequired`  = 1,
      `calibrationFrequency` = 'Annual',
      `calibrationStatus`    = 'CURRENT',
      `calibrationDueAt`     = v_next_due,
      `calibrationBody`      = 'In-house'
  WHERE (`name` LIKE '%tape measure%' OR `name` LIKE '%measuring tape%')
    AND `calibrationRequired` = 0;

  -- Mark magnetic drills with measurement capability as semi-annual
  UPDATE `Asset`
    SET
      `calibrationRequired`  = 1,
      `calibrationFrequency` = '6 months',
      `calibrationStatus`    = 'CURRENT',
      `calibrationDueAt`     = DATE_ADD(NOW(), INTERVAL 6 MONTH),
      `calibrationBody`      = 'In-house'
  WHERE (`name` LIKE '%magnetic drill%' OR `assetCode` LIKE 'HX-MDR-%')
    AND `calibrationRequired` = 0;
END$$
DELIMITER ;
CALL seed_asset_calibration();
DROP PROCEDURE IF EXISTS seed_asset_calibration;
