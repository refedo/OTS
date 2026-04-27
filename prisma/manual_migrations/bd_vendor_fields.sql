-- ─────────────────────────────────────────────────────────────────────────
-- BD vendor fields (v21.2.0)
-- Adds: vendorId, portalUsername, portalPassword, registrationChannel,
--       channelOther to BdCompany.
-- Uses stored-procedure pattern for idempotency.
-- ─────────────────────────────────────────────────────────────────────────

DELIMITER $$

CREATE PROCEDURE __bd_add_vendor_fields()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BdCompany' AND COLUMN_NAME = 'vendorId'
  ) THEN
    ALTER TABLE `BdCompany` ADD COLUMN `vendorId` VARCHAR(100) DEFAULT NULL AFTER `name`;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BdCompany' AND COLUMN_NAME = 'portalUsername'
  ) THEN
    ALTER TABLE `BdCompany` ADD COLUMN `portalUsername` VARCHAR(255) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BdCompany' AND COLUMN_NAME = 'portalPassword'
  ) THEN
    ALTER TABLE `BdCompany` ADD COLUMN `portalPassword` VARCHAR(512) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BdCompany' AND COLUMN_NAME = 'registrationChannel'
  ) THEN
    ALTER TABLE `BdCompany` ADD COLUMN `registrationChannel` VARCHAR(50) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BdCompany' AND COLUMN_NAME = 'channelOther'
  ) THEN
    ALTER TABLE `BdCompany` ADD COLUMN `channelOther` VARCHAR(255) DEFAULT NULL;
  END IF;
END$$

CALL __bd_add_vendor_fields()$$
DROP PROCEDURE IF EXISTS __bd_add_vendor_fields$$

DELIMITER ;
