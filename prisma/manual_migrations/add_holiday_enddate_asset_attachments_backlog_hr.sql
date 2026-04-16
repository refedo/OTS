-- Migration: add_holiday_enddate_asset_attachments_backlog_hr
-- Version: 18.15.0
-- Adds:
--   1. PublicHoliday.endDate (optional end date for multi-day holidays)
--   2. Asset.licenseExpiryDate (car registration/license expiry date)
--   3. Asset.attachments (JSON array of file attachments)
--   4. ProductBacklogItem.linkUrl (optional reference/external URL)
--   5. BacklogCategory enum: HR value

-- ─── 1. PublicHoliday.endDate ────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS add_holiday_enddate;
DELIMITER $$
CREATE PROCEDURE add_holiday_enddate()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'PublicHoliday'
      AND COLUMN_NAME = 'endDate'
  ) THEN
    ALTER TABLE PublicHoliday ADD COLUMN endDate DATE NULL AFTER date;
  END IF;
END$$
DELIMITER ;
CALL add_holiday_enddate();
DROP PROCEDURE IF EXISTS add_holiday_enddate;

-- ─── 2. Asset.licenseExpiryDate ──────────────────────────────────────────────

DROP PROCEDURE IF EXISTS add_asset_license_expiry;
DELIMITER $$
CREATE PROCEDURE add_asset_license_expiry()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Asset'
      AND COLUMN_NAME = 'licenseExpiryDate'
  ) THEN
    ALTER TABLE Asset ADD COLUMN licenseExpiryDate DATE NULL AFTER notes;
  END IF;
END$$
DELIMITER ;
CALL add_asset_license_expiry();
DROP PROCEDURE IF EXISTS add_asset_license_expiry;

-- ─── 3. Asset.attachments ────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS add_asset_attachments;
DELIMITER $$
CREATE PROCEDURE add_asset_attachments()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Asset'
      AND COLUMN_NAME = 'attachments'
  ) THEN
    ALTER TABLE Asset ADD COLUMN attachments JSON NULL AFTER licenseExpiryDate;
  END IF;
END$$
DELIMITER ;
CALL add_asset_attachments();
DROP PROCEDURE IF EXISTS add_asset_attachments;

-- ─── 4. ProductBacklogItem.linkUrl ───────────────────────────────────────────

DROP PROCEDURE IF EXISTS add_backlog_linkurl;
DELIMITER $$
CREATE PROCEDURE add_backlog_linkurl()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ProductBacklogItem'
      AND COLUMN_NAME = 'linkUrl'
  ) THEN
    ALTER TABLE ProductBacklogItem ADD COLUMN linkUrl VARCHAR(500) NULL AFTER complianceFlag;
  END IF;
END$$
DELIMITER ;
CALL add_backlog_linkurl();
DROP PROCEDURE IF EXISTS add_backlog_linkurl;

-- ─── 5. BacklogCategory enum: HR ─────────────────────────────────────────────
-- MySQL ENUM columns must be altered to add a new value.
-- We check if 'HR' is already present before modifying.

DROP PROCEDURE IF EXISTS add_backlog_category_hr;
DELIMITER $$
CREATE PROCEDURE add_backlog_category_hr()
BEGIN
  DECLARE col_type TEXT;
  SELECT COLUMN_TYPE INTO col_type
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ProductBacklogItem'
    AND COLUMN_NAME = 'category';

  IF col_type NOT LIKE '%''HR''%' THEN
    ALTER TABLE ProductBacklogItem
      MODIFY COLUMN category ENUM(
        'CORE_SYSTEM','PRODUCTION','DESIGN','DETAILING','PROCUREMENT',
        'QC','LOGISTICS','FINANCE','REPORTING','AI','GOVERNANCE','PROJECTS','HR'
      ) NOT NULL;
  END IF;
END$$
DELIMITER ;
CALL add_backlog_category_hr();
DROP PROCEDURE IF EXISTS add_backlog_category_hr;
