-- v45.0.0 — Saudi Labor Law Unauthorized-Absence Alerts (OTS-BL-080)
-- Persisted, scheduled escalation of ANP (ABSENT_NO_PERMISSION) attendance.
-- Idempotent: creates the EmployeeAbsenceAlert table only if it does not exist.

DROP PROCEDURE IF EXISTS create_employee_absence_alert;
DELIMITER $$
CREATE PROCEDURE create_employee_absence_alert()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EmployeeAbsenceAlert'
  ) THEN
    CREATE TABLE `EmployeeAbsenceAlert` (
      `id`                    CHAR(36)     NOT NULL,
      `employeeId`            CHAR(36)     NOT NULL,
      `windowType`            ENUM('CONSECUTIVE','INTERMITTENT') NOT NULL,
      `kind`                  ENUM('PRE_THRESHOLD','THRESHOLD') NOT NULL,
      `thresholdDays`         INT          NOT NULL,
      `anpDays`               INT          NOT NULL,
      `severity`              VARCHAR(10)  NOT NULL,
      `recommendedLetterType` VARCHAR(40)  NULL,
      `status`                ENUM('OPEN','ACKNOWLEDGED','LETTER_LINKED','RESOLVED','DISMISSED') NOT NULL DEFAULT 'OPEN',
      `periodFrom`            DATE         NOT NULL,
      `periodTo`              DATE         NOT NULL,
      `detail`                VARCHAR(500) NOT NULL,
      `meta`                  JSON         NULL,
      `dedupeKey`             VARCHAR(180) NOT NULL,
      `linkedLetterId`        CHAR(36)     NULL,
      `notifiedAt`            DATETIME(3)  NULL,
      `acknowledgedById`      CHAR(36)     NULL,
      `acknowledgedAt`        DATETIME(3)  NULL,
      `resolvedById`          CHAR(36)     NULL,
      `resolvedAt`            DATETIME(3)  NULL,
      `deletedAt`             DATETIME(3)  NULL,
      `createdAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      UNIQUE KEY `EmployeeAbsenceAlert_dedupeKey_key` (`dedupeKey`),
      KEY `EmployeeAbsenceAlert_employeeId_status_idx` (`employeeId`,`status`),
      KEY `EmployeeAbsenceAlert_status_idx` (`status`),
      KEY `EmployeeAbsenceAlert_severity_idx` (`severity`),
      KEY `EmployeeAbsenceAlert_createdAt_idx` (`createdAt`),
      KEY `EmployeeAbsenceAlert_linkedLetterId_idx` (`linkedLetterId`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;

CALL create_employee_absence_alert();
DROP PROCEDURE IF EXISTS create_employee_absence_alert;
