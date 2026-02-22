-- Dolibarr Integration Module - Database Migration
-- Creates mirror tables, steel extension tables, and sync infrastructure

-- ============================================
-- MIRROR TABLES (synced FROM Dolibarr — read-only in OTS)
-- ============================================

CREATE TABLE IF NOT EXISTS `dolibarr_products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dolibarr_id` INT NOT NULL,
  `ref` VARCHAR(128) DEFAULT NULL,
  `label` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `product_type` TINYINT DEFAULT 0 COMMENT '0=product, 1=service',
  `status_sell` TINYINT DEFAULT 0,
  `status_buy` TINYINT DEFAULT 0,
  `price` DECIMAL(20,8) DEFAULT 0,
  `price_ttc` DECIMAL(20,8) DEFAULT 0,
  `price_base_type` VARCHAR(10) DEFAULT 'HT',
  `tva_tx` DECIMAL(6,3) DEFAULT 0,
  `pmp` DECIMAL(20,8) DEFAULT NULL COMMENT 'Weighted average cost price (Prix Moyen Pondéré)',
  `cost_price_avg` DECIMAL(20,8) DEFAULT NULL COMMENT 'Alias for pmp - used in OTS costing',
  `weight` DECIMAL(20,8) DEFAULT NULL,
  `weight_units` INT DEFAULT NULL,
  `length` DECIMAL(20,8) DEFAULT NULL,
  `length_units` INT DEFAULT NULL,
  `width` DECIMAL(20,8) DEFAULT NULL,
  `width_units` INT DEFAULT NULL,
  `height` DECIMAL(20,8) DEFAULT NULL,
  `height_units` INT DEFAULT NULL,
  `barcode` VARCHAR(180) DEFAULT NULL,
  `barcode_type` INT DEFAULT NULL,
  `stock_reel` DECIMAL(20,8) DEFAULT NULL COMMENT 'Real stock quantity',
  `seuil_stock_alerte` DECIMAL(20,8) DEFAULT NULL COMMENT 'Stock alert threshold',
  `desiredstock` DECIMAL(20,8) DEFAULT NULL COMMENT 'Desired stock level',
  `note_public` TEXT DEFAULT NULL,
  `note_private` TEXT DEFAULT NULL,
  `accountancy_code_sell` VARCHAR(32) DEFAULT NULL,
  `accountancy_code_buy` VARCHAR(32) DEFAULT NULL,
  `dolibarr_extrafields` JSON DEFAULT NULL COMMENT 'Raw array_options from Dolibarr',
  `dolibarr_created_at` DATETIME DEFAULT NULL,
  `dolibarr_updated_at` DATETIME DEFAULT NULL,
  `first_synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sync_hash` VARCHAR(32) DEFAULT NULL COMMENT 'MD5 hash for change detection',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Soft-delete flag',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_dolibarr_id` (`dolibarr_id`),
  INDEX `idx_ref` (`ref`),
  INDEX `idx_product_type` (`product_type`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_sync_hash` (`sync_hash`),
  INDEX `idx_last_synced` (`last_synced_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dolibarr_thirdparties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dolibarr_id` INT NOT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `name_alias` VARCHAR(255) DEFAULT NULL,
  `client_type` TINYINT DEFAULT 0 COMMENT '0=none, 1=customer, 2=prospect, 3=both',
  `supplier_type` TINYINT DEFAULT 0 COMMENT '0=no, 1=supplier',
  `code_client` VARCHAR(24) DEFAULT NULL,
  `code_supplier` VARCHAR(24) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `fax` VARCHAR(30) DEFAULT NULL,
  `url` VARCHAR(255) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `zip` VARCHAR(25) DEFAULT NULL,
  `town` VARCHAR(255) DEFAULT NULL,
  `state_code` VARCHAR(10) DEFAULT NULL,
  `country_code` VARCHAR(5) DEFAULT NULL,
  `tva_intra` VARCHAR(20) DEFAULT NULL,
  `capital` DECIMAL(20,8) DEFAULT NULL,
  `status` TINYINT DEFAULT 1,
  `note_public` TEXT DEFAULT NULL,
  `note_private` TEXT DEFAULT NULL,
  `dolibarr_created_at` DATETIME DEFAULT NULL,
  `dolibarr_updated_at` DATETIME DEFAULT NULL,
  `first_synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sync_hash` VARCHAR(32) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_dolibarr_id` (`dolibarr_id`),
  INDEX `idx_name` (`name`),
  INDEX `idx_client_type` (`client_type`),
  INDEX `idx_supplier_type` (`supplier_type`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_code_client` (`code_client`),
  INDEX `idx_code_supplier` (`code_supplier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dolibarr_contacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dolibarr_id` INT NOT NULL,
  `dolibarr_thirdparty_id` INT DEFAULT NULL,
  `firstname` VARCHAR(100) DEFAULT NULL,
  `lastname` VARCHAR(100) DEFAULT NULL,
  `civility` VARCHAR(10) DEFAULT NULL,
  `poste` VARCHAR(255) DEFAULT NULL COMMENT 'Job title',
  `email` VARCHAR(255) DEFAULT NULL,
  `phone_pro` VARCHAR(30) DEFAULT NULL,
  `phone_mobile` VARCHAR(30) DEFAULT NULL,
  `dolibarr_created_at` DATETIME DEFAULT NULL,
  `dolibarr_updated_at` DATETIME DEFAULT NULL,
  `first_synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sync_hash` VARCHAR(32) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_dolibarr_id` (`dolibarr_id`),
  INDEX `idx_thirdparty_id` (`dolibarr_thirdparty_id`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- OTS-NATIVE STEEL EXTENSIONS (owned by OTS)
-- ============================================

CREATE TABLE IF NOT EXISTS `steel_product_specs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dolibarr_product_id` INT NOT NULL COMMENT 'FK to dolibarr_products.dolibarr_id',
  -- Steel Grade
  `steel_grade` VARCHAR(50) DEFAULT NULL COMMENT 'e.g. S275JR, S355J2',
  `grade_standard` VARCHAR(50) DEFAULT NULL COMMENT 'e.g. EN 10025',
  -- Profile Type
  `profile_type` VARCHAR(50) DEFAULT NULL COMMENT 'e.g. IPE, HEA, HEB, UPN, Plate, Tube-Round',
  `profile_size` VARCHAR(50) DEFAULT NULL COMMENT 'e.g. IPE200, HEA300',
  -- Dimensions (all in mm)
  `thickness_mm` DECIMAL(10,2) DEFAULT NULL,
  `width_mm` DECIMAL(10,2) DEFAULT NULL,
  `height_mm` DECIMAL(10,2) DEFAULT NULL,
  `length_mm` DECIMAL(10,2) DEFAULT NULL,
  `outer_diameter_mm` DECIMAL(10,2) DEFAULT NULL,
  `inner_diameter_mm` DECIMAL(10,2) DEFAULT NULL,
  `wall_thickness_mm` DECIMAL(10,2) DEFAULT NULL,
  `web_thickness_mm` DECIMAL(10,2) DEFAULT NULL,
  `flange_thickness_mm` DECIMAL(10,2) DEFAULT NULL,
  `flange_width_mm` DECIMAL(10,2) DEFAULT NULL,
  -- Weight
  `weight_per_meter` DECIMAL(10,3) DEFAULT NULL COMMENT 'kg/m for linear profiles',
  `weight_per_sqm` DECIMAL(10,3) DEFAULT NULL COMMENT 'kg/m² for plates',
  -- Material properties
  `yield_strength_mpa` DECIMAL(10,2) DEFAULT NULL,
  `tensile_strength_mpa` DECIMAL(10,2) DEFAULT NULL,
  `elongation_pct` DECIMAL(5,2) DEFAULT NULL,
  -- Surface
  `surface_finish` VARCHAR(50) DEFAULT NULL COMMENT 'Hot-Rolled, Cold-Rolled, Galvanized, Painted, Blasted',
  `coating_type` VARCHAR(100) DEFAULT NULL,
  `coating_thickness_um` DECIMAL(10,2) DEFAULT NULL,
  -- Operational
  `is_standard_stock` TINYINT(1) DEFAULT 0,
  `preferred_supplier_id` INT DEFAULT NULL COMMENT 'FK to dolibarr_thirdparties.dolibarr_id',
  `lead_time_days` INT DEFAULT NULL,
  `min_order_qty` DECIMAL(10,2) DEFAULT NULL,
  -- Notes
  `fabrication_notes` TEXT DEFAULT NULL,
  `welding_notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_dolibarr_product_id` (`dolibarr_product_id`),
  INDEX `idx_steel_grade` (`steel_grade`),
  INDEX `idx_profile_type` (`profile_type`),
  INDEX `idx_profile_size` (`profile_size`),
  INDEX `idx_surface_finish` (`surface_finish`),
  INDEX `idx_is_standard_stock` (`is_standard_stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `steel_grade_reference` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `grade_code` VARCHAR(50) NOT NULL,
  `grade_standard` VARCHAR(100) DEFAULT NULL,
  `grade_family` VARCHAR(50) DEFAULT NULL COMMENT 'Structural, Stainless, Wear-Resistant, etc.',
  `min_yield_mpa` DECIMAL(10,2) DEFAULT NULL,
  `tensile_range_mpa` VARCHAR(50) DEFAULT NULL COMMENT 'e.g. 410-560',
  `weldability` VARCHAR(50) DEFAULT NULL COMMENT 'Excellent, Good, Fair, Poor',
  `common_applications` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_grade_code` (`grade_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `steel_profile_reference` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `profile_type` VARCHAR(20) NOT NULL COMMENT 'IPE, HEA, HEB, UPN',
  `profile_size` VARCHAR(20) NOT NULL COMMENT 'IPE100, HEA200, etc.',
  `height_mm` DECIMAL(10,2) DEFAULT NULL,
  `width_mm` DECIMAL(10,2) DEFAULT NULL,
  `web_thickness_mm` DECIMAL(10,2) DEFAULT NULL,
  `flange_thickness_mm` DECIMAL(10,2) DEFAULT NULL,
  `weight_per_meter` DECIMAL(10,3) DEFAULT NULL,
  `section_area_cm2` DECIMAL(10,2) DEFAULT NULL,
  `moment_of_inertia_cm4` DECIMAL(12,2) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_profile_size` (`profile_type`, `profile_size`),
  INDEX `idx_profile_type` (`profile_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SYNC INFRASTRUCTURE
-- ============================================

CREATE TABLE IF NOT EXISTS `dolibarr_sync_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `entity_type` VARCHAR(50) NOT NULL COMMENT 'products, thirdparties, contacts',
  `status` VARCHAR(20) NOT NULL COMMENT 'success, error, partial',
  `records_created` INT DEFAULT 0,
  `records_updated` INT DEFAULT 0,
  `records_unchanged` INT DEFAULT 0,
  `records_deactivated` INT DEFAULT 0,
  `total_records` INT DEFAULT 0,
  `duration_ms` INT DEFAULT 0,
  `error_message` TEXT DEFAULT NULL,
  `triggered_by` VARCHAR(50) DEFAULT 'manual' COMMENT 'manual, cron, api',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_entity_type` (`entity_type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dolibarr_integration_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` TEXT DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SEED: Default integration config
-- ============================================

INSERT IGNORE INTO `dolibarr_integration_config` (`config_key`, `config_value`) VALUES
  ('sync_enabled', 'true'),
  ('sync_interval_minutes', '30'),
  ('batch_size', '100'),
  ('last_products_sync', NULL),
  ('last_thirdparties_sync', NULL),
  ('last_contacts_sync', NULL),
  ('last_full_sync', NULL);

-- ============================================
-- SEED: Steel grade reference data
-- ============================================

INSERT IGNORE INTO `steel_grade_reference` (`grade_code`, `grade_standard`, `grade_family`, `min_yield_mpa`, `tensile_range_mpa`, `weldability`, `common_applications`) VALUES
  ('S235JR', 'EN 10025-2', 'Structural Carbon', 235.00, '360-510', 'Excellent', 'General structural steelwork, light fabrication, non-critical members'),
  ('S275JR', 'EN 10025-2', 'Structural Carbon', 275.00, '410-560', 'Excellent', 'Structural steelwork, bridges, buildings, general fabrication'),
  ('S275J0', 'EN 10025-2', 'Structural Carbon', 275.00, '410-560', 'Excellent', 'Structural steelwork requiring impact resistance at 0°C'),
  ('S355JR', 'EN 10025-2', 'Structural Carbon', 355.00, '470-630', 'Good', 'Heavy structural work, cranes, bridges, offshore structures'),
  ('S355J2', 'EN 10025-2', 'Structural Carbon', 355.00, '470-630', 'Good', 'Structural work requiring impact resistance at -20°C'),
  ('S355J0', 'EN 10025-2', 'Structural Carbon', 355.00, '470-630', 'Good', 'Structural work requiring impact resistance at 0°C'),
  ('A36', 'ASTM A36', 'Structural Carbon', 250.00, '400-550', 'Excellent', 'General structural purposes, buildings, bridges (US standard)'),
  ('A572-50', 'ASTM A572', 'HSLA', 345.00, '450-620', 'Good', 'Structural shapes, plates, bars for welded/bolted construction'),
  ('A500B', 'ASTM A500', 'Structural Tube', 290.00, '400-550', 'Good', 'Structural tubing, hollow sections, columns'),
  ('SS304', 'ASTM A240 / EN 1.4301', 'Stainless Austenitic', 205.00, '515-690', 'Good', 'Corrosion-resistant applications, food equipment, architectural'),
  ('SS316', 'ASTM A240 / EN 1.4401', 'Stainless Austenitic', 205.00, '515-690', 'Good', 'Marine environments, chemical processing, high-corrosion areas'),
  ('HARDOX400', 'SSAB Hardox', 'Wear-Resistant', 1000.00, '1250-1400', 'Fair', 'Wear plates, buckets, chutes, hoppers, dump truck bodies'),
  ('HARDOX500', 'SSAB Hardox', 'Wear-Resistant', 1300.00, '1550-1700', 'Fair', 'Extreme wear applications, mining equipment, crushers');

-- ============================================
-- SEED: Steel profile reference data (IPE, HEA, HEB, UPN)
-- ============================================

-- IPE Profiles (European I-beams)
INSERT IGNORE INTO `steel_profile_reference` (`profile_type`, `profile_size`, `height_mm`, `width_mm`, `web_thickness_mm`, `flange_thickness_mm`, `weight_per_meter`, `section_area_cm2`, `moment_of_inertia_cm4`) VALUES
  ('IPE', 'IPE100', 100, 55, 4.1, 5.7, 8.1, 10.3, 171),
  ('IPE', 'IPE120', 120, 64, 4.4, 6.3, 10.4, 13.2, 318),
  ('IPE', 'IPE140', 140, 73, 4.7, 6.9, 12.9, 16.4, 541),
  ('IPE', 'IPE160', 160, 82, 5.0, 7.4, 15.8, 20.1, 869),
  ('IPE', 'IPE180', 180, 91, 5.3, 8.0, 18.8, 23.9, 1317),
  ('IPE', 'IPE200', 200, 100, 5.6, 8.5, 22.4, 28.5, 1943),
  ('IPE', 'IPE220', 220, 110, 5.9, 9.2, 26.2, 33.4, 2772),
  ('IPE', 'IPE240', 240, 120, 6.2, 9.8, 30.7, 39.1, 3892),
  ('IPE', 'IPE270', 270, 135, 6.6, 10.2, 36.1, 45.9, 5790),
  ('IPE', 'IPE300', 300, 150, 7.1, 10.7, 42.2, 53.8, 8356),
  ('IPE', 'IPE330', 330, 160, 7.5, 11.5, 49.1, 62.6, 11770),
  ('IPE', 'IPE360', 360, 170, 8.0, 12.7, 57.1, 72.7, 16270),
  ('IPE', 'IPE400', 400, 180, 8.6, 13.5, 66.3, 84.5, 23130),
  ('IPE', 'IPE450', 450, 190, 9.4, 14.6, 77.6, 98.8, 33740),
  ('IPE', 'IPE500', 500, 200, 10.2, 16.0, 90.7, 115.5, 48200),
  ('IPE', 'IPE550', 550, 210, 11.1, 17.2, 106.0, 134.4, 67120),
  ('IPE', 'IPE600', 600, 220, 12.0, 19.0, 122.4, 156.0, 92080);

-- HEA Profiles (Wide Flange - Light)
INSERT IGNORE INTO `steel_profile_reference` (`profile_type`, `profile_size`, `height_mm`, `width_mm`, `web_thickness_mm`, `flange_thickness_mm`, `weight_per_meter`, `section_area_cm2`, `moment_of_inertia_cm4`) VALUES
  ('HEA', 'HEA100', 96, 100, 5.0, 8.0, 16.7, 21.2, 349),
  ('HEA', 'HEA120', 114, 120, 5.0, 8.0, 19.9, 25.3, 606),
  ('HEA', 'HEA140', 133, 140, 5.5, 8.5, 24.7, 31.4, 1033),
  ('HEA', 'HEA160', 152, 160, 6.0, 9.0, 30.4, 38.8, 1673),
  ('HEA', 'HEA180', 171, 180, 6.0, 9.5, 35.5, 45.3, 2510),
  ('HEA', 'HEA200', 190, 200, 6.5, 10.0, 42.3, 53.8, 3692),
  ('HEA', 'HEA220', 210, 220, 7.0, 11.0, 50.5, 64.3, 5410),
  ('HEA', 'HEA240', 230, 240, 7.5, 12.0, 60.3, 76.8, 7763),
  ('HEA', 'HEA260', 250, 260, 7.5, 12.5, 68.2, 86.8, 10450),
  ('HEA', 'HEA280', 270, 280, 8.0, 13.0, 76.4, 97.3, 13670),
  ('HEA', 'HEA300', 290, 300, 8.5, 14.0, 88.3, 112.5, 18260),
  ('HEA', 'HEA320', 310, 300, 9.0, 15.5, 97.6, 124.4, 22930),
  ('HEA', 'HEA340', 330, 300, 9.5, 16.5, 105.0, 133.5, 27690),
  ('HEA', 'HEA360', 350, 300, 10.0, 17.5, 112.0, 142.8, 33090),
  ('HEA', 'HEA400', 390, 300, 11.0, 19.0, 125.0, 159.0, 45070);

-- HEB Profiles (Wide Flange - Heavy)
INSERT IGNORE INTO `steel_profile_reference` (`profile_type`, `profile_size`, `height_mm`, `width_mm`, `web_thickness_mm`, `flange_thickness_mm`, `weight_per_meter`, `section_area_cm2`, `moment_of_inertia_cm4`) VALUES
  ('HEB', 'HEB100', 100, 100, 6.0, 10.0, 20.4, 26.0, 450),
  ('HEB', 'HEB120', 120, 120, 6.5, 11.0, 26.7, 34.0, 864),
  ('HEB', 'HEB140', 140, 140, 7.0, 12.0, 33.7, 43.0, 1509),
  ('HEB', 'HEB160', 160, 160, 8.0, 13.0, 42.6, 54.3, 2492),
  ('HEB', 'HEB180', 180, 180, 8.5, 14.0, 51.2, 65.3, 3831),
  ('HEB', 'HEB200', 200, 200, 9.0, 15.0, 61.3, 78.1, 5696),
  ('HEB', 'HEB220', 220, 220, 9.5, 16.0, 71.5, 91.0, 8091),
  ('HEB', 'HEB240', 240, 240, 10.0, 17.0, 83.2, 106.0, 11260),
  ('HEB', 'HEB260', 260, 260, 10.0, 17.5, 93.0, 118.4, 14920),
  ('HEB', 'HEB280', 280, 280, 10.5, 18.0, 103.0, 131.4, 19270),
  ('HEB', 'HEB300', 300, 300, 11.0, 19.0, 117.0, 149.1, 25170);

-- UPN Profiles (U-Channels)
INSERT IGNORE INTO `steel_profile_reference` (`profile_type`, `profile_size`, `height_mm`, `width_mm`, `web_thickness_mm`, `flange_thickness_mm`, `weight_per_meter`, `section_area_cm2`, `moment_of_inertia_cm4`) VALUES
  ('UPN', 'UPN80', 80, 45, 6.0, 8.0, 8.6, 11.0, 106),
  ('UPN', 'UPN100', 100, 50, 6.0, 8.5, 10.6, 13.5, 206),
  ('UPN', 'UPN120', 120, 55, 7.0, 9.0, 13.4, 17.0, 364),
  ('UPN', 'UPN140', 140, 60, 7.0, 10.0, 16.0, 20.4, 605),
  ('UPN', 'UPN160', 160, 65, 7.5, 10.5, 18.8, 24.0, 925),
  ('UPN', 'UPN180', 180, 70, 8.0, 11.0, 22.0, 28.0, 1350),
  ('UPN', 'UPN200', 200, 75, 8.5, 11.5, 25.3, 32.2, 1910),
  ('UPN', 'UPN220', 220, 80, 9.0, 12.5, 29.4, 37.4, 2690),
  ('UPN', 'UPN240', 240, 85, 9.5, 13.0, 33.2, 42.3, 3600),
  ('UPN', 'UPN260', 260, 90, 10.0, 14.0, 37.9, 48.3, 4820),
  ('UPN', 'UPN280', 280, 95, 10.0, 15.0, 41.8, 53.3, 6280),
  ('UPN', 'UPN300', 300, 100, 10.0, 16.0, 46.2, 58.8, 8030);
