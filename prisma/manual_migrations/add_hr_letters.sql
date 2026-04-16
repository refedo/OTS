-- 18.16.0 — HrLetter table (Letters & Correspondence)
-- Idempotent: uses stored-procedure pattern

DROP PROCEDURE IF EXISTS add_hr_letters_migration;
DELIMITER $$
CREATE PROCEDURE add_hr_letters_migration()
BEGIN
  -- Add HrLetterType enum column check via table existence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'HrLetter'
  ) THEN
    CREATE TABLE HrLetter (
      id             CHAR(36)     NOT NULL,
      letterNumber   VARCHAR(30)  NOT NULL,
      letterType     ENUM(
        'QUESTIONING','ATTENTION','FIRST_WARNING','FINAL_WARNING',
        'NON_RENEWAL_NOTICE','DISMISSAL','CIRCULATION','WORK_COMMENCEMENT',
        'SALARY_CERTIFICATE','LEAVE_NOTICE','RETURN_FROM_LEAVE',
        'PROBATION_EVALUATION','PERFORMANCE_APPRAISAL','CLEARANCE_FORM',
        'SALARY_NON_DISCLOSURE','OTHER'
      ) NOT NULL,
      classification ENUM('INTERNAL','EXTERNAL') NOT NULL DEFAULT 'INTERNAL',
      employeeId     CHAR(36)     NOT NULL,
      subject        VARCHAR(500) NOT NULL,
      content        TEXT         NULL,
      attachmentUrl  VARCHAR(1000) NULL,
      issuedAt       DATE         NOT NULL DEFAULT (CURDATE()),
      notes          VARCHAR(500) NULL,
      createdById    CHAR(36)     NOT NULL,
      updatedById    CHAR(36)     NULL,
      createdAt      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deletedAt      DATETIME(3)  NULL,
      deletedById    CHAR(36)     NULL,
      deleteReason   VARCHAR(500) NULL,

      PRIMARY KEY (id),
      UNIQUE KEY HrLetter_letterNumber_key (letterNumber),
      INDEX HrLetter_employeeId_idx (employeeId),
      INDEX HrLetter_letterType_classification_idx (letterType, classification),
      INDEX HrLetter_issuedAt_idx (issuedAt),
      INDEX HrLetter_deletedAt_idx (deletedAt),

      CONSTRAINT fk_hr_letter_employee FOREIGN KEY (employeeId) REFERENCES Employee(id),
      CONSTRAINT fk_hr_letter_created_by FOREIGN KEY (createdById) REFERENCES User(id),
      CONSTRAINT fk_hr_letter_updated_by FOREIGN KEY (updatedById) REFERENCES User(id),
      CONSTRAINT fk_hr_letter_deleted_by FOREIGN KEY (deletedById) REFERENCES User(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL add_hr_letters_migration();
DROP PROCEDURE IF EXISTS add_hr_letters_migration;
