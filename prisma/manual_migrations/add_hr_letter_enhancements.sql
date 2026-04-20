-- 19.1.0 — HR Letter Enhancements
-- Direct ALTER TABLE approach — no stored procedures (CREATE PROCEDURE fails
-- with error 1295 in Prisma's prepared-statement protocol).
-- Each statement that fails on re-run (duplicate column 1060, duplicate key
-- 1061, duplicate FK 1826) is caught as non-fatal by the startup migration
-- runner and the startup continues normally.

ALTER TABLE HrLetter
  ADD COLUMN status ENUM('DRAFT','PENDING_CEO','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_CEO';
CREATE INDEX HrLetter_status_idx ON HrLetter(status);

ALTER TABLE HrLetter
  ADD COLUMN language ENUM('ARABIC','ENGLISH','BILINGUAL') NOT NULL DEFAULT 'ARABIC';

ALTER TABLE HrLetter ADD COLUMN approvedById CHAR(36) NULL;
ALTER TABLE HrLetter
  ADD CONSTRAINT fk_hr_letter_approved_by
  FOREIGN KEY (approvedById) REFERENCES User(id) ON DELETE SET NULL;

ALTER TABLE HrLetter ADD COLUMN approvedAt DATETIME(3) NULL;

ALTER TABLE HrLetter ADD COLUMN rejectedById CHAR(36) NULL;
ALTER TABLE HrLetter
  ADD CONSTRAINT fk_hr_letter_rejected_by
  FOREIGN KEY (rejectedById) REFERENCES User(id) ON DELETE SET NULL;

ALTER TABLE HrLetter ADD COLUMN rejectedAt DATETIME(3) NULL;

ALTER TABLE HrLetter ADD COLUMN rejectionReason VARCHAR(500) NULL;

CREATE TABLE IF NOT EXISTS `HrLetterSerialConfig` (
  `id`            CHAR(36)     NOT NULL,
  `letterType`    ENUM(
    'QUESTIONING','ATTENTION','FIRST_WARNING','FINAL_WARNING',
    'NON_RENEWAL_NOTICE','DISMISSAL','CIRCULATION','WORK_COMMENCEMENT',
    'SALARY_CERTIFICATE','LEAVE_NOTICE','RETURN_FROM_LEAVE',
    'PROBATION_EVALUATION','PERFORMANCE_APPRAISAL','CLEARANCE_FORM',
    'SALARY_NON_DISCLOSURE','OTHER'
  ) NOT NULL,
  `prefix`        VARCHAR(20)  NOT NULL,
  `mask`          VARCHAR(100) NOT NULL DEFAULT '{PREFIX}-{YY}-{NNNN}',
  `currentSeq`    INT          NOT NULL DEFAULT 0,
  `lastResetYear` INT          NULL,
  `resetYearly`   TINYINT(1)   NOT NULL DEFAULT 1,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `HrLetterSerialConfig_letterType_key` (`letterType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
