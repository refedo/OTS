-- 22.2.0 — Gap 2: Management Review Report (ISO 9001/14001/45001 §9.3)

DROP PROCEDURE IF EXISTS create_ims_management_review;
DELIMITER $$
CREATE PROCEDURE create_ims_management_review()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsManagementReview'
  ) THEN
    CREATE TABLE `ImsManagementReview` (
      `id`                    CHAR(36)     NOT NULL PRIMARY KEY,
      `reviewNumber`          VARCHAR(20)  NOT NULL UNIQUE,
      `reviewDate`            DATETIME(3)  NOT NULL,
      `chairperson`           VARCHAR(255) NOT NULL,
      `status`                VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
      `period`                VARCHAR(50)  NOT NULL,
      `attendees`             JSON         NULL,
      `inputAuditResults`     JSON         NULL,
      `inputNcrSummary`       JSON         NULL,
      `inputKpiStatus`        JSON         NULL,
      `inputRiskSummary`      JSON         NULL,
      `inputObjectiveStatus`  JSON         NULL,
      `inputSupplierPerf`     JSON         NULL,
      `inputResourceStatus`   JSON         NULL,
      `inputLegalChanges`     JSON         NULL,
      `inputCustomerFeedback` JSON         NULL,
      `outputDecisions`       JSON         NULL,
      `outputObjectives`      JSON         NULL,
      `outputResourceNeeds`   JSON         NULL,
      `approvedById`          CHAR(36)     NULL,
      `approvedAt`            DATETIME(3)  NULL,
      `notes`                 TEXT         NULL,
      `deletedAt`             DATETIME(3)  NULL,
      `createdAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `createdById`           CHAR(36)     NULL,
      INDEX `idx_imr_status`   (`status`),
      INDEX `idx_imr_date`     (`reviewDate`),
      INDEX `idx_imr_deleted`  (`deletedAt`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_management_review();
DROP PROCEDURE IF EXISTS create_ims_management_review;
