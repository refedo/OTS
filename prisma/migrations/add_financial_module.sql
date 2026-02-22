-- ============================================
-- Financial Reporting Module - Database Schema
-- ============================================

-- Chart of Accounts (user-managed)
CREATE TABLE IF NOT EXISTS fin_chart_of_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_code VARCHAR(20) NOT NULL UNIQUE,
  account_name VARCHAR(255) NOT NULL,
  account_name_ar VARCHAR(255) NULL,
  account_type ENUM('asset', 'liability', 'equity', 'revenue', 'expense') NOT NULL,
  account_category VARCHAR(100) NULL,
  parent_code VARCHAR(20) NULL,
  is_active TINYINT(1) DEFAULT 1,
  display_order INT DEFAULT 0,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_code (account_code),
  INDEX idx_account_type (account_type),
  INDEX idx_parent_code (parent_code),
  INDEX idx_account_category (account_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Financial Configuration (key-value store)
CREATE TABLE IF NOT EXISTS fin_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NULL,
  description VARCHAR(500) NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer Invoices (mirror from Dolibarr)
CREATE TABLE IF NOT EXISTS fin_customer_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dolibarr_id INT NOT NULL UNIQUE,
  ref VARCHAR(50) NULL,
  ref_client VARCHAR(255) NULL,
  socid INT NULL,
  type TINYINT DEFAULT 0,
  status TINYINT DEFAULT 0,
  is_paid TINYINT(1) DEFAULT 0,
  total_ht DECIMAL(20,8) DEFAULT 0,
  total_tva DECIMAL(20,8) DEFAULT 0,
  total_ttc DECIMAL(20,8) DEFAULT 0,
  date_invoice DATE NULL,
  date_due DATE NULL,
  date_creation DATETIME NULL,
  currency_code VARCHAR(3) DEFAULT 'SAR',
  dolibarr_raw JSON NULL,
  first_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_hash VARCHAR(32) NULL,
  is_active TINYINT(1) DEFAULT 1,
  INDEX idx_dolibarr_id (dolibarr_id),
  INDEX idx_ref (ref),
  INDEX idx_socid (socid),
  INDEX idx_status (status),
  INDEX idx_date_invoice (date_invoice),
  INDEX idx_date_due (date_due),
  INDEX idx_is_paid (is_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer Invoice Lines
CREATE TABLE IF NOT EXISTS fin_customer_invoice_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_dolibarr_id INT NOT NULL,
  line_id INT NULL,
  fk_product INT NULL,
  product_ref VARCHAR(128) NULL,
  product_label VARCHAR(255) NULL,
  qty DECIMAL(20,8) DEFAULT 0,
  unit_price_ht DECIMAL(20,8) DEFAULT 0,
  vat_rate DECIMAL(7,4) DEFAULT 0,
  total_ht DECIMAL(20,8) DEFAULT 0,
  total_tva DECIMAL(20,8) DEFAULT 0,
  total_ttc DECIMAL(20,8) DEFAULT 0,
  accounting_code VARCHAR(32) NULL,
  INDEX idx_invoice_dolibarr_id (invoice_dolibarr_id),
  INDEX idx_fk_product (fk_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supplier Invoices (mirror from Dolibarr)
CREATE TABLE IF NOT EXISTS fin_supplier_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dolibarr_id INT NOT NULL UNIQUE,
  ref VARCHAR(50) NULL,
  ref_supplier VARCHAR(255) NULL,
  socid INT NULL,
  type TINYINT DEFAULT 0,
  status TINYINT DEFAULT 0,
  is_paid TINYINT(1) DEFAULT 0,
  total_ht DECIMAL(20,8) DEFAULT 0,
  total_tva DECIMAL(20,8) DEFAULT 0,
  total_ttc DECIMAL(20,8) DEFAULT 0,
  date_invoice DATE NULL,
  date_due DATE NULL,
  date_creation DATETIME NULL,
  currency_code VARCHAR(3) DEFAULT 'SAR',
  dolibarr_raw JSON NULL,
  first_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_hash VARCHAR(32) NULL,
  is_active TINYINT(1) DEFAULT 1,
  INDEX idx_dolibarr_id (dolibarr_id),
  INDEX idx_ref (ref),
  INDEX idx_socid (socid),
  INDEX idx_status (status),
  INDEX idx_date_invoice (date_invoice),
  INDEX idx_date_due (date_due),
  INDEX idx_is_paid (is_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supplier Invoice Lines
CREATE TABLE IF NOT EXISTS fin_supplier_invoice_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_dolibarr_id INT NOT NULL,
  line_id INT NULL,
  fk_product INT NULL,
  product_ref VARCHAR(128) NULL,
  product_label VARCHAR(255) NULL,
  qty DECIMAL(20,8) DEFAULT 0,
  unit_price_ht DECIMAL(20,8) DEFAULT 0,
  vat_rate DECIMAL(7,4) DEFAULT 0,
  total_ht DECIMAL(20,8) DEFAULT 0,
  total_tva DECIMAL(20,8) DEFAULT 0,
  total_ttc DECIMAL(20,8) DEFAULT 0,
  accounting_code VARCHAR(32) NULL,
  INDEX idx_invoice_dolibarr_id (invoice_dolibarr_id),
  INDEX idx_fk_product (fk_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments (customer + supplier)
CREATE TABLE IF NOT EXISTS fin_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dolibarr_ref VARCHAR(50) NULL,
  payment_type ENUM('customer', 'supplier') NOT NULL,
  invoice_dolibarr_id INT NOT NULL,
  amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(20) NULL,
  fk_bank_line INT NULL,
  bank_account_id INT NULL,
  first_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_type (payment_type),
  INDEX idx_invoice_dolibarr_id (invoice_dolibarr_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_bank_account_id (bank_account_id),
  UNIQUE KEY uk_payment (dolibarr_ref, payment_type, invoice_dolibarr_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank Accounts (mirror from Dolibarr)
CREATE TABLE IF NOT EXISTS fin_bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dolibarr_id INT NOT NULL UNIQUE,
  ref VARCHAR(50) NULL,
  label VARCHAR(255) NULL,
  bank_name VARCHAR(255) NULL,
  account_number VARCHAR(50) NULL,
  iban VARCHAR(50) NULL,
  bic VARCHAR(20) NULL,
  currency_code VARCHAR(3) DEFAULT 'SAR',
  balance DECIMAL(20,8) DEFAULT 0,
  accounting_journal VARCHAR(10) NULL,
  is_open TINYINT(1) DEFAULT 1,
  first_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_hash VARCHAR(32) NULL,
  INDEX idx_dolibarr_id (dolibarr_id),
  INDEX idx_account_number (account_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal Entries (auto-generated from invoices & payments)
CREATE TABLE IF NOT EXISTS fin_journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_date DATE NOT NULL,
  journal_code VARCHAR(10) NOT NULL,
  piece_num INT NULL,
  account_code VARCHAR(20) NOT NULL,
  label VARCHAR(500) NULL,
  debit DECIMAL(20,8) DEFAULT 0,
  credit DECIMAL(20,8) DEFAULT 0,
  source_type VARCHAR(30) NULL,
  source_id INT NULL,
  source_ref VARCHAR(100) NULL,
  thirdparty_id INT NULL,
  currency_code VARCHAR(3) DEFAULT 'SAR',
  is_locked TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entry_date (entry_date),
  INDEX idx_account_code (account_code),
  INDEX idx_journal_code (journal_code),
  INDEX idx_source (source_type, source_id),
  INDEX idx_piece_num (piece_num),
  INDEX idx_thirdparty_id (thirdparty_id),
  INDEX idx_is_locked (is_locked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Financial Sync Log
CREATE TABLE IF NOT EXISTS fin_sync_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  status ENUM('success', 'error', 'partial') NOT NULL,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_unchanged INT DEFAULT 0,
  records_deactivated INT DEFAULT 0,
  records_total INT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  error_message TEXT NULL,
  triggered_by VARCHAR(50) DEFAULT 'manual',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity_type (entity_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default configuration values
INSERT IGNORE INTO fin_config (config_key, config_value, description) VALUES
  ('default_ar_account', '411000', 'Default Accounts Receivable account code'),
  ('default_ap_account', '401000', 'Default Accounts Payable account code'),
  ('default_revenue_account', '701000', 'Default Revenue account code'),
  ('default_expense_account', '601000', 'Default Expense/COGS account code'),
  ('vat_output_15_account', '445711', 'VAT Output 15% account code'),
  ('vat_output_5_account', '445712', 'VAT Output 5% account code'),
  ('vat_input_15_account', '445661', 'VAT Input 15% account code'),
  ('vat_input_5_account', '445662', 'VAT Input 5% account code'),
  ('sync_enabled', 'true', 'Enable financial data sync'),
  ('sync_interval_hours', '2', 'Sync interval in hours'),
  ('last_full_sync', NULL, 'Last full financial sync timestamp');

-- Insert sample chart of accounts (Saudi standard)
INSERT IGNORE INTO fin_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_category, display_order) VALUES
  -- Assets
  ('100000', 'Fixed Assets', 'الأصول الثابتة', 'asset', 'Fixed Assets', 100),
  ('120000', 'Bank & Cash', 'البنوك والنقد', 'asset', 'Bank & Cash', 120),
  ('411000', 'Accounts Receivable - Trade', 'ذمم مدينة تجارية', 'asset', 'Accounts Receivable', 200),
  ('445661', 'VAT Input 15%', 'ضريبة مدخلات 15%', 'asset', 'Accounts Receivable', 210),
  ('445662', 'VAT Input 5%', 'ضريبة مدخلات 5%', 'asset', 'Accounts Receivable', 211),
  -- Liabilities
  ('401000', 'Accounts Payable - Trade', 'ذمم دائنة تجارية', 'liability', 'Accounts Payable', 300),
  ('445711', 'VAT Output 15%', 'ضريبة مخرجات 15%', 'liability', 'VAT Payable', 310),
  ('445712', 'VAT Output 5%', 'ضريبة مخرجات 5%', 'liability', 'VAT Payable', 311),
  -- Equity
  ('500000', 'Share Capital', 'رأس المال', 'equity', 'Share Capital', 400),
  ('510000', 'Retained Earnings', 'أرباح مبقاة', 'equity', 'Retained Earnings', 410),
  -- Revenue
  ('701000', 'Steel Products Sales', 'مبيعات منتجات الحديد', 'revenue', 'Sales Revenue', 500),
  ('701001', 'Services Revenue', 'إيرادات الخدمات', 'revenue', 'Sales Revenue', 501),
  ('709000', 'Other Income', 'إيرادات أخرى', 'revenue', 'Other Income', 510),
  -- Expenses
  ('601000', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', 'expense', 'Cost of Sales', 600),
  ('601001', 'Raw Materials', 'مواد خام', 'expense', 'Cost of Sales', 601),
  ('620000', 'Salaries & Wages', 'رواتب وأجور', 'expense', 'Operating Expenses', 620),
  ('625000', 'Rent Expense', 'مصاريف إيجار', 'expense', 'Operating Expenses', 625),
  ('627000', 'Utilities', 'مصاريف خدمات', 'expense', 'Operating Expenses', 627),
  ('630000', 'Administrative Expenses', 'مصاريف إدارية', 'expense', 'Administrative Expenses', 630),
  ('660000', 'Financial Expenses', 'مصاريف مالية', 'expense', 'Financial Expenses', 660),
  ('690000', 'Other Expenses', 'مصاريف أخرى', 'expense', 'Other Expenses', 690);
