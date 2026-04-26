-- Workflow Engine (21.0.0)
-- Creates WorkflowDefinition, WorkflowStep, WorkflowInstance,
-- WorkflowStepInstance, WorkflowApproval tables.

-- ── WorkflowDefinition ────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_workflow_definition_table;
DELIMITER $$
CREATE PROCEDURE add_workflow_definition_table()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'WorkflowDefinition'
  ) THEN
    CREATE TABLE `WorkflowDefinition` (
      `id`          CHAR(36)     NOT NULL,
      `key`         VARCHAR(100) NOT NULL,
      `name`        VARCHAR(200) NOT NULL,
      `description` TEXT         NULL,
      `entityType`  VARCHAR(100) NOT NULL,
      `version`     INT          NOT NULL DEFAULT 1,
      `isActive`    TINYINT(1)   NOT NULL DEFAULT 1,
      `siteId`      VARCHAR(100) NULL,
      `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `deletedAt`   DATETIME(3)  NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `WorkflowDefinition_key_key` (`key`),
      INDEX `WorkflowDefinition_entityType_idx` (`entityType`),
      INDEX `WorkflowDefinition_isActive_idx` (`isActive`),
      INDEX `WorkflowDefinition_deletedAt_idx` (`deletedAt`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL add_workflow_definition_table();
DROP PROCEDURE IF EXISTS add_workflow_definition_table;

-- ── WorkflowStep ──────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_workflow_step_table;
DELIMITER $$
CREATE PROCEDURE add_workflow_step_table()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'WorkflowStep'
  ) THEN
    CREATE TABLE `WorkflowStep` (
      `id`               CHAR(36)     NOT NULL,
      `definitionId`     CHAR(36)     NOT NULL,
      `sequence`         INT          NOT NULL,
      `name`             VARCHAR(200) NOT NULL,
      `approverResolver` JSON         NOT NULL,
      `minApprovals`     INT          NOT NULL DEFAULT 1,
      `slaHours`         INT          NULL,
      `onRejectBehavior` VARCHAR(30)  NOT NULL DEFAULT 'RETURN_PREVIOUS',
      `conditions`       JSON         NULL,
      `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      INDEX `WorkflowStep_definitionId_sequence_idx` (`definitionId`, `sequence`),
      CONSTRAINT `fk_wfstep_definition` FOREIGN KEY (`definitionId`)
        REFERENCES `WorkflowDefinition`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL add_workflow_step_table();
DROP PROCEDURE IF EXISTS add_workflow_step_table;

-- ── WorkflowInstance ──────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_workflow_instance_table;
DELIMITER $$
CREATE PROCEDURE add_workflow_instance_table()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'WorkflowInstance'
  ) THEN
    CREATE TABLE `WorkflowInstance` (
      `id`                CHAR(36)     NOT NULL,
      `definitionId`      CHAR(36)     NOT NULL,
      `definitionVersion` INT          NOT NULL,
      `entityType`        VARCHAR(100) NOT NULL,
      `entityId`          VARCHAR(100) NOT NULL,
      `currentStepId`     CHAR(36)     NULL,
      `status`            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
      `initiatedById`     CHAR(36)     NOT NULL,
      `metadata`          JSON         NULL,
      `siteId`            VARCHAR(100) NULL,
      `cancelReason`      TEXT         NULL,
      `cancelledById`     CHAR(36)     NULL,
      `cancelledAt`       DATETIME(3)  NULL,
      `completedAt`       DATETIME(3)  NULL,
      `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      INDEX `WorkflowInstance_entityType_entityId_idx` (`entityType`, `entityId`),
      INDEX `WorkflowInstance_status_idx` (`status`),
      INDEX `WorkflowInstance_definitionId_idx` (`definitionId`),
      INDEX `WorkflowInstance_initiatedById_idx` (`initiatedById`),
      CONSTRAINT `fk_wfinst_definition` FOREIGN KEY (`definitionId`)
        REFERENCES `WorkflowDefinition`(`id`),
      CONSTRAINT `fk_wfinst_initiatedBy` FOREIGN KEY (`initiatedById`)
        REFERENCES `User`(`id`),
      CONSTRAINT `fk_wfinst_cancelledBy` FOREIGN KEY (`cancelledById`)
        REFERENCES `User`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL add_workflow_instance_table();
DROP PROCEDURE IF EXISTS add_workflow_instance_table;

-- ── WorkflowStepInstance ──────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_workflow_step_instance_table;
DELIMITER $$
CREATE PROCEDURE add_workflow_step_instance_table()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'WorkflowStepInstance'
  ) THEN
    CREATE TABLE `WorkflowStepInstance` (
      `id`                CHAR(36)    NOT NULL,
      `instanceId`        CHAR(36)    NOT NULL,
      `stepId`            CHAR(36)    NOT NULL,
      `sequence`          INT         NOT NULL,
      `status`            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      `resolvedApprovers` JSON        NULL,
      `requiredApprovals` INT         NOT NULL DEFAULT 1,
      `receivedApprovals` INT         NOT NULL DEFAULT 0,
      `skipReason`        TEXT        NULL,
      `activatedAt`       DATETIME(3) NULL,
      `completedAt`       DATETIME(3) NULL,
      `createdAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      INDEX `WorkflowStepInstance_instanceId_sequence_idx` (`instanceId`, `sequence`),
      INDEX `WorkflowStepInstance_status_idx` (`status`),
      INDEX `WorkflowStepInstance_instanceId_idx` (`instanceId`),
      CONSTRAINT `fk_wfsi_instance` FOREIGN KEY (`instanceId`)
        REFERENCES `WorkflowInstance`(`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_wfsi_step` FOREIGN KEY (`stepId`)
        REFERENCES `WorkflowStep`(`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL add_workflow_step_instance_table();
DROP PROCEDURE IF EXISTS add_workflow_step_instance_table;

-- ── WorkflowApproval ──────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_workflow_approval_table;
DELIMITER $$
CREATE PROCEDURE add_workflow_approval_table()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'WorkflowApproval'
  ) THEN
    CREATE TABLE `WorkflowApproval` (
      `id`                CHAR(36)    NOT NULL,
      `stepInstanceId`    CHAR(36)    NOT NULL,
      `userId`            CHAR(36)    NOT NULL,
      `decision`          VARCHAR(20) NOT NULL,
      `comment`           TEXT        NULL,
      `delegatedToUserId` CHAR(36)    NULL,
      `createdAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      INDEX `WorkflowApproval_stepInstanceId_idx` (`stepInstanceId`),
      INDEX `WorkflowApproval_userId_idx` (`userId`),
      CONSTRAINT `fk_wfa_stepInstance` FOREIGN KEY (`stepInstanceId`)
        REFERENCES `WorkflowStepInstance`(`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_wfa_user` FOREIGN KEY (`userId`)
        REFERENCES `User`(`id`),
      CONSTRAINT `fk_wfa_delegatedTo` FOREIGN KEY (`delegatedToUserId`)
        REFERENCES `User`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL add_workflow_approval_table();
DROP PROCEDURE IF EXISTS add_workflow_approval_table;
