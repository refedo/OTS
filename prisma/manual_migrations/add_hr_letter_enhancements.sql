-- 19.1.0 — HR Letter Enhancements
-- Adds CEO approval workflow + per-type serial number config to HR Letters
-- Idempotent: stored-procedure pattern throughout

DROP PROCEDURE IF EXISTS add_hr_letter_enhancements;
DELIMITER $$
CREATE PROCEDURE add_hr_letter_enhancements()
BEGIN
  -- status column on HrLetter (PENDING_CEO is the default for new letters)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetter' AND COLUMN_NAME = 'status'
  ) THEN
    ALTER TABLE HrLetter
      ADD COLUMN status ENUM('DRAFT','PENDING_CEO','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_CEO';
    CREATE INDEX HrLetter_status_idx ON HrLetter(status);
  END IF;

  -- language column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetter' AND COLUMN_NAME = 'language'
  ) THEN
    ALTER TABLE HrLetter
      ADD COLUMN language ENUM('ARABIC','ENGLISH','BILINGUAL') NOT NULL DEFAULT 'ARABIC';
  END IF;

  -- approvedById
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetter' AND COLUMN_NAME = 'approvedById'
  ) THEN
    ALTER TABLE HrLetter ADD COLUMN approvedById CHAR(36) NULL;
    ALTER TABLE HrLetter
      ADD CONSTRAINT fk_hr_letter_approved_by
      FOREIGN KEY (approvedById) REFERENCES User(id) ON DELETE SET NULL;
  END IF;

  -- approvedAt
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetter' AND COLUMN_NAME = 'approvedAt'
  ) THEN
    ALTER TABLE HrLetter ADD COLUMN approvedAt DATETIME(3) NULL;
  END IF;

  -- rejectedById
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetter' AND COLUMN_NAME = 'rejectedById'
  ) THEN
    ALTER TABLE HrLetter ADD COLUMN rejectedById CHAR(36) NULL;
    ALTER TABLE HrLetter
      ADD CONSTRAINT fk_hr_letter_rejected_by
      FOREIGN KEY (rejectedById) REFERENCES User(id) ON DELETE SET NULL;
  END IF;

  -- rejectedAt
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetter' AND COLUMN_NAME = 'rejectedAt'
  ) THEN
    ALTER TABLE HrLetter ADD COLUMN rejectedAt DATETIME(3) NULL;
  END IF;

  -- rejectionReason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetter' AND COLUMN_NAME = 'rejectionReason'
  ) THEN
    ALTER TABLE HrLetter ADD COLUMN rejectionReason VARCHAR(500) NULL;
  END IF;

  -- HrLetterSerialConfig table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetterSerialConfig'
  ) THEN
    CREATE TABLE HrLetterSerialConfig (
      id            CHAR(36)     NOT NULL,
      letterType    ENUM(
        'QUESTIONING','ATTENTION','FIRST_WARNING','FINAL_WARNING',
        'NON_RENEWAL_NOTICE','DISMISSAL','CIRCULATION','WORK_COMMENCEMENT',
        'SALARY_CERTIFICATE','LEAVE_NOTICE','RETURN_FROM_LEAVE',
        'PROBATION_EVALUATION','PERFORMANCE_APPRAISAL','CLEARANCE_FORM',
        'SALARY_NON_DISCLOSURE','OTHER'
      ) NOT NULL,
      prefix        VARCHAR(20)  NOT NULL,
      mask          VARCHAR(100) NOT NULL DEFAULT '{PREFIX}-{YY}-{NNNN}',
      currentSeq    INT          NOT NULL DEFAULT 0,
      lastResetYear INT          NULL,
      resetYearly   TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY HrLetterSerialConfig_letterType_key (letterType)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL add_hr_letter_enhancements();
DROP PROCEDURE IF EXISTS add_hr_letter_enhancements;
