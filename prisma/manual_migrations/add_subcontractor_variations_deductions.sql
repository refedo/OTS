-- Migration: Subcontractor Variations & Deductions

-- 1. SubcontractorVariation
DROP PROCEDURE IF EXISTS create_subcontractor_variation;
DELIMITER $$
CREATE PROCEDURE create_subcontractor_variation()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SubcontractorVariation'
  ) THEN
    CREATE TABLE SubcontractorVariation (
      id              VARCHAR(30)   NOT NULL,
      contractId      CHAR(36)      NOT NULL,
      variationNumber VARCHAR(30)   NOT NULL,
      description     TEXT          NOT NULL,
      amount          DECIMAL(15,2) NOT NULL,
      status          VARCHAR(30)   NOT NULL DEFAULT 'PENDING',
      approvedById    CHAR(36)      NULL,
      approvedAt      DATETIME(3)   NULL,
      notes           TEXT          NULL,
      createdById     CHAR(36)      NOT NULL,
      createdAt       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deletedAt       DATETIME(3)   NULL,
      PRIMARY KEY (id),
      INDEX idx_scvar_contract (contractId),
      INDEX idx_scvar_status   (status),
      INDEX idx_scvar_deleted  (deletedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_subcontractor_variation();
DROP PROCEDURE IF EXISTS create_subcontractor_variation;

-- 2. SubcontractorDeduction
DROP PROCEDURE IF EXISTS create_subcontractor_deduction;
DELIMITER $$
CREATE PROCEDURE create_subcontractor_deduction()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SubcontractorDeduction'
  ) THEN
    CREATE TABLE SubcontractorDeduction (
      id             VARCHAR(30)   NOT NULL,
      contractId     CHAR(36)      NOT NULL,
      description    TEXT          NOT NULL,
      amount         DECIMAL(15,2) NOT NULL,
      deductionDate  DATE          NOT NULL,
      reason         TEXT          NULL,
      status         VARCHAR(30)   NOT NULL DEFAULT 'PENDING',
      approvedById   CHAR(36)      NULL,
      approvedAt     DATETIME(3)   NULL,
      createdById    CHAR(36)      NOT NULL,
      createdAt      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deletedAt      DATETIME(3)   NULL,
      PRIMARY KEY (id),
      INDEX idx_scded_contract (contractId),
      INDEX idx_scded_status   (status),
      INDEX idx_scded_deleted  (deletedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_subcontractor_deduction();
DROP PROCEDURE IF EXISTS create_subcontractor_deduction;
