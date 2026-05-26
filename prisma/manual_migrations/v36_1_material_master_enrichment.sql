-- ============================================================
-- v36_1 — Material Master Enrichment
-- Adds product intelligence columns to dolibarr_products
-- All statements use IF NOT EXISTS for idempotency
-- ============================================================

-- ── BLOCK 1: Classification ──────────────────────────────────────────────
ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS item_class ENUM(
    'RAW_MATERIAL','CONSUMABLE','SPARE_PART','SERVICE','TOOL','UNKNOWN'
  ) DEFAULT 'UNKNOWN' AFTER is_active;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS material_nature ENUM(
    'CARBON_STEEL','STAINLESS_STEEL','ALUMINUM','GALVANIZED_STEEL',
    'HARDWARE','WELDING_CONSUMABLE','CHEMICAL','PPE','GAS',
    'ELECTRICAL','SERVICE','OTHER','UNKNOWN'
  ) DEFAULT 'UNKNOWN' AFTER item_class;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS material_category ENUM(
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

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS grade VARCHAR(50) NULL COMMENT 'e.g. A36, S355, A572-G50, 10.9, 304SS' AFTER material_category;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS finish VARCHAR(50) NULL COMMENT 'e.g. Black Steel, Hot-Dip Galvanized, Zinc' AFTER grade;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS unit_of_measure ENUM('KG','TON','M','LM','M2','PC','SET','BOX','L','ROLL') DEFAULT 'PC' AFTER finish;

-- ── BLOCK 2: Profile / Section Attributes ────────────────────────────────
ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS profile_type ENUM(
    'HEA','HEB','HEM','IPE','IPO','IPN',
    'UPN','UPE','JIS_H','JIS_I',
    'EQUAL_ANGLE','UNEQUAL_ANGLE',
    'FLAT_BAR','ROUND_BAR','SQUARE_BAR',
    'CHS','SHS','RHS',
    'SHEET','PLATE','CHECKERED',
    'OTHER'
  ) NULL AFTER unit_of_measure;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS profile_designation VARCHAR(30) NULL COMMENT 'e.g. HEA 200, IPE 300, L 80x80x8' AFTER profile_type;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS section_standard VARCHAR(20) NULL COMMENT 'EN10365 | AISC | JIS_G3192 | DIN' AFTER profile_designation;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS bar_length_m DECIMAL(6,2) NULL COMMENT 'Standard bar/beam length from ref (6 or 12)' AFTER section_standard;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS dim_h_mm DECIMAL(8,2) NULL COMMENT 'Total height' AFTER bar_length_m;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS dim_b_mm DECIMAL(8,2) NULL COMMENT 'Flange width' AFTER dim_h_mm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS dim_tf_mm DECIMAL(6,3) NULL COMMENT 'Flange thickness' AFTER dim_b_mm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS dim_tw_mm DECIMAL(6,3) NULL COMMENT 'Web thickness' AFTER dim_tf_mm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS dim_r_mm DECIMAL(6,2) NULL COMMENT 'Root fillet radius' AFTER dim_tw_mm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS dim_width_mm DECIMAL(8,2) NULL COMMENT 'Sheet/plate width' AFTER dim_r_mm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS dim_length_mm DECIMAL(8,2) NULL COMMENT 'Sheet/plate length' AFTER dim_width_mm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS dim_thickness_mm DECIMAL(7,3) NULL COMMENT 'Sheet/plate thickness' AFTER dim_length_mm;

-- Cross-section mechanical properties
ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS weight_kg_per_m DECIMAL(8,3) NULL COMMENT 'kg/m — profiles and bars' AFTER dim_thickness_mm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS area_cm2 DECIMAL(8,3) NULL AFTER weight_kg_per_m;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS Ix_cm4 DECIMAL(12,3) NULL AFTER area_cm2;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS Iy_cm4 DECIMAL(12,3) NULL AFTER Ix_cm4;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS Wx_cm3 DECIMAL(10,3) NULL AFTER Iy_cm4;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS Wy_cm3 DECIMAL(10,3) NULL AFTER Wx_cm3;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS ix_cm DECIMAL(7,3) NULL AFTER Wy_cm3;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS iy_cm DECIMAL(7,3) NULL AFTER ix_cm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS section_props_json JSON NULL COMMENT 'Full section props blob including Avz, It, Iw etc' AFTER iy_cm;

-- ── BLOCK 3: Fastener Attributes ─────────────────────────────────────────
ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS fastener_standard VARCHAR(30) NULL COMMENT 'DIN 914, DIN 6914, ISO 4017, ASTM A194' AFTER section_props_json;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS fastener_thread VARCHAR(20) NULL COMMENT 'M12, M16, M20, M27' AFTER fastener_standard;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS fastener_length_mm DECIMAL(7,2) NULL AFTER fastener_thread;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS fastener_grade VARCHAR(20) NULL COMMENT '8.8, 10.9, 12.9, 2H, B7' AFTER fastener_length_mm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS fastener_surface VARCHAR(30) NULL COMMENT 'Black Steel, HDG, Zinc, PTFE' AFTER fastener_grade;

-- ── BLOCK 4: Welding Attributes ──────────────────────────────────────────
ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS aws_class VARCHAR(30) NULL COMMENT 'E6013, E7018, E308L, E71T-1, E308LT1' AFTER fastener_surface;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS weld_process ENUM('SMAW','GMAW','FCAW','SAW','GTAW') NULL AFTER aws_class;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS weld_base_material ENUM('MILD_STEEL','STAINLESS','LOW_ALLOY','ALUMINUM') NULL AFTER weld_process;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS weld_diameter_mm DECIMAL(5,2) NULL AFTER weld_base_material;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS weld_current_type VARCHAR(20) NULL COMMENT 'AC, DC+, DC-, AC/DC' AFTER weld_diameter_mm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS weld_tensile_mpa INT NULL AFTER weld_current_type;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS weld_yield_mpa INT NULL AFTER weld_tensile_mpa;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS weld_elongation_pct DECIMAL(5,2) NULL AFTER weld_yield_mpa;

-- ── BLOCK 5: Unit Conversion Engine ──────────────────────────────────────
ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS density_kg_m3 DECIMAL(8,2) DEFAULT 7850.00 COMMENT '7850=carbon, 7930=SS, 2700=Al' AFTER weld_elongation_pct;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS kg_per_m2 DECIMAL(10,4) NULL COMMENT 'Sheets/plates: kg per 1 m²' AFTER density_kg_m3;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS kg_per_lm DECIMAL(10,4) NULL COMMENT 'Profiles/bars: kg per 1 linear meter' AFTER kg_per_m2;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS unit_area_m2 DECIMAL(10,6) NULL COMMENT 'Sheets: width_m * length_m (one unit piece)' AFTER kg_per_lm;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS kg_per_unit DECIMAL(10,4) NULL COMMENT 'Weight of one standard unit (one sheet or one bar)' AFTER unit_area_m2;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS disburse_unit ENUM('KG','TON','M2','LM','PC') DEFAULT 'KG'
  COMMENT 'Preferred unit for production disbursement display' AFTER kg_per_unit;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS unit_conversions_json JSON NULL
  COMMENT 'Cached conversions: {kg_per_m2, m2_per_ton, kg_per_sheet, sheets_per_ton, lm_per_ton, kg_per_bar, bars_per_ton}' AFTER disburse_unit;

-- ── BLOCK 6: Web Enrichment ───────────────────────────────────────────────
ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100) NULL AFTER unit_conversions_json;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS manufacturer_ref VARCHAR(100) NULL AFTER manufacturer;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NULL AFTER manufacturer_ref;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS tds_url VARCHAR(500) NULL AFTER image_url;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS technical_attrs_json JSON NULL
  COMMENT 'Flexible per-category: welding params, paint specs, bolt proof loads, etc.' AFTER tds_url;

-- ── BLOCK 7: Classification Metadata ─────────────────────────────────────
ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS classified_by ENUM(
    'RULE_ENGINE','SECTION_LIBRARY','AI_BATCH','MANUAL','UNCLASSIFIED'
  ) DEFAULT 'UNCLASSIFIED' AFTER technical_attrs_json;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS classification_conf DECIMAL(3,2) DEFAULT 0.00 COMMENT '0.00 to 1.00' AFTER classified_by;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS enriched_at DATETIME NULL AFTER classification_conf;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS review_required BOOLEAN DEFAULT FALSE COMMENT 'true when conf < 0.75' AFTER enriched_at;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS review_notes TEXT NULL AFTER review_required;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS reviewed_by INT NULL COMMENT 'FK to users table' AFTER review_notes;

ALTER TABLE dolibarr_products
  ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL AFTER reviewed_by;

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dp_item_class ON dolibarr_products(item_class);
CREATE INDEX IF NOT EXISTS idx_dp_material_category ON dolibarr_products(material_category);
CREATE INDEX IF NOT EXISTS idx_dp_profile_type ON dolibarr_products(profile_type);
CREATE INDEX IF NOT EXISTS idx_dp_review_required ON dolibarr_products(review_required);
CREATE INDEX IF NOT EXISTS idx_dp_classified_by ON dolibarr_products(classified_by);
