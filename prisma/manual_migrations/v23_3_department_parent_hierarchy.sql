-- v23.3.0 — Department parent hierarchy
-- Adds parentId self-reference so departments can be nested (e.g. sub-departments).
-- Used by the HR Organization Chart departmental view.

DROP PROCEDURE IF EXISTS migrate_department_parent_hierarchy;

DELIMITER //
CREATE PROCEDURE migrate_department_parent_hierarchy()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name   = 'Department'
      AND column_name  = 'parentId'
  ) THEN
    ALTER TABLE `Department`
      ADD COLUMN `parentId` CHAR(36) NULL,
      ADD INDEX  `Department_parentId_idx` (`parentId`),
      ADD CONSTRAINT `Department_parentId_fkey`
        FOREIGN KEY (`parentId`) REFERENCES `Department` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END //
DELIMITER ;

CALL migrate_department_parent_hierarchy();
DROP PROCEDURE IF EXISTS migrate_department_parent_hierarchy;
