-- 18.9.0 — HR/Payroll Phase 1: employment + salary history foundation.
--
-- Creates two new tables that track each employee's position + compensation
-- timeline. One "open" row (effectiveTo IS NULL) per employee per table at
-- any time; earlier rows have effectiveTo set to the day before the
-- successor's effectiveFrom so the timeline is contiguous.
--
-- Salary changes follow a CEO-signed approval cycle:
--   DRAFT -> PENDING_HR -> PENDING_CEO -> APPROVED (or REJECTED)
-- HIRED rows are seeded as APPROVED directly by the backfill script.
--
-- CREATE TABLE IF NOT EXISTS is MySQL-safe; ADD COLUMN IF NOT EXISTS is NOT.
-- This file is fully idempotent and can be re-run safely.

CREATE TABLE IF NOT EXISTS `EmployeePositionHistory` (
  `id`            CHAR(36)     NOT NULL,
  `employeeId`    CHAR(36)     NOT NULL,
  `effectiveFrom` DATE         NOT NULL,
  `effectiveTo`   DATE         NULL,
  `positionTitle` VARCHAR(200) NOT NULL,
  `section`       VARCHAR(60)  NULL,
  `division`      VARCHAR(80)  NULL,
  `departmentId`  CHAR(36)     NULL,
  `reason`        ENUM('HIRED','PROMOTED','TRANSFERRED','DEMOTED','ROLE_CHANGE','RESIGNED','TERMINATED','REHIRED') NOT NULL,
  `notes`         VARCHAR(1000) NULL,

  `createdById`   CHAR(36)     NOT NULL,
  `updatedById`   CHAR(36)     NULL,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`     DATETIME(3)  NULL,
  `deletedById`   CHAR(36)     NULL,
  `deleteReason`  VARCHAR(500) NULL,

  PRIMARY KEY (`id`),
  INDEX `EmployeePositionHistory_employeeId_idx` (`employeeId`),
  INDEX `EmployeePositionHistory_employeeId_effectiveFrom_idx` (`employeeId`, `effectiveFrom`),
  INDEX `EmployeePositionHistory_effectiveTo_idx` (`effectiveTo`),
  INDEX `EmployeePositionHistory_deletedAt_idx` (`deletedAt`),
  INDEX `EmployeePositionHistory_departmentId_idx` (`departmentId`),
  INDEX `EmployeePositionHistory_createdById_idx` (`createdById`),
  INDEX `EmployeePositionHistory_updatedById_idx` (`updatedById`),
  INDEX `EmployeePositionHistory_deletedById_idx` (`deletedById`),

  CONSTRAINT `fk_pos_hist_employee`    FOREIGN KEY (`employeeId`)   REFERENCES `Employee`(`id`)   ON DELETE CASCADE,
  CONSTRAINT `fk_pos_hist_department`  FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pos_hist_createdBy`   FOREIGN KEY (`createdById`)  REFERENCES `User`(`id`),
  CONSTRAINT `fk_pos_hist_updatedBy`   FOREIGN KEY (`updatedById`)  REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pos_hist_deletedBy`   FOREIGN KEY (`deletedById`)  REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `EmployeeSalaryHistory` (
  `id`                 CHAR(36)     NOT NULL,
  `employeeId`         CHAR(36)     NOT NULL,
  `positionHistoryId`  CHAR(36)     NULL,
  `effectiveFrom`      DATE         NOT NULL,
  `effectiveTo`        DATE         NULL,

  `basicSalary`        DECIMAL(12,2) NOT NULL,
  `housingAllowance`   DECIMAL(12,2) NOT NULL DEFAULT 0,
  `transportAllowance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `mobileAllowance`    DECIMAL(12,2) NOT NULL DEFAULT 0,
  `foodAllowance`      DECIMAL(12,2) NOT NULL DEFAULT 0,
  `otherAllowances`    DECIMAL(12,2) NOT NULL DEFAULT 0,

  `reason`             ENUM('HIRED','ANNUAL_INCREMENT','PROMOTION','ADJUSTMENT','COLA','CORRECTION','DEMOTION') NOT NULL,
  `notes`              VARCHAR(1000) NULL,

  `status`             ENUM('DRAFT','PENDING_HR','PENDING_CEO','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  `submittedAt`        DATETIME(3)  NULL,
  `submittedById`      CHAR(36)     NULL,
  `hrApprovedAt`       DATETIME(3)  NULL,
  `hrApprovedById`     CHAR(36)     NULL,
  `ceoApprovedAt`      DATETIME(3)  NULL,
  `ceoApprovedById`    CHAR(36)     NULL,
  `rejectedAt`         DATETIME(3)  NULL,
  `rejectedById`       CHAR(36)     NULL,
  `rejectReason`       VARCHAR(1000) NULL,

  `createdById`        CHAR(36)     NOT NULL,
  `updatedById`        CHAR(36)     NULL,
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`          DATETIME(3)  NULL,
  `deletedById`        CHAR(36)     NULL,
  `deleteReason`       VARCHAR(500) NULL,

  PRIMARY KEY (`id`),
  INDEX `EmployeeSalaryHistory_employeeId_idx` (`employeeId`),
  INDEX `EmployeeSalaryHistory_employeeId_effectiveFrom_idx` (`employeeId`, `effectiveFrom`),
  INDEX `EmployeeSalaryHistory_status_idx` (`status`),
  INDEX `EmployeeSalaryHistory_effectiveTo_idx` (`effectiveTo`),
  INDEX `EmployeeSalaryHistory_deletedAt_idx` (`deletedAt`),
  INDEX `EmployeeSalaryHistory_positionHistoryId_idx` (`positionHistoryId`),
  INDEX `EmployeeSalaryHistory_submittedById_idx` (`submittedById`),
  INDEX `EmployeeSalaryHistory_hrApprovedById_idx` (`hrApprovedById`),
  INDEX `EmployeeSalaryHistory_ceoApprovedById_idx` (`ceoApprovedById`),
  INDEX `EmployeeSalaryHistory_rejectedById_idx` (`rejectedById`),
  INDEX `EmployeeSalaryHistory_createdById_idx` (`createdById`),
  INDEX `EmployeeSalaryHistory_updatedById_idx` (`updatedById`),
  INDEX `EmployeeSalaryHistory_deletedById_idx` (`deletedById`),

  CONSTRAINT `fk_sal_hist_employee`       FOREIGN KEY (`employeeId`)        REFERENCES `Employee`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sal_hist_position`       FOREIGN KEY (`positionHistoryId`) REFERENCES `EmployeePositionHistory`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sal_hist_submittedBy`    FOREIGN KEY (`submittedById`)     REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sal_hist_hrApprovedBy`   FOREIGN KEY (`hrApprovedById`)    REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sal_hist_ceoApprovedBy`  FOREIGN KEY (`ceoApprovedById`)   REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sal_hist_rejectedBy`     FOREIGN KEY (`rejectedById`)      REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sal_hist_createdBy`      FOREIGN KEY (`createdById`)       REFERENCES `User`(`id`),
  CONSTRAINT `fk_sal_hist_updatedBy`      FOREIGN KEY (`updatedById`)       REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sal_hist_deletedBy`      FOREIGN KEY (`deletedById`)       REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
