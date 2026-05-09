-- ============================================================
-- v24.0.0 — IMS Non-Product NCR (QA NCR)
-- Form: HEXA-FRM-023 | Procedure: Hexa-ISP-005 | ISO §10.2
-- ============================================================

CREATE TABLE IF NOT EXISTS `ImsNcr` (
  `id`               CHAR(36)       NOT NULL,
  `ncrNumber`        VARCHAR(30)    NOT NULL UNIQUE,

  -- Source: can be standalone or linked to an audit finding
  `auditFindingId`   CHAR(36)       NULL,
  `auditId`          CHAR(36)       NULL,
  `auditNumber`      VARCHAR(20)    NULL,          -- denormalised for display
  `department`       VARCHAR(100)   NULL,          -- denormalised from audit scope

  -- NCR Details
  `title`            VARCHAR(255)   NOT NULL,
  `description`      TEXT           NOT NULL,
  `category`         VARCHAR(50)    NOT NULL DEFAULT 'System',   -- System, Process, Service, Safety, Environmental
  `severity`         VARCHAR(20)    NOT NULL DEFAULT 'Medium',   -- Low, Medium, High, Critical
  `status`           VARCHAR(30)    NOT NULL DEFAULT 'OPEN',     -- OPEN, IN_PROGRESS, CLOSED

  -- Root Cause & CAPA
  `rootCause`        TEXT           NULL,
  `correctiveAction` TEXT           NULL,
  `preventiveAction` TEXT           NULL,
  `caVerificationMethod` VARCHAR(255) NULL,
  `caEffectivenessRating` VARCHAR(30) NULL,       -- EFFECTIVE, PARTIALLY_EFFECTIVE, INEFFECTIVE

  -- Timeline
  `deadline`         DATETIME       NOT NULL,
  `closedAt`         DATETIME       NULL,

  -- People
  `raisedById`       CHAR(36)       NOT NULL,
  `assignedToId`     CHAR(36)       NULL,
  `closedById`       CHAR(36)       NULL,
  `caResponsibleId`  CHAR(36)       NULL,
  `caTargetDate`     DATETIME       NULL,

  `createdAt`        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_ims_ncr_status` (`status`),
  INDEX `idx_ims_ncr_deadline` (`deadline`),
  INDEX `idx_ims_ncr_audit_finding` (`auditFindingId`),
  INDEX `idx_ims_ncr_audit` (`auditId`),
  INDEX `idx_ims_ncr_raised_by` (`raisedById`),
  INDEX `idx_ims_ncr_number` (`ncrNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
