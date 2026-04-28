-- 22.1.0 — Meetings Module
-- Tracks all company meetings: sales, operations, project, HR, management review, etc.

-- ──────────────────────────────────────────────────────────────────────────────
-- Meeting
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_meeting;
DELIMITER $$
CREATE PROCEDURE create_meeting()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Meeting'
  ) THEN
    CREATE TABLE Meeting (
      id             CHAR(36)     NOT NULL PRIMARY KEY,
      category       VARCHAR(50)  NOT NULL,
      categoryCustom VARCHAR(150) NULL,
      subject        VARCHAR(255) NOT NULL,
      status         VARCHAR(30)  NOT NULL DEFAULT 'scheduled',
      scheduledAt    DATETIME(3)  NOT NULL,
      endsAt         DATETIME(3)  NOT NULL,
      location       VARCHAR(255) NULL,
      meetLink       VARCHAR(500) NULL,
      googleEventId  VARCHAR(255) NULL,
      agenda         TEXT         NULL,
      minutes        TEXT         NULL,
      decisions      TEXT         NULL,
      isPrivate      TINYINT(1)   NOT NULL DEFAULT 0,
      organizerId    CHAR(36)     NOT NULL,
      departmentId   CHAR(36)     NULL,
      createdById    CHAR(36)     NOT NULL,
      updatedById    CHAR(36)     NULL,
      deletedAt      DATETIME(3)  NULL,
      deletedById    CHAR(36)     NULL,
      createdAt      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_meeting_category    (category),
      INDEX idx_meeting_status      (status),
      INDEX idx_meeting_scheduledAt (scheduledAt),
      INDEX idx_meeting_organizerId (organizerId),
      INDEX idx_meeting_deptId      (departmentId),
      INDEX idx_meeting_deletedAt   (deletedAt),
      CONSTRAINT fk_meeting_organizer   FOREIGN KEY (organizerId)  REFERENCES User(id),
      CONSTRAINT fk_meeting_department  FOREIGN KEY (departmentId) REFERENCES Department(id),
      CONSTRAINT fk_meeting_createdBy   FOREIGN KEY (createdById)  REFERENCES User(id),
      CONSTRAINT fk_meeting_updatedBy   FOREIGN KEY (updatedById)  REFERENCES User(id),
      CONSTRAINT fk_meeting_deletedBy   FOREIGN KEY (deletedById)  REFERENCES User(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_meeting();
DROP PROCEDURE IF EXISTS create_meeting;

-- ──────────────────────────────────────────────────────────────────────────────
-- MeetingAttendee
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_meeting_attendee;
DELIMITER $$
CREATE PROCEDURE create_meeting_attendee()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MeetingAttendee'
  ) THEN
    CREATE TABLE MeetingAttendee (
      id         CHAR(36)    NOT NULL PRIMARY KEY,
      meetingId  CHAR(36)    NOT NULL,
      userId     CHAR(36)    NOT NULL,
      status     VARCHAR(30) NOT NULL DEFAULT 'invited',
      isRequired TINYINT(1)  NOT NULL DEFAULT 1,
      createdAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_meeting_attendee (meetingId, userId),
      INDEX idx_ma_meetingId (meetingId),
      INDEX idx_ma_userId    (userId),
      CONSTRAINT fk_ma_meeting FOREIGN KEY (meetingId) REFERENCES Meeting(id) ON DELETE CASCADE,
      CONSTRAINT fk_ma_user    FOREIGN KEY (userId)    REFERENCES User(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_meeting_attendee();
DROP PROCEDURE IF EXISTS create_meeting_attendee;

-- ──────────────────────────────────────────────────────────────────────────────
-- MeetingTask
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_meeting_task;
DELIMITER $$
CREATE PROCEDURE create_meeting_task()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MeetingTask'
  ) THEN
    CREATE TABLE MeetingTask (
      id        CHAR(36)    NOT NULL PRIMARY KEY,
      meetingId CHAR(36)    NOT NULL,
      taskId    CHAR(36)    NOT NULL,
      notes     TEXT        NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_meeting_task (meetingId, taskId),
      INDEX idx_mt_meetingId (meetingId),
      INDEX idx_mt_taskId    (taskId),
      CONSTRAINT fk_mt_meeting FOREIGN KEY (meetingId) REFERENCES Meeting(id) ON DELETE CASCADE,
      CONSTRAINT fk_mt_task    FOREIGN KEY (taskId)    REFERENCES Task(id)    ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_meeting_task();
DROP PROCEDURE IF EXISTS create_meeting_task;
