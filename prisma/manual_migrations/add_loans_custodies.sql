-- 18.10.0 — Add Loan and Custody tables + loanDeduction/custodyDeduction on PayrollLine
--
-- Idempotent: uses CREATE TABLE IF NOT EXISTS and the stored-procedure
-- pattern for ADD COLUMN (MySQL doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS).

-- ─── Loan table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `Loan` (
  `id`                  CHAR(36)        NOT NULL,
  `employeeId`          CHAR(36)        NOT NULL,
  `principal`           DECIMAL(12,2)   NOT NULL,
  `installmentAmount`   DECIMAL(12,2)   NOT NULL,
  `installmentsTotal`   INT             NOT NULL,
  `installmentsPaid`    INT             NOT NULL DEFAULT 0,
  `startDate`           DATE            NOT NULL,
  `status`              ENUM('ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `reason`              VARCHAR(500)    NULL,
  `exceedsYearWarning`  TINYINT(1)      NOT NULL DEFAULT 0,
  `warningReason`       VARCHAR(500)    NULL,
  `createdById`         CHAR(36)        NOT NULL,
  `updatedById`         CHAR(36)        NULL,
  `createdAt`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`           DATETIME(3)     NULL,
  `deletedById`         CHAR(36)        NULL,
  `deleteReason`        VARCHAR(500)    NULL,
  PRIMARY KEY (`id`),
  INDEX `Loan_employeeId_status_idx` (`employeeId`, `status`),
  INDEX `Loan_deletedAt_idx` (`deletedAt`),
  CONSTRAINT `Loan_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Loan_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Loan_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Loan_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Custody table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `Custody` (
  `id`              CHAR(36)        NOT NULL,
  `employeeId`      CHAR(36)        NOT NULL,
  `amount`          DECIMAL(12,2)   NOT NULL,
  `issuedDate`      DATE            NOT NULL,
  `reason`          VARCHAR(500)    NOT NULL,
  `settledAmount`   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `deductionAmount` DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `status`          ENUM('OPEN','PARTIALLY_SETTLED','SETTLED') NOT NULL DEFAULT 'OPEN',
  `notes`           VARCHAR(500)    NULL,
  `createdById`     CHAR(36)        NOT NULL,
  `updatedById`     CHAR(36)        NULL,
  `createdAt`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`       DATETIME(3)     NULL,
  `deletedById`     CHAR(36)        NULL,
  `deleteReason`    VARCHAR(500)    NULL,
  PRIMARY KEY (`id`),
  INDEX `Custody_employeeId_status_idx` (`employeeId`, `status`),
  INDEX `Custody_deletedAt_idx` (`deletedAt`),
  CONSTRAINT `Custody_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Custody_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Custody_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Custody_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PayrollLine: add loanDeduction and custodyDeduction ─────────────────────

DROP PROCEDURE IF EXISTS add_payrollline_loan_custody_cols;
DELIMITER $$
CREATE PROCEDURE add_payrollline_loan_custody_cols()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'PayrollLine'
      AND COLUMN_NAME = 'loanDeduction'
  ) THEN
    ALTER TABLE `PayrollLine`
      ADD COLUMN `loanDeduction` DECIMAL(12,2) NOT NULL DEFAULT 0.00
      AFTER `gosiEmployer`;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'PayrollLine'
      AND COLUMN_NAME = 'custodyDeduction'
  ) THEN
    ALTER TABLE `PayrollLine`
      ADD COLUMN `custodyDeduction` DECIMAL(12,2) NOT NULL DEFAULT 0.00
      AFTER `loanDeduction`;
  END IF;
END$$
DELIMITER ;
CALL add_payrollline_loan_custody_cols();
DROP PROCEDURE IF EXISTS add_payrollline_loan_custody_cols;
