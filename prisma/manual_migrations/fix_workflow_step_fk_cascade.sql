-- Fix FK on WorkflowStepInstance.stepId: change RESTRICT → CASCADE so that
-- replacing workflow steps does not fail when historical step instances exist.

DROP PROCEDURE IF EXISTS fix_wfsi_step_fk_cascade;
DELIMITER $$
CREATE PROCEDURE fix_wfsi_step_fk_cascade()
BEGIN
  -- Only run if the old RESTRICT FK still exists
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'WorkflowStepInstance'
      AND CONSTRAINT_NAME = 'fk_wfsi_step'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE `WorkflowStepInstance` DROP FOREIGN KEY `fk_wfsi_step`;
    ALTER TABLE `WorkflowStepInstance`
      ADD CONSTRAINT `fk_wfsi_step` FOREIGN KEY (`stepId`)
        REFERENCES `WorkflowStep`(`id`) ON DELETE CASCADE;
  END IF;
END$$
DELIMITER ;
CALL fix_wfsi_step_fk_cascade();
DROP PROCEDURE IF EXISTS fix_wfsi_step_fk_cascade;
