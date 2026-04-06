-- Add soft delete fields to Task table
DELIMITER //
CREATE PROCEDURE add_task_soft_delete_cols()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Task' AND COLUMN_NAME = 'deletedAt'
  ) THEN
    ALTER TABLE `Task`
      ADD COLUMN `deletedAt` DATETIME NULL,
      ADD COLUMN `deletedById` CHAR(36) NULL,
      ADD COLUMN `deleteReason` VARCHAR(500) NULL;
    ALTER TABLE `Task`
      ADD CONSTRAINT `fk_task_deletedBy` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL;
  END IF;
END//
DELIMITER ;
CALL add_task_soft_delete_cols();
DROP PROCEDURE IF EXISTS add_task_soft_delete_cols;
