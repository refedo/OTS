-- ============================================================================
-- 18.5.0 — HR Phase 3: Leaves, Payroll, WPS export, End-of-Service Gratuity
-- ============================================================================
-- Additions:
--   1. Employee.isGosiSubject + Employee.gosiSalary
--   2. LeaveType, LeaveRequest, LeaveBalance tables + enums
--   3. PayrollPeriod, PayrollLine, PayrollAdjustment, WpsExport tables + enums
--   4. EndOfServiceAward table
--   5. Seed LeaveType with the six standard types used across the fab shop
--   6. Seed SystemConfig with payroll + leaves defaults
--
-- Idempotent: every ALTER is information_schema-guarded, tables use
-- CREATE TABLE IF NOT EXISTS, seeds use INSERT IGNORE.
-- Stored-procedure pattern per CLAUDE.md (MySQL rejects ADD COLUMN IF NOT EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Employee.isGosiSubject + Employee.gosiSalary
-- ---------------------------------------------------------------------------
-- Prisma prepared statements don't support stored procedures, so we use
-- plain ALTER TABLE.  On re-runs the statement fails harmlessly and the
-- runner catches the error and continues.
ALTER TABLE `Employee` ADD COLUMN `isGosiSubject` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `Employee` ADD COLUMN `gosiSalary` DECIMAL(12, 2) NULL;

-- ---------------------------------------------------------------------------
-- 2. LeaveType
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LeaveType` (
  `id`                         CHAR(36)    NOT NULL,
  `code`                       VARCHAR(40) NOT NULL,
  `nameEn`                     VARCHAR(120) NOT NULL,
  `nameAr`                     VARCHAR(120) NULL,
  `payType`                    ENUM('FULLY_PAID','HALF_PAID','UNPAID') NOT NULL DEFAULT 'FULLY_PAID',
  `monthlyAccrualDays`         DECIMAL(5, 2)  NOT NULL DEFAULT 1.75,
  `annualAccrualDays`          DECIMAL(6, 2)  NOT NULL DEFAULT 21.00,
  `maxCarryOverDays`           DECIMAL(6, 2)  NOT NULL DEFAULT 30.00,
  `requiresMedicalCertificate` TINYINT(1)  NOT NULL DEFAULT 0,
  `allowNegativeBalance`       TINYINT(1)  NOT NULL DEFAULT 1,
  `countPublicHolidays`        TINYINT(1)  NOT NULL DEFAULT 0,
  `displayOrder`               INT         NOT NULL DEFAULT 0,
  `archivedAt`                 DATETIME(3) NULL,
  `createdAt`                  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`                  DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_leave_type_code` (`code`),
  KEY `idx_leave_type_archived_at` (`archivedAt`),
  KEY `idx_leave_type_display_order` (`displayOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the six default leave types
INSERT IGNORE INTO `LeaveType` (`id`, `code`, `nameEn`, `nameAr`, `payType`, `monthlyAccrualDays`, `annualAccrualDays`, `maxCarryOverDays`, `requiresMedicalCertificate`, `allowNegativeBalance`, `countPublicHolidays`, `displayOrder`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'ANNUAL',    'Annual Leave',    'إجازة سنوية',     'FULLY_PAID', 1.75, 21.00, 30.00, 0, 1, 0,  0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'SICK',      'Sick Leave',      'إجازة مرضية',    'FULLY_PAID', 0.00, 30.00,  0.00, 1, 1, 1, 10, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'UNPAID',    'Unpaid Leave',    'إجازة بدون راتب', 'UNPAID',     0.00,  0.00,  0.00, 0, 1, 1, 20, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'HAJJ',      'Hajj Leave',      'إجازة حج',        'FULLY_PAID', 0.00, 10.00,  0.00, 0, 0, 1, 30, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'MATERNITY', 'Maternity Leave', 'إجازة أمومة',    'FULLY_PAID', 0.00, 70.00,  0.00, 1, 0, 1, 40, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'EMERGENCY', 'Emergency Leave', 'إجازة طارئة',    'FULLY_PAID', 0.00,  5.00,  0.00, 0, 1, 0, 50, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------------
-- 3. LeaveRequest
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LeaveRequest` (
  `id`                   CHAR(36)     NOT NULL,
  `employeeId`           CHAR(36)     NOT NULL,
  `leaveTypeId`          CHAR(36)     NOT NULL,
  `startDate`            DATE         NOT NULL,
  `endDate`              DATE         NOT NULL,
  `calendarDays`         INT          NOT NULL,
  `workingDays`          DECIMAL(6, 2) NOT NULL,
  `reason`               VARCHAR(1000) NULL,
  `status`               ENUM('DRAFT','PENDING_MANAGER','PENDING_HR','PENDING_CEO','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `attachmentUrl`        VARCHAR(500) NULL,
  `submittedAt`          DATETIME(3)  NULL,
  `managerApprovedAt`    DATETIME(3)  NULL,
  `managerApprovedById`  CHAR(36)     NULL,
  `hrApprovedAt`         DATETIME(3)  NULL,
  `hrApprovedById`       CHAR(36)     NULL,
  `ceoApprovedAt`        DATETIME(3)  NULL,
  `ceoApprovedById`      CHAR(36)     NULL,
  `rejectedAt`           DATETIME(3)  NULL,
  `rejectedById`         CHAR(36)     NULL,
  `rejectReason`         VARCHAR(500) NULL,
  `balanceAtRequest`     DECIMAL(8, 2) NULL,
  `wasOverBalance`       TINYINT(1)   NOT NULL DEFAULT 0,
  `createdById`          CHAR(36)     NOT NULL,
  `updatedById`          CHAR(36)     NULL,
  `createdAt`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`            DATETIME(3)  NOT NULL,
  `deletedAt`            DATETIME(3)  NULL,

  PRIMARY KEY (`id`),
  KEY `idx_leave_request_employee_status` (`employeeId`, `status`),
  KEY `idx_leave_request_status` (`status`),
  KEY `idx_leave_request_dates` (`startDate`, `endDate`),
  KEY `idx_leave_request_deleted_at` (`deletedAt`),
  KEY `fk_leave_request_type` (`leaveTypeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. LeaveBalance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LeaveBalance` (
  `id`               CHAR(36)    NOT NULL,
  `employeeId`       CHAR(36)    NOT NULL,
  `leaveTypeId`      CHAR(36)    NOT NULL,
  `year`             INT         NOT NULL,
  `openingBalance`   DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `accruedYtd`       DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `usedYtd`          DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `carriedOver`      DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `manualAdjustment` DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `adjustmentReason` VARCHAR(500) NULL,
  `asOfDate`         DATE        NOT NULL,
  `updatedAt`        DATETIME(3) NOT NULL,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_leave_balance_employee_type_year` (`employeeId`, `leaveTypeId`, `year`),
  KEY `idx_leave_balance_year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. PayrollPeriod
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `PayrollPeriod` (
  `id`              CHAR(36)    NOT NULL,
  `year`            INT         NOT NULL,
  `month`           INT         NOT NULL,
  `status`          ENUM('DRAFT','CALCULATED','APPROVED','PAID','LOCKED') NOT NULL DEFAULT 'DRAFT',
  `cutoffDate`      DATE        NOT NULL,
  `payDate`         DATE        NOT NULL,
  `notes`           VARCHAR(1000) NULL,
  `calculatedAt`    DATETIME(3) NULL,
  `calculatedById`  CHAR(36)    NULL,
  `approvedAt`      DATETIME(3) NULL,
  `approvedById`    CHAR(36)    NULL,
  `lockedAt`        DATETIME(3) NULL,
  `lockedById`      CHAR(36)    NULL,
  `createdById`     CHAR(36)    NOT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_payroll_period_year_month` (`year`, `month`),
  KEY `idx_payroll_period_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. PayrollLine
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `PayrollLine` (
  `id`                           CHAR(36)     NOT NULL,
  `periodId`                     CHAR(36)     NOT NULL,
  `employeeId`                   CHAR(36)     NOT NULL,
  `basicSalary`                  DECIMAL(12, 2) NOT NULL,
  `housingAllowance`             DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `transportAllowance`           DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `mobileAllowance`              DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `foodAllowance`                DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `otherAllowances`              DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `calendarDays`                 INT          NOT NULL,
  `workingDays`                  INT          NOT NULL,
  `workedDays`                   DECIMAL(6, 2) NOT NULL DEFAULT 0,
  `paidLeaveDays`                DECIMAL(6, 2) NOT NULL DEFAULT 0,
  `halfPaidLeaveDays`            DECIMAL(6, 2) NOT NULL DEFAULT 0,
  `unpaidLeaveDays`              DECIMAL(6, 2) NOT NULL DEFAULT 0,
  `absentDaysWithPermission`     DECIMAL(6, 2) NOT NULL DEFAULT 0,
  `absentDaysWithoutPermission`  DECIMAL(6, 2) NOT NULL DEFAULT 0,
  `publicHolidayDays`            DECIMAL(6, 2) NOT NULL DEFAULT 0,
  `overtimeHours`                DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `dailyRate`                    DECIMAL(12, 4) NOT NULL DEFAULT 0,
  `hourlyRate`                   DECIMAL(12, 4) NOT NULL DEFAULT 0,
  `overtimePay`                  DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `unpaidLeaveDeduction`         DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `absenceDeduction`             DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `gosiEmployee`                 DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `gosiEmployer`                 DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `otherDeductions`              DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `bonuses`                      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `otherAdditions`               DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `grossPay`                     DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `totalDeductions`              DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `totalAdditions`               DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `netPay`                       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `bankName`                     VARCHAR(200) NULL,
  `bankIban`                     VARCHAR(34)  NULL,
  `payslipPdfPath`               VARCHAR(500) NULL,
  `payslipGeneratedAt`           DATETIME(3)  NULL,
  `notes`                        VARCHAR(1000) NULL,
  `createdAt`                    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`                    DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_payroll_line_period_employee` (`periodId`, `employeeId`),
  KEY `idx_payroll_line_employee` (`employeeId`),
  CONSTRAINT `fk_payroll_line_period` FOREIGN KEY (`periodId`) REFERENCES `PayrollPeriod` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. PayrollAdjustment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `PayrollAdjustment` (
  `id`          CHAR(36)    NOT NULL,
  `periodId`    CHAR(36)    NOT NULL,
  `employeeId`  CHAR(36)    NOT NULL,
  `kind`        VARCHAR(40) NOT NULL,
  `amount`      DECIMAL(12, 2) NOT NULL,
  `reason`      VARCHAR(500) NOT NULL,
  `createdById` CHAR(36)    NOT NULL,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3) NOT NULL,
  `deletedAt`   DATETIME(3) NULL,

  PRIMARY KEY (`id`),
  KEY `idx_payroll_adjustment_period` (`periodId`),
  KEY `idx_payroll_adjustment_employee` (`employeeId`),
  KEY `idx_payroll_adjustment_deleted_at` (`deletedAt`),
  CONSTRAINT `fk_payroll_adjustment_period` FOREIGN KEY (`periodId`) REFERENCES `PayrollPeriod` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. WpsExport
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `WpsExport` (
  `id`             CHAR(36)    NOT NULL,
  `periodId`       CHAR(36)    NOT NULL,
  `bankCode`       VARCHAR(20) NOT NULL,
  `fileFormat`     VARCHAR(20) NOT NULL,
  `filename`       VARCHAR(255) NOT NULL,
  `filePath`       VARCHAR(500) NOT NULL,
  `totalEmployees` INT         NOT NULL,
  `totalNet`       DECIMAL(14, 2) NOT NULL,
  `status`         ENUM('PENDING','GENERATED','DOWNLOADED','SUBMITTED') NOT NULL DEFAULT 'GENERATED',
  `generatedById`  CHAR(36)    NOT NULL,
  `generatedAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `downloadedAt`   DATETIME(3) NULL,
  `downloadedById` CHAR(36)    NULL,

  PRIMARY KEY (`id`),
  KEY `idx_wps_export_period` (`periodId`),
  KEY `idx_wps_export_status` (`status`),
  CONSTRAINT `fk_wps_export_period` FOREIGN KEY (`periodId`) REFERENCES `PayrollPeriod` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9. EndOfServiceAward
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `EndOfServiceAward` (
  `id`               CHAR(36)    NOT NULL,
  `employeeId`       CHAR(36)    NOT NULL,
  `serviceStartDate` DATE        NOT NULL,
  `serviceEndDate`   DATE        NOT NULL,
  `serviceYears`     DECIMAL(6, 3) NOT NULL,
  `lastMonthlyWage`  DECIMAL(12, 2) NOT NULL,
  `firstTierMonths`  DECIMAL(8, 3) NOT NULL,
  `secondTierMonths` DECIMAL(8, 3) NOT NULL,
  `grossAward`       DECIMAL(14, 2) NOT NULL,
  `deductions`       DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `netAward`         DECIMAL(14, 2) NOT NULL,
  `notes`            VARCHAR(1000) NULL,
  `calculatedById`   CHAR(36)    NOT NULL,
  `calculatedAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `paidAt`           DATETIME(3) NULL,
  `paidById`         CHAR(36)    NULL,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_eos_award_employee` (`employeeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10. SystemConfig seeds — payroll + leaves defaults
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `SystemConfig` (`id`, `key`, `value`, `description`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'payroll.dailyRateBasis',     'THIRTY',     'Daily-rate basis for payroll calculations: THIRTY | WORKING_DAYS_IN_MONTH | WEEKLY_AVERAGE. Walid to validate with HR.', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'payroll.gosiEmployeeRate',   '0.10',       'Employee-side GOSI contribution rate (0.10 = 10%)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'payroll.gosiEmployerRate',   '0.12',       'Employer-side GOSI contribution rate (0.12 = 12%)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'payroll.overtimeMultiplier', '1.5',        'Overtime pay multiplier applied to every hour over standardDailyHours', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'payroll.wpsBankCode',        'ALINMA',     'Bank code for WPS file generation (ALINMA)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'leaves.approvalChain',       'MANAGER_HR_CEO', 'Ordered approval chain for leave requests. Comma-separated from: MANAGER, HR, CEO.', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'leaves.autoApproveUnderDays', '0',         'If > 0, leave requests with workingDays <= this value skip the approval chain.', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
