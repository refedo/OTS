-- Create fin_salaries table for syncing salary data from Dolibarr
CREATE TABLE IF NOT EXISTS `fin_salaries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dolibarr_id` INT NOT NULL,
  `ref` VARCHAR(100) NULL,
  `label` VARCHAR(500) NULL,
  `fk_user` INT NULL,
  `user_name` VARCHAR(255) NULL,
  `amount` DECIMAL(20,4) NOT NULL DEFAULT 0,
  `salary` DECIMAL(20,4) NOT NULL DEFAULT 0,
  `date_start` DATE NULL,
  `date_end` DATE NULL,
  `date_payment` DATE NULL,
  `is_paid` TINYINT(1) NOT NULL DEFAULT 0,
  `fk_bank_account` INT NULL,
  `first_synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sync_hash` VARCHAR(64) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY `uk_dolibarr_id` (`dolibarr_id`),
  KEY `idx_date_start` (`date_start`),
  KEY `idx_fk_user` (`fk_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add default salary account config
INSERT IGNORE INTO `fin_config` (`config_key`, `config_value`, `description`)
VALUES ('default_salary_account', '631000', 'Default account code for salary expenses');

-- Add salary expense account to chart of accounts if not exists
INSERT IGNORE INTO `fin_chart_of_accounts` (`account_code`, `account_name`, `account_type`, `parent_code`, `is_active`)
VALUES ('631000', 'Salaries & Wages', 'expense', '600000', 1);
