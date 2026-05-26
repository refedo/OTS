-- ============================================================
-- v36_1 — Material Master Enrichment
-- Adds product intelligence columns to dolibarr_products
-- All statements use conditional stored-procedure pattern
-- ============================================================

-- ── BLOCK 1: Classification ──────────────────────────────────────────────

DROP PROCEDURE IF EXISTS _mm_item_class;
DELIMITER $$
CREATE PROCEDURE _mm_item_class()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'item_class'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN item_class ENUM(
        'RAW_MATERIAL','CONSUMABLE','SPARE_PART','SERVICE','TOOL','UNKNOWN'
      ) DEFAULT 'UNKNOWN' AFTER is_active;
  END IF;
END$$
DELIMITER ;
CALL _mm_item_class();
DROP PROCEDURE IF EXISTS _mm_item_class;

DROP PROCEDURE IF EXISTS _mm_material_nature;
DELIMITER $$
CREATE PROCEDURE _mm_material_nature()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'material_nature'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN material_nature ENUM(
        'CARBON_STEEL','STAINLESS_STEEL','ALUMINUM','GALVANIZED_STEEL',
        'HARDWARE','WELDING_CONSUMABLE','CHEMICAL','PPE','GAS',
        'ELECTRICAL','SERVICE','OTHER','UNKNOWN'
      ) DEFAULT 'UNKNOWN' AFTER item_class;
  END IF;
END$$
DELIMITER ;
CALL _mm_material_nature();
DROP PROCEDURE IF EXISTS _mm_material_nature;

DROP PROCEDURE IF EXISTS _mm_material_category;
DELIMITER $$
CREATE PROCEDURE _mm_material_category()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'material_category'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN material_category ENUM(
        'SHEET','PLATE','CHECKERED_PLATE',
        'PROFILE_H','PROFILE_I','PROFILE_C','PROFILE_ANGLE',
        'FLAT_BAR','ROUND_BAR','SQUARE_BAR',
        'PIPE_ROUND','PIPE_SQUARE','PIPE_RECTANGULAR',
        'BOLT','NUT','WASHER','ANCHOR','STUD',
        'WELDING_ELECTRODE','WELDING_WIRE_SOLID','WELDING_WIRE_FLUX',
        'WELDING_FLUX_SAW','WELDING_PPE','WELDING_ACCESSORY',
        'PAINT','PRIMER','THINNER','ABRASIVE',
        'GAS_CYLINDER','SAFETY_PPE','ELECTRICAL','OTHER','UNKNOWN'
      ) DEFAULT 'UNKNOWN' AFTER material_nature;
  END IF;
END$$
DELIMITER ;
CALL _mm_material_category();
DROP PROCEDURE IF EXISTS _mm_material_category;

DROP PROCEDURE IF EXISTS _mm_grade;
DELIMITER $$
CREATE PROCEDURE _mm_grade()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'grade'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN grade VARCHAR(50) NULL
        COMMENT 'e.g. A36, S355, A572-G50, 10.9, 304SS'
        AFTER material_category;
  END IF;
END$$
DELIMITER ;
CALL _mm_grade();
DROP PROCEDURE IF EXISTS _mm_grade;

DROP PROCEDURE IF EXISTS _mm_finish;
DELIMITER $$
CREATE PROCEDURE _mm_finish()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'finish'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN finish VARCHAR(50) NULL
        COMMENT 'e.g. Black Steel, Hot-Dip Galvanized, Zinc'
        AFTER grade;
  END IF;
END$$
DELIMITER ;
CALL _mm_finish();
DROP PROCEDURE IF EXISTS _mm_finish;

DROP PROCEDURE IF EXISTS _mm_unit_of_measure;
DELIMITER $$
CREATE PROCEDURE _mm_unit_of_measure()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'unit_of_measure'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN unit_of_measure ENUM(
        'KG','TON','M','LM','M2','PC','SET','BOX','L','ROLL'
      ) DEFAULT 'PC' AFTER finish;
  END IF;
END$$
DELIMITER ;
CALL _mm_unit_of_measure();
DROP PROCEDURE IF EXISTS _mm_unit_of_measure;

-- ── BLOCK 2: Profile / Section Attributes ────────────────────────────────

DROP PROCEDURE IF EXISTS _mm_profile_type;
DELIMITER $$
CREATE PROCEDURE _mm_profile_type()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'profile_type'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN profile_type ENUM(
        'HEA','HEB','HEM','IPE','IPO','IPN',
        'UPN','UPE','JIS_H','JIS_I',
        'EQUAL_ANGLE','UNEQUAL_ANGLE',
        'FLAT_BAR','ROUND_BAR','SQUARE_BAR',
        'CHS','SHS','RHS',
        'SHEET','PLATE','CHECKERED',
        'OTHER'
      ) NULL AFTER unit_of_measure;
  END IF;
END$$
DELIMITER ;
CALL _mm_profile_type();
DROP PROCEDURE IF EXISTS _mm_profile_type;

DROP PROCEDURE IF EXISTS _mm_profile_designation;
DELIMITER $$
CREATE PROCEDURE _mm_profile_designation()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'profile_designation'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN profile_designation VARCHAR(30) NULL
        COMMENT 'e.g. HEA 200, IPE 300, L 80x80x8'
        AFTER profile_type;
  END IF;
END$$
DELIMITER ;
CALL _mm_profile_designation();
DROP PROCEDURE IF EXISTS _mm_profile_designation;

DROP PROCEDURE IF EXISTS _mm_section_standard;
DELIMITER $$
CREATE PROCEDURE _mm_section_standard()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'section_standard'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN section_standard VARCHAR(20) NULL
        COMMENT 'EN10365 | AISC | JIS_G3192 | DIN'
        AFTER profile_designation;
  END IF;
END$$
DELIMITER ;
CALL _mm_section_standard();
DROP PROCEDURE IF EXISTS _mm_section_standard;

DROP PROCEDURE IF EXISTS _mm_bar_length_m;
DELIMITER $$
CREATE PROCEDURE _mm_bar_length_m()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'bar_length_m'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN bar_length_m DECIMAL(6,2) NULL
        COMMENT 'Standard bar/beam length from ref (6 or 12)'
        AFTER section_standard;
  END IF;
END$$
DELIMITER ;
CALL _mm_bar_length_m();
DROP PROCEDURE IF EXISTS _mm_bar_length_m;

DROP PROCEDURE IF EXISTS _mm_dim_h_mm;
DELIMITER $$
CREATE PROCEDURE _mm_dim_h_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'dim_h_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN dim_h_mm DECIMAL(8,2) NULL
        COMMENT 'Total height'
        AFTER bar_length_m;
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_h_mm();
DROP PROCEDURE IF EXISTS _mm_dim_h_mm;

DROP PROCEDURE IF EXISTS _mm_dim_b_mm;
DELIMITER $$
CREATE PROCEDURE _mm_dim_b_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'dim_b_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN dim_b_mm DECIMAL(8,2) NULL
        COMMENT 'Flange width'
        AFTER dim_h_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_b_mm();
DROP PROCEDURE IF EXISTS _mm_dim_b_mm;

DROP PROCEDURE IF EXISTS _mm_dim_tf_mm;
DELIMITER $$
CREATE PROCEDURE _mm_dim_tf_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'dim_tf_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN dim_tf_mm DECIMAL(6,3) NULL
        COMMENT 'Flange thickness'
        AFTER dim_b_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_tf_mm();
DROP PROCEDURE IF EXISTS _mm_dim_tf_mm;

DROP PROCEDURE IF EXISTS _mm_dim_tw_mm;
DELIMITER $$
CREATE PROCEDURE _mm_dim_tw_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'dim_tw_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN dim_tw_mm DECIMAL(6,3) NULL
        COMMENT 'Web thickness'
        AFTER dim_tf_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_tw_mm();
DROP PROCEDURE IF EXISTS _mm_dim_tw_mm;

DROP PROCEDURE IF EXISTS _mm_dim_r_mm;
DELIMITER $$
CREATE PROCEDURE _mm_dim_r_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'dim_r_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN dim_r_mm DECIMAL(6,2) NULL
        COMMENT 'Root fillet radius'
        AFTER dim_tw_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_r_mm();
DROP PROCEDURE IF EXISTS _mm_dim_r_mm;

DROP PROCEDURE IF EXISTS _mm_dim_width_mm;
DELIMITER $$
CREATE PROCEDURE _mm_dim_width_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'dim_width_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN dim_width_mm DECIMAL(8,2) NULL
        COMMENT 'Sheet/plate width'
        AFTER dim_r_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_width_mm();
DROP PROCEDURE IF EXISTS _mm_dim_width_mm;

DROP PROCEDURE IF EXISTS _mm_dim_length_mm;
DELIMITER $$
CREATE PROCEDURE _mm_dim_length_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'dim_length_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN dim_length_mm DECIMAL(8,2) NULL
        COMMENT 'Sheet/plate length'
        AFTER dim_width_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_length_mm();
DROP PROCEDURE IF EXISTS _mm_dim_length_mm;

DROP PROCEDURE IF EXISTS _mm_dim_thickness_mm;
DELIMITER $$
CREATE PROCEDURE _mm_dim_thickness_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'dim_thickness_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN dim_thickness_mm DECIMAL(7,3) NULL
        COMMENT 'Sheet/plate thickness'
        AFTER dim_length_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_thickness_mm();
DROP PROCEDURE IF EXISTS _mm_dim_thickness_mm;

-- Cross-section mechanical properties

DROP PROCEDURE IF EXISTS _mm_weight_kg_per_m;
DELIMITER $$
CREATE PROCEDURE _mm_weight_kg_per_m()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'weight_kg_per_m'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN weight_kg_per_m DECIMAL(8,3) NULL
        COMMENT 'kg/m — profiles and bars'
        AFTER dim_thickness_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_weight_kg_per_m();
DROP PROCEDURE IF EXISTS _mm_weight_kg_per_m;

DROP PROCEDURE IF EXISTS _mm_area_cm2;
DELIMITER $$
CREATE PROCEDURE _mm_area_cm2()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'area_cm2'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN area_cm2 DECIMAL(8,3) NULL AFTER weight_kg_per_m;
  END IF;
END$$
DELIMITER ;
CALL _mm_area_cm2();
DROP PROCEDURE IF EXISTS _mm_area_cm2;

DROP PROCEDURE IF EXISTS _mm_Ix_cm4;
DELIMITER $$
CREATE PROCEDURE _mm_Ix_cm4()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'Ix_cm4'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN Ix_cm4 DECIMAL(12,3) NULL AFTER area_cm2;
  END IF;
END$$
DELIMITER ;
CALL _mm_Ix_cm4();
DROP PROCEDURE IF EXISTS _mm_Ix_cm4;

DROP PROCEDURE IF EXISTS _mm_Iy_cm4;
DELIMITER $$
CREATE PROCEDURE _mm_Iy_cm4()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'Iy_cm4'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN Iy_cm4 DECIMAL(12,3) NULL AFTER Ix_cm4;
  END IF;
END$$
DELIMITER ;
CALL _mm_Iy_cm4();
DROP PROCEDURE IF EXISTS _mm_Iy_cm4;

DROP PROCEDURE IF EXISTS _mm_Wx_cm3;
DELIMITER $$
CREATE PROCEDURE _mm_Wx_cm3()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'Wx_cm3'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN Wx_cm3 DECIMAL(10,3) NULL AFTER Iy_cm4;
  END IF;
END$$
DELIMITER ;
CALL _mm_Wx_cm3();
DROP PROCEDURE IF EXISTS _mm_Wx_cm3;

DROP PROCEDURE IF EXISTS _mm_Wy_cm3;
DELIMITER $$
CREATE PROCEDURE _mm_Wy_cm3()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'Wy_cm3'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN Wy_cm3 DECIMAL(10,3) NULL AFTER Wx_cm3;
  END IF;
END$$
DELIMITER ;
CALL _mm_Wy_cm3();
DROP PROCEDURE IF EXISTS _mm_Wy_cm3;

DROP PROCEDURE IF EXISTS _mm_ix_cm;
DELIMITER $$
CREATE PROCEDURE _mm_ix_cm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'ix_cm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN ix_cm DECIMAL(7,3) NULL AFTER Wy_cm3;
  END IF;
END$$
DELIMITER ;
CALL _mm_ix_cm();
DROP PROCEDURE IF EXISTS _mm_ix_cm;

DROP PROCEDURE IF EXISTS _mm_iy_cm;
DELIMITER $$
CREATE PROCEDURE _mm_iy_cm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'iy_cm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN iy_cm DECIMAL(7,3) NULL AFTER ix_cm;
  END IF;
END$$
DELIMITER ;
CALL _mm_iy_cm();
DROP PROCEDURE IF EXISTS _mm_iy_cm;

DROP PROCEDURE IF EXISTS _mm_section_props_json;
DELIMITER $$
CREATE PROCEDURE _mm_section_props_json()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'section_props_json'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN section_props_json JSON NULL
        COMMENT 'Full section props blob including Avz, It, Iw etc'
        AFTER iy_cm;
  END IF;
END$$
DELIMITER ;
CALL _mm_section_props_json();
DROP PROCEDURE IF EXISTS _mm_section_props_json;

-- ── BLOCK 3: Fastener Attributes ─────────────────────────────────────────

DROP PROCEDURE IF EXISTS _mm_fastener_standard;
DELIMITER $$
CREATE PROCEDURE _mm_fastener_standard()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'fastener_standard'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN fastener_standard VARCHAR(30) NULL
        COMMENT 'DIN 914, DIN 6914, ISO 4017, ASTM A194'
        AFTER section_props_json;
  END IF;
END$$
DELIMITER ;
CALL _mm_fastener_standard();
DROP PROCEDURE IF EXISTS _mm_fastener_standard;

DROP PROCEDURE IF EXISTS _mm_fastener_thread;
DELIMITER $$
CREATE PROCEDURE _mm_fastener_thread()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'fastener_thread'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN fastener_thread VARCHAR(20) NULL
        COMMENT 'M12, M16, M20, M27'
        AFTER fastener_standard;
  END IF;
END$$
DELIMITER ;
CALL _mm_fastener_thread();
DROP PROCEDURE IF EXISTS _mm_fastener_thread;

DROP PROCEDURE IF EXISTS _mm_fastener_length_mm;
DELIMITER $$
CREATE PROCEDURE _mm_fastener_length_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'fastener_length_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN fastener_length_mm DECIMAL(7,2) NULL AFTER fastener_thread;
  END IF;
END$$
DELIMITER ;
CALL _mm_fastener_length_mm();
DROP PROCEDURE IF EXISTS _mm_fastener_length_mm;

DROP PROCEDURE IF EXISTS _mm_fastener_grade;
DELIMITER $$
CREATE PROCEDURE _mm_fastener_grade()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'fastener_grade'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN fastener_grade VARCHAR(20) NULL
        COMMENT '8.8, 10.9, 12.9, 2H, B7'
        AFTER fastener_length_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_fastener_grade();
DROP PROCEDURE IF EXISTS _mm_fastener_grade;

DROP PROCEDURE IF EXISTS _mm_fastener_surface;
DELIMITER $$
CREATE PROCEDURE _mm_fastener_surface()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'fastener_surface'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN fastener_surface VARCHAR(30) NULL
        COMMENT 'Black Steel, HDG, Zinc, PTFE'
        AFTER fastener_grade;
  END IF;
END$$
DELIMITER ;
CALL _mm_fastener_surface();
DROP PROCEDURE IF EXISTS _mm_fastener_surface;

-- ── BLOCK 4: Welding Attributes ──────────────────────────────────────────

DROP PROCEDURE IF EXISTS _mm_aws_class;
DELIMITER $$
CREATE PROCEDURE _mm_aws_class()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'aws_class'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN aws_class VARCHAR(30) NULL
        COMMENT 'E6013, E7018, E308L, E71T-1, E308LT1'
        AFTER fastener_surface;
  END IF;
END$$
DELIMITER ;
CALL _mm_aws_class();
DROP PROCEDURE IF EXISTS _mm_aws_class;

DROP PROCEDURE IF EXISTS _mm_weld_process;
DELIMITER $$
CREATE PROCEDURE _mm_weld_process()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'weld_process'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN weld_process ENUM('SMAW','GMAW','FCAW','SAW','GTAW') NULL
        AFTER aws_class;
  END IF;
END$$
DELIMITER ;
CALL _mm_weld_process();
DROP PROCEDURE IF EXISTS _mm_weld_process;

DROP PROCEDURE IF EXISTS _mm_weld_base_material;
DELIMITER $$
CREATE PROCEDURE _mm_weld_base_material()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'weld_base_material'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN weld_base_material ENUM(
        'MILD_STEEL','STAINLESS','LOW_ALLOY','ALUMINUM'
      ) NULL AFTER weld_process;
  END IF;
END$$
DELIMITER ;
CALL _mm_weld_base_material();
DROP PROCEDURE IF EXISTS _mm_weld_base_material;

DROP PROCEDURE IF EXISTS _mm_weld_diameter_mm;
DELIMITER $$
CREATE PROCEDURE _mm_weld_diameter_mm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'weld_diameter_mm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN weld_diameter_mm DECIMAL(5,2) NULL AFTER weld_base_material;
  END IF;
END$$
DELIMITER ;
CALL _mm_weld_diameter_mm();
DROP PROCEDURE IF EXISTS _mm_weld_diameter_mm;

DROP PROCEDURE IF EXISTS _mm_weld_current_type;
DELIMITER $$
CREATE PROCEDURE _mm_weld_current_type()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'weld_current_type'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN weld_current_type VARCHAR(20) NULL
        COMMENT 'AC, DC+, DC-, AC/DC'
        AFTER weld_diameter_mm;
  END IF;
END$$
DELIMITER ;
CALL _mm_weld_current_type();
DROP PROCEDURE IF EXISTS _mm_weld_current_type;

DROP PROCEDURE IF EXISTS _mm_weld_tensile_mpa;
DELIMITER $$
CREATE PROCEDURE _mm_weld_tensile_mpa()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'weld_tensile_mpa'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN weld_tensile_mpa INT NULL AFTER weld_current_type;
  END IF;
END$$
DELIMITER ;
CALL _mm_weld_tensile_mpa();
DROP PROCEDURE IF EXISTS _mm_weld_tensile_mpa;

DROP PROCEDURE IF EXISTS _mm_weld_yield_mpa;
DELIMITER $$
CREATE PROCEDURE _mm_weld_yield_mpa()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'weld_yield_mpa'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN weld_yield_mpa INT NULL AFTER weld_tensile_mpa;
  END IF;
END$$
DELIMITER ;
CALL _mm_weld_yield_mpa();
DROP PROCEDURE IF EXISTS _mm_weld_yield_mpa;

DROP PROCEDURE IF EXISTS _mm_weld_elongation_pct;
DELIMITER $$
CREATE PROCEDURE _mm_weld_elongation_pct()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'weld_elongation_pct'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN weld_elongation_pct DECIMAL(5,2) NULL AFTER weld_yield_mpa;
  END IF;
END$$
DELIMITER ;
CALL _mm_weld_elongation_pct();
DROP PROCEDURE IF EXISTS _mm_weld_elongation_pct;

-- ── BLOCK 5: Unit Conversion Engine ──────────────────────────────────────

DROP PROCEDURE IF EXISTS _mm_density_kg_m3;
DELIMITER $$
CREATE PROCEDURE _mm_density_kg_m3()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'density_kg_m3'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN density_kg_m3 DECIMAL(8,2) DEFAULT 7850.00
        COMMENT '7850=carbon, 7930=SS, 2700=Al'
        AFTER weld_elongation_pct;
  END IF;
END$$
DELIMITER ;
CALL _mm_density_kg_m3();
DROP PROCEDURE IF EXISTS _mm_density_kg_m3;

DROP PROCEDURE IF EXISTS _mm_kg_per_m2;
DELIMITER $$
CREATE PROCEDURE _mm_kg_per_m2()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'kg_per_m2'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN kg_per_m2 DECIMAL(10,4) NULL
        COMMENT 'Sheets/plates: kg per 1 m²'
        AFTER density_kg_m3;
  END IF;
END$$
DELIMITER ;
CALL _mm_kg_per_m2();
DROP PROCEDURE IF EXISTS _mm_kg_per_m2;

DROP PROCEDURE IF EXISTS _mm_kg_per_lm;
DELIMITER $$
CREATE PROCEDURE _mm_kg_per_lm()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'kg_per_lm'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN kg_per_lm DECIMAL(10,4) NULL
        COMMENT 'Profiles/bars: kg per 1 linear meter'
        AFTER kg_per_m2;
  END IF;
END$$
DELIMITER ;
CALL _mm_kg_per_lm();
DROP PROCEDURE IF EXISTS _mm_kg_per_lm;

DROP PROCEDURE IF EXISTS _mm_unit_area_m2;
DELIMITER $$
CREATE PROCEDURE _mm_unit_area_m2()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'unit_area_m2'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN unit_area_m2 DECIMAL(10,6) NULL
        COMMENT 'Sheets: width_m * length_m (one unit piece)'
        AFTER kg_per_lm;
  END IF;
END$$
DELIMITER ;
CALL _mm_unit_area_m2();
DROP PROCEDURE IF EXISTS _mm_unit_area_m2;

DROP PROCEDURE IF EXISTS _mm_kg_per_unit;
DELIMITER $$
CREATE PROCEDURE _mm_kg_per_unit()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'kg_per_unit'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN kg_per_unit DECIMAL(10,4) NULL
        COMMENT 'Weight of one standard unit (one sheet or one bar)'
        AFTER unit_area_m2;
  END IF;
END$$
DELIMITER ;
CALL _mm_kg_per_unit();
DROP PROCEDURE IF EXISTS _mm_kg_per_unit;

DROP PROCEDURE IF EXISTS _mm_disburse_unit;
DELIMITER $$
CREATE PROCEDURE _mm_disburse_unit()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'disburse_unit'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN disburse_unit ENUM('KG','TON','M2','LM','PC') DEFAULT 'KG'
        COMMENT 'Preferred unit for production disbursement display'
        AFTER kg_per_unit;
  END IF;
END$$
DELIMITER ;
CALL _mm_disburse_unit();
DROP PROCEDURE IF EXISTS _mm_disburse_unit;

DROP PROCEDURE IF EXISTS _mm_unit_conversions_json;
DELIMITER $$
CREATE PROCEDURE _mm_unit_conversions_json()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'unit_conversions_json'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN unit_conversions_json JSON NULL
        COMMENT 'Cached conversions: {kg_per_m2, m2_per_ton, kg_per_sheet, sheets_per_ton, lm_per_ton, kg_per_bar, bars_per_ton}'
        AFTER disburse_unit;
  END IF;
END$$
DELIMITER ;
CALL _mm_unit_conversions_json();
DROP PROCEDURE IF EXISTS _mm_unit_conversions_json;

-- ── BLOCK 6: Web Enrichment ───────────────────────────────────────────────

DROP PROCEDURE IF EXISTS _mm_manufacturer;
DELIMITER $$
CREATE PROCEDURE _mm_manufacturer()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'manufacturer'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN manufacturer VARCHAR(100) NULL AFTER unit_conversions_json;
  END IF;
END$$
DELIMITER ;
CALL _mm_manufacturer();
DROP PROCEDURE IF EXISTS _mm_manufacturer;

DROP PROCEDURE IF EXISTS _mm_manufacturer_ref;
DELIMITER $$
CREATE PROCEDURE _mm_manufacturer_ref()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'manufacturer_ref'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN manufacturer_ref VARCHAR(100) NULL AFTER manufacturer;
  END IF;
END$$
DELIMITER ;
CALL _mm_manufacturer_ref();
DROP PROCEDURE IF EXISTS _mm_manufacturer_ref;

DROP PROCEDURE IF EXISTS _mm_image_url;
DELIMITER $$
CREATE PROCEDURE _mm_image_url()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'image_url'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN image_url VARCHAR(500) NULL AFTER manufacturer_ref;
  END IF;
END$$
DELIMITER ;
CALL _mm_image_url();
DROP PROCEDURE IF EXISTS _mm_image_url;

DROP PROCEDURE IF EXISTS _mm_tds_url;
DELIMITER $$
CREATE PROCEDURE _mm_tds_url()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'tds_url'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN tds_url VARCHAR(500) NULL AFTER image_url;
  END IF;
END$$
DELIMITER ;
CALL _mm_tds_url();
DROP PROCEDURE IF EXISTS _mm_tds_url;

DROP PROCEDURE IF EXISTS _mm_technical_attrs_json;
DELIMITER $$
CREATE PROCEDURE _mm_technical_attrs_json()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'technical_attrs_json'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN technical_attrs_json JSON NULL
        COMMENT 'Flexible per-category: welding params, paint specs, bolt proof loads, etc.'
        AFTER tds_url;
  END IF;
END$$
DELIMITER ;
CALL _mm_technical_attrs_json();
DROP PROCEDURE IF EXISTS _mm_technical_attrs_json;

-- ── BLOCK 7: Classification Metadata ─────────────────────────────────────

DROP PROCEDURE IF EXISTS _mm_classified_by;
DELIMITER $$
CREATE PROCEDURE _mm_classified_by()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'classified_by'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN classified_by ENUM(
        'RULE_ENGINE','SECTION_LIBRARY','AI_BATCH','MANUAL','UNCLASSIFIED'
      ) DEFAULT 'UNCLASSIFIED' AFTER technical_attrs_json;
  END IF;
END$$
DELIMITER ;
CALL _mm_classified_by();
DROP PROCEDURE IF EXISTS _mm_classified_by;

DROP PROCEDURE IF EXISTS _mm_classification_conf;
DELIMITER $$
CREATE PROCEDURE _mm_classification_conf()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'classification_conf'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN classification_conf DECIMAL(3,2) DEFAULT 0.00
        COMMENT '0.00 to 1.00'
        AFTER classified_by;
  END IF;
END$$
DELIMITER ;
CALL _mm_classification_conf();
DROP PROCEDURE IF EXISTS _mm_classification_conf;

DROP PROCEDURE IF EXISTS _mm_enriched_at;
DELIMITER $$
CREATE PROCEDURE _mm_enriched_at()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'enriched_at'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN enriched_at DATETIME NULL AFTER classification_conf;
  END IF;
END$$
DELIMITER ;
CALL _mm_enriched_at();
DROP PROCEDURE IF EXISTS _mm_enriched_at;

DROP PROCEDURE IF EXISTS _mm_review_required;
DELIMITER $$
CREATE PROCEDURE _mm_review_required()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'review_required'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN review_required BOOLEAN DEFAULT FALSE
        COMMENT 'true when conf < 0.75'
        AFTER enriched_at;
  END IF;
END$$
DELIMITER ;
CALL _mm_review_required();
DROP PROCEDURE IF EXISTS _mm_review_required;

DROP PROCEDURE IF EXISTS _mm_review_notes;
DELIMITER $$
CREATE PROCEDURE _mm_review_notes()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'review_notes'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN review_notes TEXT NULL AFTER review_required;
  END IF;
END$$
DELIMITER ;
CALL _mm_review_notes();
DROP PROCEDURE IF EXISTS _mm_review_notes;

DROP PROCEDURE IF EXISTS _mm_reviewed_by;
DELIMITER $$
CREATE PROCEDURE _mm_reviewed_by()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'reviewed_by'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN reviewed_by INT NULL
        COMMENT 'FK to users table'
        AFTER review_notes;
  END IF;
END$$
DELIMITER ;
CALL _mm_reviewed_by();
DROP PROCEDURE IF EXISTS _mm_reviewed_by;

DROP PROCEDURE IF EXISTS _mm_reviewed_at;
DELIMITER $$
CREATE PROCEDURE _mm_reviewed_at()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND COLUMN_NAME  = 'reviewed_at'
  ) THEN
    ALTER TABLE dolibarr_products
      ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by;
  END IF;
END$$
DELIMITER ;
CALL _mm_reviewed_at();
DROP PROCEDURE IF EXISTS _mm_reviewed_at;

-- ── Indexes ───────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS _mm_idx_item_class;
DELIMITER $$
CREATE PROCEDURE _mm_idx_item_class()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND INDEX_NAME   = 'idx_dp_item_class'
  ) THEN
    ALTER TABLE dolibarr_products ADD INDEX idx_dp_item_class (item_class);
  END IF;
END$$
DELIMITER ;
CALL _mm_idx_item_class();
DROP PROCEDURE IF EXISTS _mm_idx_item_class;

DROP PROCEDURE IF EXISTS _mm_idx_material_category;
DELIMITER $$
CREATE PROCEDURE _mm_idx_material_category()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND INDEX_NAME   = 'idx_dp_material_category'
  ) THEN
    ALTER TABLE dolibarr_products ADD INDEX idx_dp_material_category (material_category);
  END IF;
END$$
DELIMITER ;
CALL _mm_idx_material_category();
DROP PROCEDURE IF EXISTS _mm_idx_material_category;

DROP PROCEDURE IF EXISTS _mm_idx_profile_type;
DELIMITER $$
CREATE PROCEDURE _mm_idx_profile_type()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND INDEX_NAME   = 'idx_dp_profile_type'
  ) THEN
    ALTER TABLE dolibarr_products ADD INDEX idx_dp_profile_type (profile_type);
  END IF;
END$$
DELIMITER ;
CALL _mm_idx_profile_type();
DROP PROCEDURE IF EXISTS _mm_idx_profile_type;

DROP PROCEDURE IF EXISTS _mm_idx_review_required;
DELIMITER $$
CREATE PROCEDURE _mm_idx_review_required()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND INDEX_NAME   = 'idx_dp_review_required'
  ) THEN
    ALTER TABLE dolibarr_products ADD INDEX idx_dp_review_required (review_required);
  END IF;
END$$
DELIMITER ;
CALL _mm_idx_review_required();
DROP PROCEDURE IF EXISTS _mm_idx_review_required;

DROP PROCEDURE IF EXISTS _mm_idx_classified_by;
DELIMITER $$
CREATE PROCEDURE _mm_idx_classified_by()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'dolibarr_products'
      AND INDEX_NAME   = 'idx_dp_classified_by'
  ) THEN
    ALTER TABLE dolibarr_products ADD INDEX idx_dp_classified_by (classified_by);
  END IF;
END$$
DELIMITER ;
CALL _mm_idx_classified_by();
DROP PROCEDURE IF EXISTS _mm_idx_classified_by;
