-- Add operationsManagerId to Project table
SET @col1 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'project'
        AND column_name = 'operationsManagerId'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `operationsManagerId` CHAR(36) NULL AFTER `salesEngineerId`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'project' LIMIT 1)
  )
);
PREPARE s1 FROM @col1; EXECUTE s1; DEALLOCATE PREPARE s1;

-- Add FK index for operationsManagerId
SET @idx1 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'project'
        AND index_name = 'Project_operationsManagerId_idx'
    ),
    'SELECT 1',
    (SELECT CONCAT('CREATE INDEX `Project_operationsManagerId_idx` ON `', table_name, '`(`operationsManagerId`)')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'project' LIMIT 1)
  )
);
PREPARE si1 FROM @idx1; EXECUTE si1; DEALLOCATE PREPARE si1;

-- Create ProjectValidation table (only if it doesn't exist)
SET @tbl_exists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND LOWER(table_name) = 'projectvalidation'
);

SET @project_table = (
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = DATABASE() AND LOWER(table_name) = 'project' LIMIT 1
);

SET @create_tbl = IF(
  @tbl_exists = 0,
  CONCAT(
    'CREATE TABLE `ProjectValidation` (',
    '`id` CHAR(36) NOT NULL,',
    '`projectId` CHAR(36) NOT NULL,',
    '`salesValidatedById` CHAR(36) NULL,',
    '`salesValidatedAt` DATETIME(3) NULL,',
    '`projectsValidatedById` CHAR(36) NULL,',
    '`projectsValidatedAt` DATETIME(3) NULL,',
    '`operationsValidatedById` CHAR(36) NULL,',
    '`operationsValidatedAt` DATETIME(3) NULL,',
    '`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),',
    '`updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),',
    'PRIMARY KEY (`id`),',
    'UNIQUE KEY `ProjectValidation_projectId_key` (`projectId`),',
    'INDEX `ProjectValidation_projectId_idx` (`projectId`),',
    'CONSTRAINT `ProjectValidation_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `', @project_table, '` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
    ') DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  ),
  'SELECT 1'
);
PREPARE stbl FROM @create_tbl; EXECUTE stbl; DEALLOCATE PREPARE stbl;

-- Add PROJECT_VALIDATION_REQUIRED to Notification.type enum (case-insensitive table lookup)
SET @notif_table = (
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = DATABASE() AND LOWER(table_name) = 'notification' LIMIT 1
);

SET @notif_col_type = (
  SELECT column_type FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND LOWER(table_name) = 'notification'
    AND column_name = 'type'
  LIMIT 1
);

SET @enum_alter = IF(
  @notif_table IS NOT NULL AND (@notif_col_type IS NULL OR @notif_col_type NOT LIKE '%PROJECT_VALIDATION_REQUIRED%'),
  CONCAT(
    "ALTER TABLE `", @notif_table, "` MODIFY COLUMN `type` ENUM(",
    "'TASK_ASSIGNED','TASK_COMPLETED','APPROVAL_REQUIRED','DEADLINE_WARNING',",
    "'APPROVED','REJECTED','SYSTEM','TASK_MESSAGE','ANNOUNCEMENT',",
    "'MEETING_INVITED','MEETING_UPDATED','MEETING_CANCELLED','PROJECT_VALIDATION_REQUIRED'",
    ") NOT NULL"
  ),
  'SELECT 1'
);
PREPARE senum FROM @enum_alter; EXECUTE senum; DEALLOCATE PREPARE senum;

-- Add PROJECT_VALIDATION_REQUIRED to NotificationPreference.notificationType enum
SET @pref_table = (
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = DATABASE() AND LOWER(table_name) = 'notificationpreference' LIMIT 1
);

SET @pref_col_type = (
  SELECT column_type FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND LOWER(table_name) = 'notificationpreference'
    AND column_name = 'notificationType'
  LIMIT 1
);

SET @enum_alter2 = IF(
  @pref_table IS NOT NULL AND (@pref_col_type IS NULL OR @pref_col_type NOT LIKE '%PROJECT_VALIDATION_REQUIRED%'),
  CONCAT(
    "ALTER TABLE `", @pref_table, "` MODIFY COLUMN `notificationType` ENUM(",
    "'TASK_ASSIGNED','TASK_COMPLETED','APPROVAL_REQUIRED','DEADLINE_WARNING',",
    "'APPROVED','REJECTED','SYSTEM','TASK_MESSAGE','ANNOUNCEMENT',",
    "'MEETING_INVITED','MEETING_UPDATED','MEETING_CANCELLED','PROJECT_VALIDATION_REQUIRED'",
    ") NOT NULL"
  ),
  'SELECT 1'
);
PREPARE senum2 FROM @enum_alter2; EXECUTE senum2; DEALLOCATE PREPARE senum2;
