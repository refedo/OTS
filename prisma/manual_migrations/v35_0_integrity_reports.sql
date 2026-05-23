-- Integrity Reports table (v26.0.0)
-- Allows team members to submit confidential/anonymous violation reports.
-- Only admin and CEO can view all reports; reporters can view their own non-anonymous reports.

DROP PROCEDURE IF EXISTS create_integrity_reports;
DELIMITER $$
CREATE PROCEDURE create_integrity_reports()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'integrity_reports'
  ) THEN
    CREATE TABLE `integrity_reports` (
      `id`           CHAR(36)     NOT NULL,
      `reportNumber` VARCHAR(30)  NOT NULL,
      `category`     ENUM('MISCONDUCT','FINANCIAL_MISUSE','ASSET_MISUSE','OPERATIONAL_RISK','SAFETY_VIOLATION','POLICY_BREACH','OTHER') NOT NULL,
      `title`        VARCHAR(255) NOT NULL,
      `description`  TEXT         NOT NULL,
      `isAnonymous`  TINYINT(1)   NOT NULL DEFAULT 0,
      `severity`     ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
      `status`       ENUM('OPEN','UNDER_REVIEW','RESOLVED','DISMISSED') NOT NULL DEFAULT 'OPEN',
      `attachments`  JSON         NULL,
      `reporterId`   CHAR(36)     NULL,
      `resolution`   TEXT         NULL,
      `resolvedAt`   DATETIME(3)  NULL,
      `resolvedById` CHAR(36)     NULL,
      `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      UNIQUE KEY `integrity_reports_reportNumber_key` (`reportNumber`),
      KEY `integrity_reports_status_idx` (`status`),
      KEY `integrity_reports_category_idx` (`category`),
      KEY `integrity_reports_reporterId_idx` (`reporterId`),
      KEY `integrity_reports_createdAt_idx` (`createdAt`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;

CALL create_integrity_reports();
DROP PROCEDURE IF EXISTS create_integrity_reports;
