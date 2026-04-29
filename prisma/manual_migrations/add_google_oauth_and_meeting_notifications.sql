-- 22.2.0 — Google Calendar OAuth token + Meeting notification types

-- ──────────────────────────────────────────────────────────────────────────────
-- GoogleOAuthToken (singleton row — id=1 always)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_google_oauth_token;
DELIMITER $$
CREATE PROCEDURE create_google_oauth_token()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'GoogleOAuthToken'
  ) THEN
    CREATE TABLE GoogleOAuthToken (
      id           INT          NOT NULL AUTO_INCREMENT,
      accessToken  TEXT         NOT NULL,
      refreshToken TEXT         NOT NULL,
      expiresAt    DATETIME(3)  NOT NULL,
      email        VARCHAR(255) NOT NULL,
      createdAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_google_oauth_token();
DROP PROCEDURE IF EXISTS create_google_oauth_token;

-- ──────────────────────────────────────────────────────────────────────────────
-- Extend NotificationType enum with meeting notification values
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS extend_notification_type_enum;
DELIMITER $$
CREATE PROCEDURE extend_notification_type_enum()
BEGIN
  DECLARE col_type TEXT;
  SELECT COLUMN_TYPE INTO col_type
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Notification'
    AND COLUMN_NAME = 'type';

  IF col_type NOT LIKE '%MEETING_INVITED%' THEN
    ALTER TABLE Notification
      MODIFY COLUMN type ENUM(
        'TASK_ASSIGNED','TASK_COMPLETED','APPROVAL_REQUIRED','DEADLINE_WARNING',
        'APPROVED','REJECTED','SYSTEM','TASK_MESSAGE','ANNOUNCEMENT',
        'MEETING_INVITED','MEETING_UPDATED','MEETING_CANCELLED'
      ) NOT NULL;
  END IF;
END$$
DELIMITER ;
CALL extend_notification_type_enum();
DROP PROCEDURE IF EXISTS extend_notification_type_enum;

-- Also update UserNotificationPreference if it has a type column referencing the enum
DROP PROCEDURE IF EXISTS extend_notification_pref_enum;
DELIMITER $$
CREATE PROCEDURE extend_notification_pref_enum()
BEGIN
  DECLARE col_exists INT DEFAULT 0;
  DECLARE col_type TEXT;

  SELECT COUNT(*) INTO col_exists
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'UserNotificationPreference'
    AND COLUMN_NAME = 'notificationType';

  IF col_exists > 0 THEN
    SELECT COLUMN_TYPE INTO col_type
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'UserNotificationPreference'
      AND COLUMN_NAME = 'notificationType';

    IF col_type NOT LIKE '%MEETING_INVITED%' THEN
      ALTER TABLE UserNotificationPreference
        MODIFY COLUMN notificationType ENUM(
          'TASK_ASSIGNED','TASK_COMPLETED','APPROVAL_REQUIRED','DEADLINE_WARNING',
          'APPROVED','REJECTED','SYSTEM','TASK_MESSAGE','ANNOUNCEMENT',
          'MEETING_INVITED','MEETING_UPDATED','MEETING_CANCELLED'
        ) NOT NULL;
    END IF;
  END IF;
END$$
DELIMITER ;
CALL extend_notification_pref_enum();
DROP PROCEDURE IF EXISTS extend_notification_pref_enum;
