-- Migration: Add ProjectKickoffChecklist table (HEXA-FRM-016 Project Kickoff Meeting Checklist)
-- Sprint 22.7.0

DROP PROCEDURE IF EXISTS add_project_kickoff;
DELIMITER $$
CREATE PROCEDURE add_project_kickoff()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ProjectKickoffChecklist') THEN

    CREATE TABLE `ProjectKickoffChecklist` (
      `id`                    CHAR(36)       NOT NULL,
      `projectId`             CHAR(36)       NOT NULL,
      `meetingDate`           DATETIME(3)    NULL,
      `location`              VARCHAR(255)   NULL,
      `facilitatedById`       CHAR(36)       NULL,
      `attendees`             MEDIUMTEXT     NULL,
      `agendaItems`           TEXT           NULL,
      `deliverablesDiscussed` TEXT           NULL,
      `openItems`             TEXT           NULL,
      `nextSteps`             TEXT           NULL,
      `status`                VARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
      `signedOffAt`           DATETIME(3)    NULL,
      `signedOffById`         CHAR(36)       NULL,
      `notes`                 TEXT           NULL,
      `deletedAt`             DATETIME(3)    NULL,
      `deletedById`           CHAR(36)       NULL,
      `createdAt`             DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`             DATETIME(3)    NOT NULL,
      `createdById`           CHAR(36)       NULL,
      PRIMARY KEY (`id`),
      INDEX `ProjectKickoffChecklist_projectId_idx` (`projectId`),
      INDEX `ProjectKickoffChecklist_status_idx` (`status`),
      INDEX `ProjectKickoffChecklist_deletedAt_idx` (`deletedAt`),
      CONSTRAINT `ProjectKickoffChecklist_projectId_fkey`
        FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT `ProjectKickoffChecklist_facilitatedById_fkey`
        FOREIGN KEY (`facilitatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `ProjectKickoffChecklist_signedOffById_fkey`
        FOREIGN KEY (`signedOffById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `ProjectKickoffChecklist_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  END IF;
END$$
DELIMITER ;

CALL add_project_kickoff();
DROP PROCEDURE IF EXISTS add_project_kickoff;
