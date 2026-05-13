-- Monthly expense forecast table for cash-out planning per year.

DELIMITER $$

DROP PROCEDURE IF EXISTS create_fin_expense_forecast$$

CREATE PROCEDURE create_fin_expense_forecast()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'fin_expense_forecast'
    ) THEN
        CREATE TABLE `fin_expense_forecast` (
            `id`         INT AUTO_INCREMENT PRIMARY KEY,
            `year`       SMALLINT      NOT NULL,
            `category`   VARCHAR(100)  NOT NULL,
            `sort_order` SMALLINT      NOT NULL DEFAULT 0,
            `jan_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `feb_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `mar_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `apr_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `may_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `jun_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `jul_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `aug_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `sep_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `oct_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `nov_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `dec_amt`    DECIMAL(14,2) NOT NULL DEFAULT 0,
            `notes`      VARCHAR(500)  NULL,
            `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `uk_year_category` (`year`, `category`),
            INDEX `idx_year` (`year`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    END IF;
END$$

DELIMITER ;

CALL create_fin_expense_forecast();
DROP PROCEDURE IF EXISTS create_fin_expense_forecast;
