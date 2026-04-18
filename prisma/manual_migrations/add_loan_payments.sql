-- Add LoanPayment table for manual/adjusted loan payment recording
-- Idempotent: uses IF NOT EXISTS guard via information_schema

DROP PROCEDURE IF EXISTS add_loan_payments_migration;
DELIMITER $$
CREATE PROCEDURE add_loan_payments_migration()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'LoanPayment'
  ) THEN
    CREATE TABLE LoanPayment (
      id           CHAR(36)      NOT NULL,
      loanId       CHAR(36)      NOT NULL,
      paymentType  VARCHAR(20)   NOT NULL DEFAULT 'SCHEDULED',
      amount       DECIMAL(12,2) NOT NULL,
      paymentDate  DATE          NOT NULL,
      notes        VARCHAR(500)  NULL,
      createdById  CHAR(36)      NOT NULL,
      createdAt    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY LoanPayment_loanId_idx (loanId),
      KEY LoanPayment_paymentDate_idx (paymentDate),
      CONSTRAINT LoanPayment_loanId_fkey
        FOREIGN KEY (loanId) REFERENCES Loan (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT LoanPayment_createdById_fkey
        FOREIGN KEY (createdById) REFERENCES User (id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL add_loan_payments_migration();
DROP PROCEDURE IF EXISTS add_loan_payments_migration;
