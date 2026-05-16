-- Add operationsManagerId to Project table
SET @col1 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'Project'
        AND column_name = 'operationsManagerId'
    ),
    'SELECT 1',
    'ALTER TABLE `Project` ADD COLUMN `operationsManagerId` CHAR(36) NULL AFTER `salesEngineerId`'
  )
);
PREPARE s1 FROM @col1; EXECUTE s1; DEALLOCATE PREPARE s1;

-- Add FK index for operationsManagerId
SET @idx1 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'Project'
        AND index_name = 'Project_operationsManagerId_idx'
    ),
    'SELECT 1',
    'CREATE INDEX `Project_operationsManagerId_idx` ON `Project`(`operationsManagerId`)'
  )
);
PREPARE si1 FROM @idx1; EXECUTE si1; DEALLOCATE PREPARE si1;

-- Create ProjectValidation table
SET @tbl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'ProjectValidation'
    ),
    'SELECT 1',
    'CREATE TABLE `ProjectValidation` (
      `id` CHAR(36) NOT NULL,
      `projectId` CHAR(36) NOT NULL,
      `salesValidatedById` CHAR(36) NULL,
      `salesValidatedAt` DATETIME(3) NULL,
      `projectsValidatedById` CHAR(36) NULL,
      `projectsValidatedAt` DATETIME(3) NULL,
      `operationsValidatedById` CHAR(36) NULL,
      `operationsValidatedAt` DATETIME(3) NULL,
      `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      UNIQUE KEY `ProjectValidation_projectId_key` (`projectId`),
      INDEX `ProjectValidation_projectId_idx` (`projectId`),
      CONSTRAINT `ProjectValidation_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  )
);
PREPARE stbl FROM @tbl; EXECUTE stbl; DEALLOCATE PREPARE stbl;

-- Add PROJECT_VALIDATION_REQUIRED to NotificationType enum if not present
SET @enum_alter = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'Notification'
        AND column_name = 'type'
        AND column_type LIKE '%PROJECT_VALIDATION_REQUIRED%'
    ),
    'SELECT 1',
    "ALTER TABLE `Notification` MODIFY COLUMN `type` ENUM(
      'TASK_ASSIGNED','TASK_COMPLETED','APPROVAL_REQUIRED','DEADLINE_WARNING',
      'APPROVED','REJECTED','SYSTEM','TASK_MESSAGE','ANNOUNCEMENT',
      'MEETING_INVITED','MEETING_UPDATED','MEETING_CANCELLED','PROJECT_VALIDATION_REQUIRED'
    ) NOT NULL"
  )
);
PREPARE senum FROM @enum_alter; EXECUTE senum; DEALLOCATE PREPARE senum;

-- Also update NotificationPreference.notificationType enum
SET @enum_alter2 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'NotificationPreference'
        AND column_name = 'notificationType'
        AND column_type LIKE '%PROJECT_VALIDATION_REQUIRED%'
    ),
    'SELECT 1',
    "ALTER TABLE `NotificationPreference` MODIFY COLUMN `notificationType` ENUM(
      'TASK_ASSIGNED','TASK_COMPLETED','APPROVAL_REQUIRED','DEADLINE_WARNING',
      'APPROVED','REJECTED','SYSTEM','TASK_MESSAGE','ANNOUNCEMENT',
      'MEETING_INVITED','MEETING_UPDATED','MEETING_CANCELLED','PROJECT_VALIDATION_REQUIRED'
    ) NOT NULL"
  )
);
PREPARE senum2 FROM @enum_alter2; EXECUTE senum2; DEALLOCATE PREPARE senum2;
