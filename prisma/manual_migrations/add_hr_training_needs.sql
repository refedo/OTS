-- Migration: Add HrTrainingNeed table (HEXA-FRM-005 Training Needs Analysis)
-- Sprint 22.7.0

DROP PROCEDURE IF EXISTS add_hr_training_needs;
DELIMITER $$
CREATE PROCEDURE add_hr_training_needs()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrTrainingNeed') THEN

    CREATE TABLE `HrTrainingNeed` (
      `id`               CHAR(36)     NOT NULL,
      `employeeName`     VARCHAR(255) NOT NULL,
      `department`       VARCHAR(100) NULL,
      `roleTitle`        VARCHAR(255) NULL,
      `competencyGap`    TEXT         NOT NULL,
      `requiredTraining` TEXT         NOT NULL,
      `priority`         VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
      `targetDate`       DATETIME(3)  NULL,
      `status`           VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
      `responsibleId`    CHAR(36)     NULL,
      `notes`            TEXT         NULL,
      `deletedAt`        DATETIME(3)  NULL,
      `deletedById`      CHAR(36)     NULL,
      `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`        DATETIME(3)  NOT NULL,
      `createdById`      CHAR(36)     NULL,
      PRIMARY KEY (`id`),
      INDEX `HrTrainingNeed_status_idx` (`status`),
      INDEX `HrTrainingNeed_priority_idx` (`priority`),
      INDEX `HrTrainingNeed_deletedAt_idx` (`deletedAt`),
      CONSTRAINT `HrTrainingNeed_responsibleId_fkey`
        FOREIGN KEY (`responsibleId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `HrTrainingNeed_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  END IF;
END$$
DELIMITER ;

CALL add_hr_training_needs();
DROP PROCEDURE IF EXISTS add_hr_training_needs;
