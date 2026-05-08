-- v23.2.0 — HR Monthly Report table
-- Creates the HrMonthlyReport table for storing auto-generated monthly HR PDF reports.

DROP PROCEDURE IF EXISTS add_hr_monthly_report_table;

DELIMITER //
CREATE PROCEDURE add_hr_monthly_report_table()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'HrMonthlyReport'
  ) THEN
    CREATE TABLE `HrMonthlyReport` (
      `id`                    CHAR(36)       NOT NULL,
      `year`                  INT            NOT NULL,
      `month`                 INT            NOT NULL,
      `status`                ENUM('GENERATING','READY','FAILED') NOT NULL DEFAULT 'GENERATING',
      `newHires`              INT            NOT NULL DEFAULT 0,
      `resignations`          INT            NOT NULL DEFAULT 0,
      `terminations`          INT            NOT NULL DEFAULT 0,
      `headcountAtEnd`        INT            NOT NULL DEFAULT 0,
      `turnoverRate`          DECIMAL(5,2)   NOT NULL DEFAULT 0.00,
      `burnoutScore`          DECIMAL(5,2)   NOT NULL DEFAULT 0.00,
      `totalPayroll`          DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
      `leaveRequestsTotal`    INT            NOT NULL DEFAULT 0,
      `leaveRequestsApproved` INT            NOT NULL DEFAULT 0,
      `iqamaExpiredCount`     INT            NOT NULL DEFAULT 0,
      `iqamaDueSoonCount`     INT            NOT NULL DEFAULT 0,
      `docRenewalsDueSoon`    INT            NOT NULL DEFAULT 0,
      `reportData`            JSON,
      `errorMessage`          TEXT,
      `filePath`              VARCHAR(500),
      `generatedAt`           DATETIME(3),
      `createdById`           CHAR(36)       NOT NULL,
      `createdAt`             DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`             DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      UNIQUE KEY `HrMonthlyReport_year_month_key` (`year`, `month`),
      INDEX `HrMonthlyReport_status_idx` (`status`),
      INDEX `HrMonthlyReport_createdAt_idx` (`createdAt`),
      CONSTRAINT `HrMonthlyReport_createdBy_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END //
DELIMITER ;

CALL add_hr_monthly_report_table();
DROP PROCEDURE IF EXISTS add_hr_monthly_report_table;
