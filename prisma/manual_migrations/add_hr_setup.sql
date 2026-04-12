-- ============================================================================
-- HR Setup — configurable section list + Department.archivedAt
-- ============================================================================
-- Additions:
--   1. Department.archivedAt (DATETIME) — soft archive for dropdown hiding
--   2. HrSection table (id, name, displayOrder, archivedAt, timestamps)
--   3. Seed the three legacy sections (Preparation / Fabrication / Other) so
--      existing Employee.section values keep matching after the dropdown
--      starts fetching from the table.
--
-- Idempotent: guarded via information_schema so re-running is a no-op.
-- Stored-procedure pattern per CLAUDE.md (MySQL rejects ADD COLUMN IF NOT EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Department.archivedAt
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_hr_setup_department_archived;
DELIMITER $$
CREATE PROCEDURE add_hr_setup_department_archived()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Department'
      AND COLUMN_NAME = 'archivedAt'
  ) THEN
    ALTER TABLE `Department` ADD COLUMN `archivedAt` DATETIME(3) NULL;
    ALTER TABLE `Department` ADD INDEX `idx_department_archived_at` (`archivedAt`);
  END IF;
END$$
DELIMITER ;
CALL add_hr_setup_department_archived();
DROP PROCEDURE IF EXISTS add_hr_setup_department_archived;

-- ---------------------------------------------------------------------------
-- 2. HrSection table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `HrSection` (
  `id`           CHAR(36)     NOT NULL,
  `name`         VARCHAR(60)  NOT NULL,
  `displayOrder` INT          NOT NULL DEFAULT 0,
  `archivedAt`   DATETIME(3)  NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_hr_section_name` (`name`),
  KEY `idx_hr_section_archived_at` (`archivedAt`),
  KEY `idx_hr_section_display_order` (`displayOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. Seed the legacy sections — INSERT IGNORE so re-runs are harmless and
--    any manual edits the HR team has made are preserved.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `HrSection` (`id`, `name`, `displayOrder`, `createdAt`, `updatedAt`)
VALUES
  (UUID(), 'Preparation', 10, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (UUID(), 'Fabrication', 20, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (UUID(), 'Other',       30, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
