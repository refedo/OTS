-- ============================================================================
-- HR Setup expansion — Division + Occupation managed lists
-- ============================================================================
-- Additions:
--   1. Employee.division (VARCHAR(80)) — new managed field, parallel to section
--   2. HrDivision table (id, name, displayOrder, archivedAt, timestamps)
--   3. HrOccupation table — same shape, replaces the free-text input with a
--      managed dropdown. Existing Employee.occupation strings are preserved
--      and seeded as initial HrOccupation rows so no data is lost.
--
-- Idempotent: guarded via information_schema + IF NOT EXISTS so re-running
-- is a no-op. Stored-procedure pattern per CLAUDE.md.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Employee.division column
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_employee_division;
DELIMITER $$
CREATE PROCEDURE add_employee_division()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Employee'
      AND COLUMN_NAME = 'division'
  ) THEN
    ALTER TABLE `Employee` ADD COLUMN `division` VARCHAR(80) NULL;
    ALTER TABLE `Employee` ADD INDEX `idx_employee_division` (`division`);
  END IF;
END$$
DELIMITER ;
CALL add_employee_division();
DROP PROCEDURE IF EXISTS add_employee_division;

-- ---------------------------------------------------------------------------
-- 2. HrDivision table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `HrDivision` (
  `id`           CHAR(36)     NOT NULL,
  `name`         VARCHAR(80)  NOT NULL,
  `displayOrder` INT          NOT NULL DEFAULT 0,
  `archivedAt`   DATETIME(3)  NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_hr_division_name` (`name`),
  KEY `idx_hr_division_archived_at` (`archivedAt`),
  KEY `idx_hr_division_display_order` (`displayOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. HrOccupation table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `HrOccupation` (
  `id`           CHAR(36)     NOT NULL,
  `name`         VARCHAR(120) NOT NULL,
  `displayOrder` INT          NOT NULL DEFAULT 0,
  `archivedAt`   DATETIME(3)  NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_hr_occupation_name` (`name`),
  KEY `idx_hr_occupation_archived_at` (`archivedAt`),
  KEY `idx_hr_occupation_display_order` (`displayOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. Seed HrOccupation from existing distinct Employee.occupation values.
--    INSERT IGNORE skips duplicates so re-running is a no-op, and any
--    rows manually added through the UI in the meantime are preserved.
--    displayOrder defaults to 0 for all seeded rows — HR can reorder
--    through /hr/setup afterwards.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `HrOccupation` (`id`, `name`, `displayOrder`, `createdAt`, `updatedAt`)
SELECT
  UUID(),
  TRIM(occupation),
  0,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `Employee`
WHERE occupation IS NOT NULL
  AND TRIM(occupation) <> ''
GROUP BY TRIM(occupation);
