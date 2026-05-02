-- Migration: Add IMS Safety tables (FRM-024 Incidents, FRM-025 Emergency Drills, FRM-026 Toolbox Talks)
-- Sprint 22.7.0

DROP PROCEDURE IF EXISTS add_ims_safety;
DELIMITER $$
CREATE PROCEDURE add_ims_safety()
BEGIN
  -- ImsIncident
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsIncident') THEN

    CREATE TABLE `ImsIncident` (
      `id`               CHAR(36)     NOT NULL,
      `incidentNumber`   VARCHAR(30)  NOT NULL,
      `title`            VARCHAR(255) NOT NULL,
      `incidentType`     VARCHAR(40)  NOT NULL,
      `incidentDate`     DATETIME(3)  NOT NULL,
      `location`         VARCHAR(255) NULL,
      `description`      TEXT         NULL,
      `immediateAction`  TEXT         NULL,
      `rootCause`        TEXT         NULL,
      `correctiveAction` TEXT         NULL,
      `preventiveAction` TEXT         NULL,
      `reportedById`     CHAR(36)     NULL,
      `severity`         VARCHAR(20)  NOT NULL DEFAULT 'LOW',
      `status`           VARCHAR(30)  NOT NULL DEFAULT 'OPEN',
      `closedAt`         DATETIME(3)  NULL,
      `deletedAt`        DATETIME(3)  NULL,
      `deletedById`      CHAR(36)     NULL,
      `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`        DATETIME(3)  NOT NULL,
      `createdById`      CHAR(36)     NULL,
      PRIMARY KEY (`id`),
      UNIQUE INDEX `ImsIncident_incidentNumber_key` (`incidentNumber`),
      INDEX `ImsIncident_incidentType_idx` (`incidentType`),
      INDEX `ImsIncident_severity_idx` (`severity`),
      INDEX `ImsIncident_status_idx` (`status`),
      INDEX `ImsIncident_incidentDate_idx` (`incidentDate`),
      INDEX `ImsIncident_deletedAt_idx` (`deletedAt`),
      CONSTRAINT `ImsIncident_reportedById_fkey`
        FOREIGN KEY (`reportedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `ImsIncident_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  END IF;

  -- ImsEmergencyDrill
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsEmergencyDrill') THEN

    CREATE TABLE `ImsEmergencyDrill` (
      `id`                CHAR(36)     NOT NULL,
      `drillNumber`       VARCHAR(30)  NOT NULL,
      `drillType`         VARCHAR(50)  NOT NULL,
      `scheduledDate`     DATETIME(3)  NULL,
      `conductedDate`     DATETIME(3)  NULL,
      `location`          VARCHAR(255) NULL,
      `participantCount`  INT          NULL,
      `objectives`        TEXT         NULL,
      `findings`          TEXT         NULL,
      `correctiveActions` TEXT         NULL,
      `conductedById`     CHAR(36)     NULL,
      `status`            VARCHAR(20)  NOT NULL DEFAULT 'PLANNED',
      `notes`             TEXT         NULL,
      `deletedAt`         DATETIME(3)  NULL,
      `deletedById`       CHAR(36)     NULL,
      `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`         DATETIME(3)  NOT NULL,
      `createdById`       CHAR(36)     NULL,
      PRIMARY KEY (`id`),
      UNIQUE INDEX `ImsEmergencyDrill_drillNumber_key` (`drillNumber`),
      INDEX `ImsEmergencyDrill_drillType_idx` (`drillType`),
      INDEX `ImsEmergencyDrill_status_idx` (`status`),
      INDEX `ImsEmergencyDrill_deletedAt_idx` (`deletedAt`),
      CONSTRAINT `ImsEmergencyDrill_conductedById_fkey`
        FOREIGN KEY (`conductedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `ImsEmergencyDrill_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  END IF;

  -- ImsToolboxTalk
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsToolboxTalk') THEN

    CREATE TABLE `ImsToolboxTalk` (
      `id`              CHAR(36)     NOT NULL,
      `talkNumber`      VARCHAR(30)  NOT NULL,
      `topic`           VARCHAR(255) NOT NULL,
      `conductedDate`   DATETIME(3)  NULL,
      `location`        VARCHAR(255) NULL,
      `attendeeCount`   INT          NULL,
      `durationMinutes` INT          NULL,
      `content`         TEXT         NULL,
      `followUpActions` TEXT         NULL,
      `conductedById`   CHAR(36)     NULL,
      `status`          VARCHAR(20)  NOT NULL DEFAULT 'PLANNED',
      `notes`           TEXT         NULL,
      `deletedAt`       DATETIME(3)  NULL,
      `deletedById`     CHAR(36)     NULL,
      `createdAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`       DATETIME(3)  NOT NULL,
      `createdById`     CHAR(36)     NULL,
      PRIMARY KEY (`id`),
      UNIQUE INDEX `ImsToolboxTalk_talkNumber_key` (`talkNumber`),
      INDEX `ImsToolboxTalk_status_idx` (`status`),
      INDEX `ImsToolboxTalk_conductedDate_idx` (`conductedDate`),
      INDEX `ImsToolboxTalk_deletedAt_idx` (`deletedAt`),
      CONSTRAINT `ImsToolboxTalk_conductedById_fkey`
        FOREIGN KEY (`conductedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT `ImsToolboxTalk_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  END IF;
END$$
DELIMITER ;

CALL add_ims_safety();
DROP PROCEDURE IF EXISTS add_ims_safety;
