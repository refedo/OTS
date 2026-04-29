-- CEO Arena: private CEO workspace for brainstorming, headaches, and open loops (22.3.0)
DROP PROCEDURE IF EXISTS add_ceo_notes_table;

DELIMITER //
CREATE PROCEDURE add_ceo_notes_table()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'CeoNote'
  ) THEN
    CREATE TABLE `CeoNote` (
      `id`          CHAR(36)     NOT NULL,
      `type`        VARCHAR(30)  NOT NULL,
      `title`       VARCHAR(255) NOT NULL,
      `content`     TEXT         NOT NULL,
      `color`       VARCHAR(20)  NOT NULL DEFAULT '#fef08a',
      `priority`    VARCHAR(20)  NOT NULL DEFAULT 'medium',
      `status`      VARCHAR(30)  NOT NULL DEFAULT 'open',
      `tags`        TEXT         NULL,
      `position`    INT          NOT NULL DEFAULT 0,
      `createdById` CHAR(36)     NOT NULL,
      `resolvedAt`  DATETIME     NULL,
      `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `deletedAt`   DATETIME     NULL,
      PRIMARY KEY (`id`),
      INDEX `CeoNote_type_status_idx` (`type`, `status`),
      INDEX `CeoNote_createdById_idx` (`createdById`),
      CONSTRAINT `CeoNote_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END //
DELIMITER ;

CALL add_ceo_notes_table();
DROP PROCEDURE IF EXISTS add_ceo_notes_table;
