-- 22.2.0 — Gap 6: Corrective Action lifecycle on NCRReport (ISO 10002 §10.2)

-- ── Add CA columns to NCRReport ───────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_ncr_ca_fields;
DELIMITER $$
CREATE PROCEDURE add_ncr_ca_fields()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'NCRReport' AND COLUMN_NAME = 'caRequired'
  ) THEN
    ALTER TABLE `NCRReport`
      ADD COLUMN `caRequired`            TINYINT(1)   NOT NULL DEFAULT 0,
      ADD COLUMN `caRootCause`           TEXT         NULL,
      ADD COLUMN `caAction`              TEXT         NULL,
      ADD COLUMN `caVerificationMethod`  VARCHAR(255) NULL,
      ADD COLUMN `caEffectivenessRating` VARCHAR(30)  NULL,
      ADD COLUMN `caClosedAt`            DATETIME(3)  NULL,
      ADD COLUMN `caResponsibleId`       CHAR(36)     NULL,
      ADD COLUMN `caTargetDate`          DATETIME(3)  NULL,
      ADD COLUMN `caWorkflowInstanceId`  CHAR(36)     NULL;
  END IF;
END$$
DELIMITER ;
CALL add_ncr_ca_fields();
DROP PROCEDURE IF EXISTS add_ncr_ca_fields;

-- ── Add FK index for caResponsibleId ─────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_ncr_ca_resp_index;
DELIMITER $$
CREATE PROCEDURE add_ncr_ca_resp_index()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'NCRReport'
      AND INDEX_NAME = 'NCRReport_caResponsibleId_idx'
  ) THEN
    ALTER TABLE `NCRReport`
      ADD INDEX `NCRReport_caResponsibleId_idx` (`caResponsibleId`),
      ADD INDEX `NCRReport_caWorkflowInstanceId_idx` (`caWorkflowInstanceId`);
  END IF;
END$$
DELIMITER ;
CALL add_ncr_ca_resp_index();
DROP PROCEDURE IF EXISTS add_ncr_ca_resp_index;

-- ── Add FK constraint for caResponsibleId → User ─────────────────────────────
DROP PROCEDURE IF EXISTS add_ncr_ca_resp_fk;
DELIMITER $$
CREATE PROCEDURE add_ncr_ca_resp_fk()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'NCRReport'
      AND CONSTRAINT_NAME = 'fk_ncr_ca_responsible'
  ) THEN
    ALTER TABLE `NCRReport`
      ADD CONSTRAINT `fk_ncr_ca_responsible`
        FOREIGN KEY (`caResponsibleId`) REFERENCES `User`(`id`) ON DELETE SET NULL;
  END IF;
END$$
DELIMITER ;
CALL add_ncr_ca_resp_fk();
DROP PROCEDURE IF EXISTS add_ncr_ca_resp_fk;

-- ── Seed WorkflowDefinition for ncr-corrective-action ────────────────────────
DROP PROCEDURE IF EXISTS seed_ncr_ca_workflow;
DELIMITER $$
CREATE PROCEDURE seed_ncr_ca_workflow()
BEGIN
  DECLARE v_def_id CHAR(36);
  DECLARE v_s1_id  CHAR(36);
  DECLARE v_s2_id  CHAR(36);
  DECLARE v_s3_id  CHAR(36);

  -- Only seed if the WorkflowDefinition table exists and this key isn't seeded yet
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'WorkflowDefinition'
  ) AND NOT EXISTS (
    SELECT 1 FROM `WorkflowDefinition` WHERE `key` = 'ncr-corrective-action'
  ) THEN
    SET v_def_id = UUID();
    SET v_s1_id  = UUID();
    SET v_s2_id  = UUID();
    SET v_s3_id  = UUID();

    INSERT INTO `WorkflowDefinition`
      (`id`, `key`, `name`, `description`, `entityType`, `version`, `isActive`, `createdAt`, `updatedAt`)
    VALUES (
      v_def_id,
      'ncr-corrective-action',
      'NCR Corrective Action Workflow',
      'ISO 10002 §10.2 three-step CA lifecycle: Root Cause Analysis → CA Implementation → Effectiveness Verification',
      'NCRReport',
      1,
      1,
      NOW(),
      NOW()
    );

    -- Step 1: Root Cause Analysis (SLA 72h) — Department Head resolver
    INSERT INTO `WorkflowStep`
      (`id`, `definitionId`, `sequence`, `name`, `approverResolver`, `minApprovals`, `slaHours`, `onRejectBehavior`, `createdAt`, `updatedAt`)
    VALUES (
      v_s1_id, v_def_id, 1,
      'Root Cause Analysis',
      '{"type":"DEPARTMENT_HEAD"}',
      1, 72, 'RETURN_PREVIOUS',
      NOW(), NOW()
    );

    -- Step 2: CA Implementation (SLA 168h) — Fixed user from NCR.caResponsibleId field
    INSERT INTO `WorkflowStep`
      (`id`, `definitionId`, `sequence`, `name`, `approverResolver`, `minApprovals`, `slaHours`, `onRejectBehavior`, `createdAt`, `updatedAt`)
    VALUES (
      v_s2_id, v_def_id, 2,
      'CA Implementation',
      '{"type":"FIXED_USER","fieldRef":"caResponsibleId"}',
      1, 168, 'RETURN_PREVIOUS',
      NOW(), NOW()
    );

    -- Step 3: Effectiveness Verification (SLA 48h) — QA/QC Manager by permission
    INSERT INTO `WorkflowStep`
      (`id`, `definitionId`, `sequence`, `name`, `approverResolver`, `minApprovals`, `slaHours`, `onRejectBehavior`, `createdAt`, `updatedAt`)
    VALUES (
      v_s3_id, v_def_id, 3,
      'Effectiveness Verification',
      '{"type":"PBAC_PERMISSION","permission":"qc.ncr.manage"}',
      1, 48, 'RETURN_PREVIOUS',
      NOW(), NOW()
    );
  END IF;
END$$
DELIMITER ;
CALL seed_ncr_ca_workflow();
DROP PROCEDURE IF EXISTS seed_ncr_ca_workflow;
