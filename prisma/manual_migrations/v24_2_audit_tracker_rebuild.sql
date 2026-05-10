-- ============================================================
-- v24.2.0 — Audit Tracker Rebuild (ISO §9.2 Full Lifecycle)
-- Forms: HEXA-FRM-004 (exp), FRM-005 (exp), FRM-006 (exp),
--        FRM-024 (new), FRM-025 (new), FRM-026 (new), REC-026 (new)
-- Procedure: Hexa-ISP-004
-- ============================================================

-- ── 1. Expand ImsAudit (FRM-004 & FRM-005 fields) ──────────

-- FRM-004 schedule enhancements
CALL add_column_if_missing('ImsAudit', 'processArea',                  "VARCHAR(50) NULL");
CALL add_column_if_missing('ImsAudit', 'riskLevel',                    "VARCHAR(10) NULL");
CALL add_column_if_missing('ImsAudit', 'isoClausesInScope',            "JSON NULL");
CALL add_column_if_missing('ImsAudit', 'auditorIndependenceConfirmed', "TINYINT(1) NOT NULL DEFAULT 0");
CALL add_column_if_missing('ImsAudit', 'approvedByImsManagerName',     "VARCHAR(100) NULL");
CALL add_column_if_missing('ImsAudit', 'approvedByImsManagerDate',     "DATETIME NULL");
CALL add_column_if_missing('ImsAudit', 'approvedByImsManagerSigned',   "TINYINT(1) NOT NULL DEFAULT 0");
CALL add_column_if_missing('ImsAudit', 'approvedByTopMgmtName',        "VARCHAR(100) NULL");
CALL add_column_if_missing('ImsAudit', 'approvedByTopMgmtDate',        "DATETIME NULL");
CALL add_column_if_missing('ImsAudit', 'approvedByTopMgmtSigned',      "TINYINT(1) NOT NULL DEFAULT 0");

-- FRM-005 audit report fields
CALL add_column_if_missing('ImsAudit', 'reportExecutiveSummary',  "TEXT NULL");
CALL add_column_if_missing('ImsAudit', 'reportAuditMethod',       "JSON NULL");
CALL add_column_if_missing('ImsAudit', 'reportPositiveFindings',  "TEXT NULL");
CALL add_column_if_missing('ImsAudit', 'reportConclusion',        "VARCHAR(50) NULL");
CALL add_column_if_missing('ImsAudit', 'reportRecommendation',    "TEXT NULL");
CALL add_column_if_missing('ImsAudit', 'reportLeadAuditorName',   "VARCHAR(100) NULL");
CALL add_column_if_missing('ImsAudit', 'reportLeadAuditorDate',   "DATETIME NULL");
CALL add_column_if_missing('ImsAudit', 'reportLeadAuditorSigned', "TINYINT(1) NOT NULL DEFAULT 0");
CALL add_column_if_missing('ImsAudit', 'reportImsMgrName',        "VARCHAR(100) NULL");
CALL add_column_if_missing('ImsAudit', 'reportImsMgrDate',        "DATETIME NULL");
CALL add_column_if_missing('ImsAudit', 'reportImsMgrSigned',      "TINYINT(1) NOT NULL DEFAULT 0");

-- ── 2. HEXA-FRM-026 — Audit Checklist Library ──────────────

CREATE TABLE IF NOT EXISTS `ImsChecklistQuestion` (
  `id`           CHAR(36)      NOT NULL,
  `questionText` TEXT          NOT NULL,
  `processArea`  VARCHAR(50)   NOT NULL,
  `isoClause`    VARCHAR(100)  NOT NULL,
  `evidenceType` VARCHAR(30)   NOT NULL,
  `riskLevel`    VARCHAR(10)   NOT NULL DEFAULT 'Medium',
  `isActive`     TINYINT(1)    NOT NULL DEFAULT 1,
  `createdAt`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdById`  CHAR(36)      NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_clq_process_area` (`processArea`),
  INDEX `idx_clq_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. HEXA-FRM-006 — Audit Checklist (execution workspace) ─

CREATE TABLE IF NOT EXISTS `ImsAuditChecklist` (
  `id`      CHAR(36)  NOT NULL,
  `auditId` CHAR(36)  NOT NULL UNIQUE,

  -- Section A
  `scopeStatement`     TEXT         NULL,
  `referenceDocs`      JSON         NULL,
  `notificationDate`   DATETIME     NULL,
  `notificationMethod` VARCHAR(20)  NULL,

  -- Section B
  `openingMeetingDate`    DATETIME     NULL,
  `openingAttendees`      JSON         NULL,
  `openingAgendaItems`    TEXT         NULL,
  `scopeChangesAgreed`    TEXT         NULL,
  `auditeeRepOpeningName` VARCHAR(100) NULL,
  `auditeeRepOpeningDate` DATETIME     NULL,

  -- Section C sampling log
  `recordsReviewed`      JSON NULL,
  `personnelInterviewed` JSON NULL,

  -- Section D
  `closingMeetingDate`     DATETIME     NULL,
  `closingAttendees`       JSON         NULL,
  `preliminaryFindings`    TEXT         NULL,
  `auditeeAcceptsFindings` TINYINT(1)   NULL,
  `disagreementNature`     TEXT         NULL,
  `auditeeRepClosingName`  VARCHAR(100) NULL,
  `auditeeRepClosingDate`  DATETIME     NULL,

  `status`    VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `createdAt` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdById` CHAR(36)  NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_iac_audit` (`auditId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ImsAuditChecklistRow` (
  `id`           CHAR(36)     NOT NULL,
  `checklistId`  CHAR(36)     NOT NULL,
  `questionId`   CHAR(36)     NULL,
  `questionText` TEXT         NOT NULL,
  `isoClause`    VARCHAR(100) NOT NULL,
  `result`       VARCHAR(20)  NULL,
  `evidence`     TEXT         NULL,
  `attachmentUrl` VARCHAR(500) NULL,
  `sortOrder`    INT          NOT NULL DEFAULT 0,
  `createdAt`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_iacr_checklist` (`checklistId`),
  INDEX `idx_iacr_question`  (`questionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. HEXA-FRM-024 — OFI & Observation Register ───────────

CREATE TABLE IF NOT EXISTS `ImsOfiEntry` (
  `id`               CHAR(36)     NOT NULL,
  `findingNumber`    VARCHAR(60)  NOT NULL UNIQUE,
  `auditId`          CHAR(36)     NULL,
  `auditNumber`      VARCHAR(20)  NULL,
  `findingType`      VARCHAR(20)  NOT NULL,
  `processArea`      VARCHAR(50)  NOT NULL,
  `description`      TEXT         NOT NULL,
  `potentialBenefit` TEXT         NULL,
  `assignedToId`     CHAR(36)     NULL,
  `targetReviewDate` DATETIME     NULL,
  `status`           VARCHAR(30)  NOT NULL DEFAULT 'Open',
  `notes`            TEXT         NULL,
  `createdAt`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdById`      CHAR(36)     NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_ofi_status`      (`status`),
  INDEX `idx_ofi_audit`       (`auditId`),
  INDEX `idx_ofi_process_area`(`processArea`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. HEXA-FRM-025 — Corrective Action & Verification Record

CREATE TABLE IF NOT EXISTS `ImsCarRecord` (
  `id`              CHAR(36)     NOT NULL,
  `carNumber`       VARCHAR(30)  NOT NULL UNIQUE,
  `linkedNcrId`     CHAR(36)     NULL,
  `linkedNcrNumber` VARCHAR(30)  NULL,
  `ncStatement`     TEXT         NULL,

  `rootCauseMethod` VARCHAR(20)  NULL,
  `rootCauseText`   TEXT         NULL,

  `actionPlan`    TEXT         NULL,
  `responsibleId` CHAR(36)     NULL,
  `targetDate`    DATETIME     NULL,

  `status`       VARCHAR(30)  NOT NULL DEFAULT 'Draft',

  `verificationDate`   DATETIME     NULL,
  `verificationMethod` VARCHAR(30)  NULL,
  `verificationResult` VARCHAR(30)  NULL,
  `verifiedByName`     VARCHAR(100) NULL,
  `verifiedById`       CHAR(36)     NULL,

  `createdAt`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdById` CHAR(36) NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_car_status`   (`status`),
  INDEX `idx_car_ncr`      (`linkedNcrId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ImsCarProgressLog` (
  `id`          CHAR(36)     NOT NULL,
  `carId`       CHAR(36)     NOT NULL,
  `date`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateText`  TEXT         NOT NULL,
  `evidenceUrl` VARCHAR(500) NULL,
  `userId`      CHAR(36)     NULL,
  `userName`    VARCHAR(100) NULL,
  `createdAt`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_cpl_car` (`carId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
