-- Add sourceCodes to inv_sites for MIR siteId alias mapping

DROP PROCEDURE IF EXISTS _v42_site_source_codes;
DELIMITER $$
CREATE PROCEDURE _v42_site_source_codes()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_sites'
      AND COLUMN_NAME  = 'sourceCodes'
  ) THEN
    ALTER TABLE inv_sites
      ADD COLUMN sourceCodes VARCHAR(500) NULL AFTER description;
  END IF;
END$$
DELIMITER ;
CALL _v42_site_source_codes();
DROP PROCEDURE IF EXISTS _v42_site_source_codes;
