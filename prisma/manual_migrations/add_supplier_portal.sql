-- Migration: Supplier & Customer Portal
-- Adds: sc_supplier_evaluations (ISO9001 Form-002), sc_supplier_payment_terms,
--       sc_customer_payment_terms, dolibarr_id column on ScApprovedSupplier

-- 1. sc_supplier_evaluations
DROP PROCEDURE IF EXISTS create_sc_supplier_evaluations;
DELIMITER $$
CREATE PROCEDURE create_sc_supplier_evaluations()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sc_supplier_evaluations'
  ) THEN
    CREATE TABLE sc_supplier_evaluations (
      id                  CHAR(36)      NOT NULL,
      dolibarr_id         INT           NOT NULL COMMENT 'FK to dolibarr_thirdparties.dolibarr_id',
      evaluation_date     DATE          NOT NULL,
      evaluation_period   VARCHAR(100)  NULL     COMMENT 'e.g. Q1 2025',
      score_quality       TINYINT       NOT NULL DEFAULT 1 COMMENT '25% weight',
      score_delivery      TINYINT       NOT NULL DEFAULT 1 COMMENT '20% weight',
      score_price         TINYINT       NOT NULL DEFAULT 1 COMMENT '20% weight',
      score_service       TINYINT       NOT NULL DEFAULT 1 COMMENT '15% weight',
      score_documentation TINYINT       NOT NULL DEFAULT 1 COMMENT '15% weight',
      score_hse           TINYINT       NOT NULL DEFAULT 1 COMMENT '5% weight',
      weighted_score      DECIMAL(6,2)  NOT NULL COMMENT 'out of 100',
      rating              VARCHAR(1)    NOT NULL COMMENT 'A/B/C/D',
      outcome             VARCHAR(20)   NOT NULL COMMENT 'APPROVED/CONDITIONAL/SUSPENDED/REJECTED',
      notes_quality       TEXT          NULL,
      notes_delivery      TEXT          NULL,
      notes_price         TEXT          NULL,
      notes_service       TEXT          NULL,
      notes_documentation TEXT          NULL,
      notes_hse           TEXT          NULL,
      general_notes       TEXT          NULL,
      evaluator_id        CHAR(36)      NULL,
      created_by_id       CHAR(36)      NULL,
      created_at          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX idx_sse_dolibarr (dolibarr_id),
      INDEX idx_sse_date     (evaluation_date),
      INDEX idx_sse_outcome  (outcome),
      INDEX idx_sse_rating   (rating)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_sc_supplier_evaluations();
DROP PROCEDURE IF EXISTS create_sc_supplier_evaluations;

-- 2. sc_supplier_payment_terms
DROP PROCEDURE IF EXISTS create_sc_supplier_payment_terms;
DELIMITER $$
CREATE PROCEDURE create_sc_supplier_payment_terms()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sc_supplier_payment_terms'
  ) THEN
    CREATE TABLE sc_supplier_payment_terms (
      id                   INT           AUTO_INCREMENT PRIMARY KEY,
      supplier_dolibarr_id INT           NOT NULL,
      net_days             INT           NOT NULL DEFAULT 30,
      discount_days        INT           NULL,
      discount_percentage  DECIMAL(5,2)  NULL,
      valid_from           DATE          NOT NULL,
      valid_to             DATE          NULL COMMENT 'NULL = currently active',
      notes                TEXT          NULL,
      created_by_id        CHAR(36)      NULL,
      created_at           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_spt_supplier (supplier_dolibarr_id),
      INDEX idx_spt_valid    (valid_from, valid_to)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_sc_supplier_payment_terms();
DROP PROCEDURE IF EXISTS create_sc_supplier_payment_terms;

-- 3. sc_customer_payment_terms
DROP PROCEDURE IF EXISTS create_sc_customer_payment_terms;
DELIMITER $$
CREATE PROCEDURE create_sc_customer_payment_terms()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sc_customer_payment_terms'
  ) THEN
    CREATE TABLE sc_customer_payment_terms (
      id                   INT           AUTO_INCREMENT PRIMARY KEY,
      customer_dolibarr_id INT           NOT NULL,
      net_days             INT           NOT NULL DEFAULT 30,
      discount_days        INT           NULL,
      discount_percentage  DECIMAL(5,2)  NULL,
      valid_from           DATE          NOT NULL,
      valid_to             DATE          NULL COMMENT 'NULL = currently active',
      notes                TEXT          NULL,
      created_by_id        CHAR(36)      NULL,
      created_at           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_cpt_customer (customer_dolibarr_id),
      INDEX idx_cpt_valid    (valid_from, valid_to)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_sc_customer_payment_terms();
DROP PROCEDURE IF EXISTS create_sc_customer_payment_terms;

-- 4. Add dolibarr_id to ScApprovedSupplier
DROP PROCEDURE IF EXISTS add_dolibarr_id_to_sc_approved_supplier;
DELIMITER $$
CREATE PROCEDURE add_dolibarr_id_to_sc_approved_supplier()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ScApprovedSupplier'
      AND COLUMN_NAME = 'dolibarr_id'
  ) THEN
    ALTER TABLE ScApprovedSupplier
      ADD COLUMN dolibarr_id INT NULL COMMENT 'Link to dolibarr_thirdparties.dolibarr_id' AFTER id,
      ADD UNIQUE INDEX ScApprovedSupplier_dolibarr_id_key (dolibarr_id);
  END IF;
END$$
DELIMITER ;
CALL add_dolibarr_id_to_sc_approved_supplier();
DROP PROCEDURE IF EXISTS add_dolibarr_id_to_sc_approved_supplier;
