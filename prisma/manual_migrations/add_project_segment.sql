-- Concentration Risk: additive migration — ProjectSegment table + segmentId on Project
-- Uses conditional stored procedure pattern (no IF NOT EXISTS on ALTER TABLE ADD COLUMN)

DROP PROCEDURE IF EXISTS add_project_segment;
DELIMITER $$
CREATE PROCEDURE add_project_segment()
BEGIN
  -- Create ProjectSegment table if it does not exist
  CREATE TABLE IF NOT EXISTS `ProjectSegment` (
    `id`          VARCHAR(36)  NOT NULL,
    `name`        VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive`    TINYINT(1)   NOT NULL DEFAULT 1,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)  NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ProjectSegment_name_key` (`name`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- Add segmentId column to Project if it does not already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Project'
      AND COLUMN_NAME  = 'segmentId'
  ) THEN
    ALTER TABLE `Project` ADD COLUMN `segmentId` CHAR(36) NULL;
    ALTER TABLE `Project` ADD INDEX `Project_segmentId_idx` (`segmentId`);
    ALTER TABLE `Project`
      ADD CONSTRAINT `Project_segmentId_fkey`
      FOREIGN KEY (`segmentId`) REFERENCES `ProjectSegment`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- Seed default segments used by Hexa Steel
  INSERT IGNORE INTO `ProjectSegment` (`id`, `name`, `description`, `isActive`, `createdAt`, `updatedAt`) VALUES
    (UUID(), 'Warehouses',       'Warehouse structures',             1, NOW(), NOW()),
    (UUID(), 'Factories',        'Industrial factory buildings',     1, NOW(), NOW()),
    (UUID(), 'Poultry Farms',    'Poultry farming facilities',       1, NOW(), NOW()),
    (UUID(), 'Commercial',       'Commercial and retail buildings',  1, NOW(), NOW()),
    (UUID(), 'Industrial',       'General industrial structures',    1, NOW(), NOW()),
    (UUID(), 'Oil & Gas',        'Oil and gas sector projects',      1, NOW(), NOW()),
    (UUID(), 'Other',            'Other / uncategorised',            1, NOW(), NOW());
END$$
DELIMITER ;

CALL add_project_segment();
DROP PROCEDURE IF EXISTS add_project_segment;
