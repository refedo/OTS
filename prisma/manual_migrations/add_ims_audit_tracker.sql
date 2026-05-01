-- 22.2.0 — Gap 3: Internal Audit Tracker (ISO 9001 §9.2)

-- ── ImsAuditPlan ──────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_audit_plan;
DELIMITER $$
CREATE PROCEDURE create_ims_audit_plan()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsAuditPlan'
  ) THEN
    CREATE TABLE `ImsAuditPlan` (
      `id`          CHAR(36)    NOT NULL PRIMARY KEY,
      `planNumber`  VARCHAR(20) NOT NULL UNIQUE,
      `year`        INT         NOT NULL,
      `auditType`   VARCHAR(30) NOT NULL DEFAULT 'Internal',
      `status`      VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
      `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `createdById` CHAR(36)    NULL,
      INDEX `idx_iap_year`   (`year`),
      INDEX `idx_iap_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_audit_plan();
DROP PROCEDURE IF EXISTS create_ims_audit_plan;

-- ── ImsAudit ──────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_audit;
DELIMITER $$
CREATE PROCEDURE create_ims_audit()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsAudit'
  ) THEN
    CREATE TABLE `ImsAudit` (
      `id`            CHAR(36)     NOT NULL PRIMARY KEY,
      `planId`        CHAR(36)     NOT NULL,
      `auditNumber`   VARCHAR(20)  NOT NULL UNIQUE,
      `scope`         VARCHAR(255) NOT NULL,
      `clausesCovered` JSON        NULL,
      `scheduledDate` DATETIME(3)  NOT NULL,
      `actualDate`    DATETIME(3)  NULL,
      `auditorId`     CHAR(36)     NULL,
      `auditeeId`     CHAR(36)     NULL,
      `status`        VARCHAR(20)  NOT NULL DEFAULT 'SCHEDULED',
      `summary`       TEXT         NULL,
      `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `createdById`   CHAR(36)     NULL,
      INDEX `idx_ia_plan`    (`planId`),
      INDEX `idx_ia_status`  (`status`),
      INDEX `idx_ia_sched`   (`scheduledDate`),
      CONSTRAINT `fk_ia_plan`    FOREIGN KEY (`planId`)     REFERENCES `ImsAuditPlan`(`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_ia_auditor` FOREIGN KEY (`auditorId`)  REFERENCES `User`(`id`) ON DELETE SET NULL,
      CONSTRAINT `fk_ia_auditee` FOREIGN KEY (`auditeeId`)  REFERENCES `User`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_audit();
DROP PROCEDURE IF EXISTS create_ims_audit;

-- ── ImsAuditFinding ───────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_audit_finding;
DELIMITER $$
CREATE PROCEDURE create_ims_audit_finding()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsAuditFinding'
  ) THEN
    CREATE TABLE `ImsAuditFinding` (
      `id`               CHAR(36)    NOT NULL PRIMARY KEY,
      `auditId`          CHAR(36)    NOT NULL,
      `findingNumber`    VARCHAR(30) NOT NULL,
      `type`             VARCHAR(20) NOT NULL,
      `clause`           VARCHAR(30) NOT NULL,
      `description`      TEXT        NOT NULL,
      `evidence`         TEXT        NULL,
      `correctiveAction` TEXT        NULL,
      `responsibleId`    CHAR(36)    NULL,
      `targetDate`       DATETIME(3) NULL,
      `closedAt`         DATETIME(3) NULL,
      `closureEvidence`  TEXT        NULL,
      `status`           VARCHAR(20) NOT NULL DEFAULT 'OPEN',
      `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX `idx_iaf_audit`  (`auditId`),
      INDEX `idx_iaf_status` (`status`),
      CONSTRAINT `fk_iaf_audit` FOREIGN KEY (`auditId`) REFERENCES `ImsAudit`(`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_iaf_resp` FOREIGN KEY (`responsibleId`) REFERENCES `User`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_audit_finding();
DROP PROCEDURE IF EXISTS create_ims_audit_finding;
