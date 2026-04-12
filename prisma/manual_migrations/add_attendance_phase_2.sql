-- ============================================================================
-- HR Attendance / Leaves / Overtime (Phase 2 of OTS-MSS-HR-PAYROLL-v1)
-- ============================================================================
-- Creates:
--   - AttendanceRecord, PublicHoliday, GoogleSheetAttendanceSyncLog
--   - WorkerType / AttendanceStatus / AttendanceSyncStatus MySQL ENUMs
-- No existing-table alterations — Phase 1 already added the FK targets
-- (Employee, ManpowerSlot). This migration is standalone and idempotent;
-- running it twice is a no-op.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- AttendanceRecord
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `AttendanceRecord` (
  `id`                 CHAR(36)      NOT NULL,
  `workerType`         ENUM('EMPLOYEE','MANPOWER_SLOT') NOT NULL,
  `employeeId`         CHAR(36)      NULL,
  `manpowerSlotId`     CHAR(36)      NULL,
  `date`               DATE          NOT NULL,
  `status`             ENUM('PRESENT','ABSENT_WITH_PERMISSION','ABSENT_NO_PERMISSION','ANNUAL_VACATION','SICK_LEAVE','WEEKEND','PUBLIC_HOLIDAY','UNKNOWN') NOT NULL,
  `regularHours`       DECIMAL(5,2)  NOT NULL DEFAULT 0,
  `overtimeHours`      DECIMAL(5,2)  NOT NULL DEFAULT 0,
  `otMultiplier`       DECIMAL(3,2)  NOT NULL DEFAULT 1.00,
  `isFriday`           TINYINT(1)    NOT NULL DEFAULT 0,
  `isPublicHoliday`    TINYINT(1)    NOT NULL DEFAULT 0,
  `rawCellA`           VARCHAR(32)   NULL,
  `rawCellP`           VARCHAR(32)   NULL,
  `sourceRowHash`      CHAR(64)      NOT NULL,
  `lastImportBatchId`  CHAR(36)      NULL,
  `lastImportedAt`     DATETIME(3)   NOT NULL,
  `createdAt`          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)   NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_attendance_worker_date` (`workerType`, `employeeId`, `manpowerSlotId`, `date`),
  KEY `idx_attendance_date` (`date`),
  KEY `idx_attendance_emp_date` (`employeeId`, `date`),
  KEY `idx_attendance_slot_date` (`manpowerSlotId`, `date`),
  KEY `idx_attendance_status` (`status`),
  CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employeeId`)
    REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_slot` FOREIGN KEY (`manpowerSlotId`)
    REFERENCES `ManpowerSlot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- PublicHoliday
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `PublicHoliday` (
  `id`          CHAR(36)      NOT NULL,
  `date`        DATE          NOT NULL,
  `nameEn`      VARCHAR(200)  NOT NULL,
  `nameAr`      VARCHAR(200)  NULL,
  `isRecurring` TINYINT(1)    NOT NULL DEFAULT 0,
  `createdById` CHAR(36)      NOT NULL,
  `updatedById` CHAR(36)      NULL,
  `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)   NOT NULL,
  `deletedAt`   DATETIME(3)   NULL,
  `deletedById` CHAR(36)      NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_public_holiday_date` (`date`),
  KEY `idx_public_holiday_deleted` (`deletedAt`),
  CONSTRAINT `fk_holiday_created_by` FOREIGN KEY (`createdById`)
    REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_holiday_updated_by` FOREIGN KEY (`updatedById`)
    REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_holiday_deleted_by` FOREIGN KEY (`deletedById`)
    REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- GoogleSheetAttendanceSyncLog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `GoogleSheetAttendanceSyncLog` (
  `id`              CHAR(36)       NOT NULL,
  `startedAt`       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt`     DATETIME(3)    NULL,
  `triggeredById`   CHAR(36)       NOT NULL,
  `status`          ENUM('RUNNING','SUCCESS','PARTIAL','FAILED') NOT NULL,
  `spreadsheetId`   VARCHAR(100)   NOT NULL,
  `tabName`         VARCHAR(100)   NOT NULL,
  `rowsRead`        INT            NOT NULL DEFAULT 0,
  `rowsCreated`     INT            NOT NULL DEFAULT 0,
  `rowsUpdated`     INT            NOT NULL DEFAULT 0,
  `rowsUnchanged`   INT            NOT NULL DEFAULT 0,
  `employeeOrphans` JSON           NULL,
  `slotOrphans`     JSON           NULL,
  `hardErrors`      JSON           NULL,
  `softWarnings`    JSON           NULL,
  `durationMs`      INT            NULL,

  PRIMARY KEY (`id`),
  KEY `idx_attendance_sync_status` (`status`),
  KEY `idx_attendance_sync_started` (`startedAt`),
  CONSTRAINT `fk_attendance_sync_triggered_by` FOREIGN KEY (`triggeredById`)
    REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
