-- v32.0.0 — MIR Workflow Notifications + Shipment Evaluation Bank
-- Part A: Add dolibarr_soc_id to material_inspection_receipts
-- Part B: Create mir_shipment_evaluations table
-- Part C: Seed WorkflowDefinition for MIR_INSPECTION (3 steps)

-- ── Part A: dolibarr_soc_id on material_inspection_receipts ─────────────────

DROP PROCEDURE IF EXISTS mir_add_dolibarr_soc_id;
DELIMITER $$
CREATE PROCEDURE mir_add_dolibarr_soc_id()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'material_inspection_receipts'
      AND COLUMN_NAME  = 'dolibarr_soc_id'
  ) THEN
    ALTER TABLE `material_inspection_receipts`
      ADD COLUMN `dolibarr_soc_id` INT NULL COMMENT 'FK to dolibarr_thirdparties.dolibarr_id'
      AFTER `supplier_name`;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'material_inspection_receipts'
      AND INDEX_NAME   = 'idx_mir_soc_id'
  ) THEN
    ALTER TABLE `material_inspection_receipts`
      ADD INDEX `idx_mir_soc_id` (`dolibarr_soc_id`);
  END IF;
END$$
DELIMITER ;
CALL mir_add_dolibarr_soc_id();
DROP PROCEDURE IF EXISTS mir_add_dolibarr_soc_id;

-- ── Part B: mir_shipment_evaluations table ───────────────────────────────────

DROP PROCEDURE IF EXISTS create_mir_shipment_evaluations;
DELIMITER $$
CREATE PROCEDURE create_mir_shipment_evaluations()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'mir_shipment_evaluations'
  ) THEN
    CREATE TABLE `mir_shipment_evaluations` (
      `id`                  CHAR(36)     NOT NULL,
      `mir_id`              CHAR(36)     NOT NULL COMMENT 'FK to material_inspection_receipts.id',
      `dolibarr_id`         INT          NOT NULL COMMENT 'FK to dolibarr_thirdparties.dolibarr_id',
      `evaluation_date`     DATE         NOT NULL,
      `score_quality`       TINYINT      NOT NULL DEFAULT 3 COMMENT '30% — Total Shipment Quality',
      `score_otif`          TINYINT      NOT NULL DEFAULT 3 COMMENT '25% — On Time In Full',
      `score_service`       TINYINT      NOT NULL DEFAULT 3 COMMENT '15% — Service & Communication',
      `score_documentation` TINYINT      NOT NULL DEFAULT 3 COMMENT '15% — Documentation & Compliance',
      `score_hse`           TINYINT      NOT NULL DEFAULT 3 COMMENT '10% — HSE & Ethics',
      `score_stacking`      TINYINT      NOT NULL DEFAULT 3 COMMENT '5%  — Stacking & Packaging',
      `notes_quality`       TEXT         NULL,
      `notes_otif`          TEXT         NULL,
      `notes_service`       TEXT         NULL,
      `notes_documentation` TEXT         NULL,
      `notes_hse`           TEXT         NULL,
      `notes_stacking`      TEXT         NULL,
      `general_notes`       TEXT         NULL,
      `weighted_score`      DECIMAL(6,2) NOT NULL COMMENT 'out of 100',
      `rating`              VARCHAR(1)   NOT NULL COMMENT 'A/B/C/D',
      `outcome`             VARCHAR(20)  NOT NULL COMMENT 'APPROVED/CONDITIONAL/SUSPENDED/REJECTED',
      `evaluator_id`        CHAR(36)     NULL,
      `created_by_id`       CHAR(36)     NOT NULL,
      `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updated_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      UNIQUE INDEX `uq_mse_mir`    (`mir_id`),
      INDEX `idx_mse_dolibarr`     (`dolibarr_id`),
      INDEX `idx_mse_date`         (`evaluation_date`),
      INDEX `idx_mse_rating`       (`rating`),
      CONSTRAINT `fk_mse_mir`        FOREIGN KEY (`mir_id`)        REFERENCES `material_inspection_receipts`(`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_mse_evaluator`  FOREIGN KEY (`evaluator_id`)  REFERENCES `User`(`id`) ON DELETE SET NULL,
      CONSTRAINT `fk_mse_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_mir_shipment_evaluations();
DROP PROCEDURE IF EXISTS create_mir_shipment_evaluations;

-- ── Part C: Seed WorkflowDefinition for MIR_INSPECTION ──────────────────────

DROP PROCEDURE IF EXISTS seed_mir_inspection_workflow;
DELIMITER $$
CREATE PROCEDURE seed_mir_inspection_workflow()
BEGIN
  DECLARE def_id CHAR(36);
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'WorkflowDefinition'
  ) AND NOT EXISTS (
    SELECT 1 FROM WorkflowDefinition
    WHERE `key` = 'MIR_INSPECTION' AND deletedAt IS NULL
  ) THEN
    SET def_id = UUID();
    INSERT INTO WorkflowDefinition
      (id, `key`, name, description, entityType, version, isActive, createdAt, updatedAt)
    VALUES (
      def_id,
      'MIR_INSPECTION',
      'Material Inspection Receipt',
      'Three-step MIR workflow: Inspector submits → Reviewer reviews → Approver approves/rejects. Designated personnel are resolved by PBAC permissions.',
      'MaterialInspectionReceipt',
      1, 1, NOW(), NOW()
    );

    INSERT INTO WorkflowStep
      (id, definitionId, sequence, name, approverResolver, minApprovals, slaHours, onRejectBehavior, createdAt, updatedAt)
    VALUES (
      UUID(), def_id, 1, 'Inspector Submission',
      '{"type":"PBAC_PERMISSION","permission":"quality.mir.inspect"}',
      1, 48, 'RETURN_PREVIOUS', NOW(), NOW()
    );

    INSERT INTO WorkflowStep
      (id, definitionId, sequence, name, approverResolver, minApprovals, slaHours, onRejectBehavior, createdAt, updatedAt)
    VALUES (
      UUID(), def_id, 2, 'QC Review',
      '{"type":"PBAC_PERMISSION","permission":"quality.mir.review"}',
      1, 48, 'RETURN_PREVIOUS', NOW(), NOW()
    );

    INSERT INTO WorkflowStep
      (id, definitionId, sequence, name, approverResolver, minApprovals, slaHours, onRejectBehavior, createdAt, updatedAt)
    VALUES (
      UUID(), def_id, 3, 'Final Approval',
      '{"type":"PBAC_PERMISSION","permission":"quality.mir.approve"}',
      1, 72, 'TERMINATE', NOW(), NOW()
    );
  END IF;
END$$
DELIMITER ;
CALL seed_mir_inspection_workflow();
DROP PROCEDURE IF EXISTS seed_mir_inspection_workflow;
