-- 21.1.0 — Loan approval workflow
-- 1. Add PENDING_APPROVAL to Loan.status enum
-- 2. Seed the hr-loan-approval WorkflowDefinition (2 steps: manager → HR manager)

DROP PROCEDURE IF EXISTS add_loan_pending_approval_status;
DELIMITER $$
CREATE PROCEDURE add_loan_pending_approval_status()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Loan'
      AND COLUMN_NAME  = 'status'
      AND COLUMN_TYPE LIKE '%PENDING_APPROVAL%'
  ) THEN
    ALTER TABLE Loan
      MODIFY COLUMN status
        ENUM('ACTIVE','COMPLETED','CANCELLED','PENDING_APPROVAL')
        NOT NULL DEFAULT 'ACTIVE';
  END IF;
END$$
DELIMITER ;
CALL add_loan_pending_approval_status();
DROP PROCEDURE IF EXISTS add_loan_pending_approval_status;

DROP PROCEDURE IF EXISTS seed_hr_loan_approval_workflow;
DELIMITER $$
CREATE PROCEDURE seed_hr_loan_approval_workflow()
BEGIN
  DECLARE def_id CHAR(36);
  IF NOT EXISTS (
    SELECT 1 FROM WorkflowDefinition
    WHERE `key` = 'hr-loan-approval' AND deletedAt IS NULL
  ) THEN
    SET def_id = UUID();
    INSERT INTO WorkflowDefinition
      (id, `key`, name, description, entityType, version, isActive, createdAt, updatedAt)
    VALUES
      (def_id, 'hr-loan-approval', 'HR Loan Approval',
       'Two-step approval: direct manager then HR manager',
       'Loan', 1, 1, NOW(), NOW());

    -- Step 1: direct manager of the submitting user
    INSERT INTO WorkflowStep
      (id, definitionId, sequence, name, approverResolver, minApprovals, slaHours, onRejectBehavior, createdAt, updatedAt)
    VALUES
      (UUID(), def_id, 1, 'Direct Manager Approval',
       '{"type":"MANAGER_OF_INITIATOR"}',
       1, 72, 'TERMINATE', NOW(), NOW());

    -- Step 2: any user with hr.loans.manage permission (HR manager / CEO)
    INSERT INTO WorkflowStep
      (id, definitionId, sequence, name, approverResolver, minApprovals, slaHours, onRejectBehavior, createdAt, updatedAt)
    VALUES
      (UUID(), def_id, 2, 'HR Manager Approval',
       '{"type":"PBAC_PERMISSION","permission":"hr.loans.manage"}',
       1, 120, 'TERMINATE', NOW(), NOW());
  END IF;
END$$
DELIMITER ;
CALL seed_hr_loan_approval_workflow();
DROP PROCEDURE IF EXISTS seed_hr_loan_approval_workflow;
