-- ============================================================
-- 18.11.0 — Announcements System
-- Idempotent stored-procedure migration
-- Creates: announcements, announcement_targets, announcement_dismissals
-- ============================================================

DROP PROCEDURE IF EXISTS add_announcements_tables;

DELIMITER $$

CREATE PROCEDURE add_announcements_tables()
BEGIN

  -- --------------------------------------------------------
  -- 1. Add ANNOUNCEMENT to NotificationType enum (if needed)
  -- --------------------------------------------------------
  -- MySQL ENUMs are altered via MODIFY COLUMN.
  -- We check the current column definition before touching it.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'notifications'
      AND COLUMN_NAME  = 'type'
      AND COLUMN_TYPE LIKE '%ANNOUNCEMENT%'
  ) THEN
    ALTER TABLE `notifications`
      MODIFY COLUMN `type` ENUM(
        'TASK_ASSIGNED','TASK_COMPLETED','APPROVAL_REQUIRED',
        'DEADLINE_WARNING','APPROVED','REJECTED','SYSTEM',
        'TASK_MESSAGE','ANNOUNCEMENT'
      ) NOT NULL;
  END IF;

  -- Same fix for user_notification_preferences (references the same enum values)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'user_notification_preferences'
      AND COLUMN_NAME  = 'notificationType'
      AND COLUMN_TYPE LIKE '%ANNOUNCEMENT%'
  ) THEN
    ALTER TABLE `user_notification_preferences`
      MODIFY COLUMN `notificationType` ENUM(
        'TASK_ASSIGNED','TASK_COMPLETED','APPROVAL_REQUIRED',
        'DEADLINE_WARNING','APPROVED','REJECTED','SYSTEM',
        'TASK_MESSAGE','ANNOUNCEMENT'
      ) NOT NULL;
  END IF;

  -- --------------------------------------------------------
  -- 2. announcements
  -- --------------------------------------------------------
  CREATE TABLE IF NOT EXISTS `announcements` (
    `id`           char(36)                  NOT NULL,
    `serialNumber` varchar(20)               NOT NULL,
    `subject`      varchar(255)              NOT NULL,
    `content`      text                      NOT NULL,
    `startDate`    datetime(3)               NOT NULL,
    `endDate`      datetime(3)               NOT NULL,
    `bannerEnabled` tinyint(1)               NOT NULL DEFAULT 0,
    `targetType`   enum('ALL','SPECIFIC')    NOT NULL DEFAULT 'ALL',
    `isActive`     tinyint(1)               NOT NULL DEFAULT 1,
    `createdAt`    datetime(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    datetime(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `createdById`  char(36)                  NOT NULL,
    `updatedById`  char(36)                  NULL,
    `deletedAt`    datetime(3)               NULL,
    `deletedById`  char(36)                  NULL,
    `deleteReason` varchar(255)              NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `announcements_serialNumber_key` (`serialNumber`),
    KEY `announcements_isActive_idx`          (`isActive`),
    KEY `announcements_startDate_endDate_idx` (`startDate`, `endDate`),
    KEY `announcements_createdById_idx`       (`createdById`),
    CONSTRAINT `fk_ann_createdBy` FOREIGN KEY (`createdById`)
      REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_ann_updatedBy` FOREIGN KEY (`updatedById`)
      REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_ann_deletedBy` FOREIGN KEY (`deletedById`)
      REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- --------------------------------------------------------
  -- 3. announcement_targets
  -- --------------------------------------------------------
  CREATE TABLE IF NOT EXISTS `announcement_targets` (
    `id`             char(36) NOT NULL,
    `announcementId` char(36) NOT NULL,
    `userId`         char(36) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ann_targets_ann_user_key` (`announcementId`, `userId`),
    KEY `ann_targets_announcementId_idx` (`announcementId`),
    KEY `ann_targets_userId_idx`         (`userId`),
    CONSTRAINT `fk_ant_announcement` FOREIGN KEY (`announcementId`)
      REFERENCES `announcements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_ant_user` FOREIGN KEY (`userId`)
      REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- --------------------------------------------------------
  -- 4. announcement_dismissals
  -- --------------------------------------------------------
  CREATE TABLE IF NOT EXISTS `announcement_dismissals` (
    `id`             char(36)    NOT NULL,
    `announcementId` char(36)    NOT NULL,
    `userId`         char(36)    NOT NULL,
    `dismissedAt`    datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `ann_dismissals_ann_user_key` (`announcementId`, `userId`),
    KEY `ann_dismissals_announcementId_idx` (`announcementId`),
    KEY `ann_dismissals_userId_idx`         (`userId`),
    CONSTRAINT `fk_and_announcement` FOREIGN KEY (`announcementId`)
      REFERENCES `announcements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_and_user` FOREIGN KEY (`userId`)
      REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

END$$

DELIMITER ;

CALL add_announcements_tables();
DROP PROCEDURE IF EXISTS add_announcements_tables;
