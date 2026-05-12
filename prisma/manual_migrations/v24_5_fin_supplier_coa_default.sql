-- Ensure fin_supplier_coa_default exists for supplier portal COA mapping.
-- This table is referenced by getSupplierOverview but was previously created
-- lazily via the financial API route, causing "Supplier not found" errors when
-- the financial route had never been called.

DELIMITER $$

DROP PROCEDURE IF EXISTS ensure_fin_supplier_coa_default$$

CREATE PROCEDURE ensure_fin_supplier_coa_default()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'fin_supplier_coa_default'
    ) THEN
        CREATE TABLE fin_supplier_coa_default (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            supplier_dolibarr_id INT          NOT NULL COMMENT 'FK to dolibarr_thirdparties.dolibarr_id',
            coa_account_code     VARCHAR(20)  NOT NULL COMMENT 'FK to fin_chart_of_accounts.account_code',
            notes                TEXT         NULL,
            created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by           INT          NULL,
            UNIQUE KEY uk_supplier_coa (supplier_dolibarr_id),
            INDEX idx_coa_account (coa_account_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    END IF;
END$$

DELIMITER ;

CALL ensure_fin_supplier_coa_default();
DROP PROCEDURE IF EXISTS ensure_fin_supplier_coa_default;
