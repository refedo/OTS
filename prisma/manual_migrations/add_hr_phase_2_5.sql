-- ============================================================================
-- HR Phase 2.5 — Occupation / Section / Department + Mapping Candidates
-- ============================================================================
-- Additions:
--   1. Employee.occupation (VARCHAR(120)) + Employee.section (VARCHAR(60))
--   2. GoogleSheetAttendanceSyncLog counter columns
--      (occupationsUpdated, sectionsUpdated, departmentsUpdated,
--       preservedFieldSkips, candidatesCreated, candidatesResolved,
--       candidatesIgnored)
--   3. AttendanceMappingCandidate table + AttendanceMappingStatus ENUM
--
-- Idempotent: every ALTER is guarded via information_schema so re-running is
-- a no-op (per CLAUDE.md — MySQL rejects ADD COLUMN IF NOT EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Employee.occupation + Employee.section + Employee.departmentId (FK)
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_hr_phase_2_5_employee;
DELIMITER $$
CREATE PROCEDURE add_hr_phase_2_5_employee()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Employee'
      AND COLUMN_NAME = 'occupation'
  ) THEN
    ALTER TABLE `Employee` ADD COLUMN `occupation` VARCHAR(120) NULL;
    ALTER TABLE `Employee` ADD INDEX `idx_employee_occupation` (`occupation`);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Employee'
      AND COLUMN_NAME = 'section'
  ) THEN
    ALTER TABLE `Employee` ADD COLUMN `section` VARCHAR(60) NULL;
    ALTER TABLE `Employee` ADD INDEX `idx_employee_section` (`section`);
  END IF;

  -- departmentId FK → Department.id. The legacy free-text `department`
  -- column is kept for audit of Dolibarr's `options_department` extrafield.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Employee'
      AND COLUMN_NAME = 'departmentId'
  ) THEN
    ALTER TABLE `Employee` ADD COLUMN `departmentId` CHAR(36) NULL;
    ALTER TABLE `Employee` ADD INDEX `idx_employee_department_id` (`departmentId`);
    ALTER TABLE `Employee`
      ADD CONSTRAINT `fk_employee_department`
      FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$
DELIMITER ;
CALL add_hr_phase_2_5_employee();
DROP PROCEDURE IF EXISTS add_hr_phase_2_5_employee;

-- ---------------------------------------------------------------------------
-- 2. GoogleSheetAttendanceSyncLog new counter columns
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_hr_phase_2_5_sync_counters;
DELIMITER $$
CREATE PROCEDURE add_hr_phase_2_5_sync_counters()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'GoogleSheetAttendanceSyncLog'
      AND COLUMN_NAME = 'occupationsUpdated'
  ) THEN
    ALTER TABLE `GoogleSheetAttendanceSyncLog`
      ADD COLUMN `occupationsUpdated` INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'GoogleSheetAttendanceSyncLog'
      AND COLUMN_NAME = 'sectionsUpdated'
  ) THEN
    ALTER TABLE `GoogleSheetAttendanceSyncLog`
      ADD COLUMN `sectionsUpdated` INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'GoogleSheetAttendanceSyncLog'
      AND COLUMN_NAME = 'departmentsUpdated'
  ) THEN
    ALTER TABLE `GoogleSheetAttendanceSyncLog`
      ADD COLUMN `departmentsUpdated` INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'GoogleSheetAttendanceSyncLog'
      AND COLUMN_NAME = 'preservedFieldSkips'
  ) THEN
    ALTER TABLE `GoogleSheetAttendanceSyncLog`
      ADD COLUMN `preservedFieldSkips` INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'GoogleSheetAttendanceSyncLog'
      AND COLUMN_NAME = 'candidatesCreated'
  ) THEN
    ALTER TABLE `GoogleSheetAttendanceSyncLog`
      ADD COLUMN `candidatesCreated` INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'GoogleSheetAttendanceSyncLog'
      AND COLUMN_NAME = 'candidatesResolved'
  ) THEN
    ALTER TABLE `GoogleSheetAttendanceSyncLog`
      ADD COLUMN `candidatesResolved` INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'GoogleSheetAttendanceSyncLog'
      AND COLUMN_NAME = 'candidatesIgnored'
  ) THEN
    ALTER TABLE `GoogleSheetAttendanceSyncLog`
      ADD COLUMN `candidatesIgnored` INT NOT NULL DEFAULT 0;
  END IF;
END$$
DELIMITER ;
CALL add_hr_phase_2_5_sync_counters();
DROP PROCEDURE IF EXISTS add_hr_phase_2_5_sync_counters;

-- ---------------------------------------------------------------------------
-- 3. AttendanceMappingCandidate table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `AttendanceMappingCandidate` (
  `id`                  CHAR(36)     NOT NULL,
  `identifier`          VARCHAR(64)  NOT NULL,
  `workerType`          ENUM('EMPLOYEE','MANPOWER_SLOT') NOT NULL,
  `displayName`         VARCHAR(200) NOT NULL,
  `occupationFromSheet` VARCHAR(120) NULL,
  `sectionFromSheet`    VARCHAR(60)  NULL,
  `departmentFromSheet` VARCHAR(120) NULL,
  `status`              ENUM('UNMAPPED','RESOLVED','IGNORED') NOT NULL DEFAULT 'UNMAPPED',
  `resolvedEmployeeId`  CHAR(36)     NULL,
  `resolvedAt`          DATETIME(3)  NULL,
  `resolvedById`        CHAR(36)     NULL,
  `ignoredAt`           DATETIME(3)  NULL,
  `ignoredById`         CHAR(36)     NULL,
  `ignoreReason`        VARCHAR(200) NULL,
  `firstSeenAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `firstSeenSyncId`     CHAR(36)     NULL,
  `lastSeenSyncId`      CHAR(36)     NULL,
  `createdAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_candidate_identifier` (`identifier`, `workerType`),
  KEY `idx_candidate_status` (`status`),
  KEY `idx_candidate_resolved_employee` (`resolvedEmployeeId`),
  CONSTRAINT `fk_candidate_resolved_employee` FOREIGN KEY (`resolvedEmployeeId`)
    REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_candidate_resolved_by` FOREIGN KEY (`resolvedById`)
    REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_candidate_ignored_by` FOREIGN KEY (`ignoredById`)
    REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
