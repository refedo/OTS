-- ============================================================================
-- 18.6.0 — Dolibarr Leaves Sync (one-way read-only mirror)
-- ============================================================================
-- Additions:
--   1. LeaveRequest.source         — NATIVE | DOLIBARR
--   2. LeaveRequest.dolibarrHolidayId (unique) — idempotency key
--   3. DolibarrLeaveSyncLog table — per-run audit log
--   4. Seed PERMITTED + UNPERMITTED + URGENT LeaveType rows so the Dolibarr
--      type mapping (fk_type → LeaveType.code) always lands.
--
-- Idempotent: every ALTER is information_schema-guarded, tables use
-- CREATE TABLE IF NOT EXISTS, seeds use INSERT IGNORE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. LeaveRequest.source + LeaveRequest.dolibarrHolidayId
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_leave_request_dolibarr_columns;
DELIMITER $$
CREATE PROCEDURE add_leave_request_dolibarr_columns()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'LeaveRequest'
      AND COLUMN_NAME = 'source'
  ) THEN
    ALTER TABLE `LeaveRequest`
      ADD COLUMN `source` ENUM('NATIVE','DOLIBARR') NOT NULL DEFAULT 'NATIVE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'LeaveRequest'
      AND COLUMN_NAME = 'dolibarrHolidayId'
  ) THEN
    ALTER TABLE `LeaveRequest`
      ADD COLUMN `dolibarrHolidayId` INT NULL,
      ADD UNIQUE KEY `LeaveRequest_dolibarrHolidayId_key` (`dolibarrHolidayId`);
  END IF;
END$$
DELIMITER ;
CALL add_leave_request_dolibarr_columns();
DROP PROCEDURE IF EXISTS add_leave_request_dolibarr_columns;

-- ---------------------------------------------------------------------------
-- 2. DolibarrLeaveSyncLog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `DolibarrLeaveSyncLog` (
  `id`                       CHAR(36)    NOT NULL,
  `startedAt`                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt`               DATETIME(3) NULL,
  `triggeredById`            CHAR(36)    NOT NULL,
  `triggerSource`            VARCHAR(20) NOT NULL DEFAULT 'manual',
  `status`                   ENUM('RUNNING','SUCCESS','PARTIAL','FAILED') NOT NULL,
  `rowsRead`                 INT         NOT NULL DEFAULT 0,
  `rowsCreated`              INT         NOT NULL DEFAULT 0,
  `rowsUpdated`              INT         NOT NULL DEFAULT 0,
  `rowsSkipped`              INT         NOT NULL DEFAULT 0,
  `employeesNotFound`        INT         NOT NULL DEFAULT 0,
  `typesNotMapped`           INT         NOT NULL DEFAULT 0,
  `attendanceDaysOverridden` INT         NOT NULL DEFAULT 0,
  `hardErrors`               JSON        NULL,
  `softWarnings`             JSON        NULL,
  `apiResponseMs`            INT         NULL,

  PRIMARY KEY (`id`),
  KEY `idx_dolibarr_leave_sync_log_status`     (`status`),
  KEY `idx_dolibarr_leave_sync_log_started_at` (`startedAt`),
  KEY `idx_dolibarr_leave_sync_log_triggered_by` (`triggeredById`),
  CONSTRAINT `fk_dolibarr_leave_sync_log_user`
    FOREIGN KEY (`triggeredById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. Seed the Dolibarr-sourced leave types so fk_type mapping always lands.
--    Maps (per Walid, 18.6.0):
--      "01- Leave with Permission"    → PERMITTED   (HALF_PAID placeholder)
--      "02- Leave without Permission" → UNPERMITTED (UNPAID)
--      "Sick leave"                   → SICK        (already seeded)
--      "04- Annual Leave"             → ANNUAL      (already seeded)
--      "05- Urgent Leave"             → URGENT      (FULLY_PAID)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `LeaveType`
  (`id`, `code`, `nameEn`, `nameAr`, `payType`,
   `monthlyAccrualDays`, `annualAccrualDays`, `maxCarryOverDays`,
   `requiresMedicalCertificate`, `allowNegativeBalance`, `countPublicHolidays`,
   `displayOrder`, `createdAt`, `updatedAt`)
VALUES
  (UUID(), 'PERMITTED',   'Leave with Permission',    'إجازة بإذن',       'FULLY_PAID', 0.00, 0.00, 0.00, 0, 1, 0, 60, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (UUID(), 'UNPERMITTED', 'Leave without Permission', 'إجازة بدون إذن',   'UNPAID',     0.00, 0.00, 0.00, 0, 1, 0, 70, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (UUID(), 'URGENT',      'Urgent Leave',             'إجازة عاجلة',      'FULLY_PAID', 0.00, 5.00, 0.00, 0, 1, 0, 80, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
