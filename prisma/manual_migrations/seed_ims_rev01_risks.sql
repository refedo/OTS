-- IMS Rev.01 — Steel Structure Risk Register Seed (22.9.0)
-- Seeds FRM-011 (Risk & Compliance Register) with PEB/steel fabrication risks
-- Covers types: RISK, HAZARD, LEGAL, ENVIRONMENTAL, CONTEXT
-- All inserts are idempotent

SET NAMES 'utf8mb4' COLLATE 'utf8mb4_0900_ai_ci';

-- ──────────────────────────────────────────────────────────────────────────────
-- STRATEGIC / OPERATIONAL RISKS (type = RISK)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_steel_risks;
DELIMITER $$
CREATE PROCEDURE seed_steel_risks()
BEGIN

  -- R-001 Weld Quality Failure on Primary Members
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-001') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-001', 'RISK',
      'Weld Quality Failure on Primary Structural Members',
      'Sub-standard welds on columns, rafters or base plates discovered post-fabrication or during client inspection. May result in structural rejection, rework, NCR escalation, and potential project penalty.',
      'TECHNICAL', 'OPEN',
      3, 4, 12, 'HIGH',
      2, 2,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_9001', 'ISO_45001'),
      NOW(), NOW());
  END IF;

  -- R-002 Material Certificate Non-Compliance
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-002') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-002', 'RISK',
      'Steel Mill Certificate Non-Compliance (Grade/Heat)',
      'Received steel material lacks EN/ASTM-compliant mill certificates or certificates do not match the delivered heat/grade. Risk of non-conforming material entering fabrication.',
      'SUPPLY_CHAIN', 'OPEN',
      2, 5, 10, 'HIGH',
      1, 3,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- R-003 Drawing / Revision Control Failure
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-003') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-003', 'RISK',
      'Fabrication from Superseded / Unapproved Drawings',
      'Production team uses an older revision of structural drawings. Results in dimensional non-conformances, rework, and potential site fit-up failure.',
      'OPERATIONAL', 'UNDER_TREATMENT',
      3, 4, 12, 'HIGH',
      1, 2,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- R-004 Project Schedule Overrun
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-004') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-004', 'RISK',
      'Project Delivery Schedule Overrun',
      'Late delivery of fabricated steel to site due to production bottlenecks, procurement delays, design changes, or force majeure. Exposure to LADs and client relationship risk.',
      'STRATEGIC', 'OPEN',
      3, 3, 9, 'MEDIUM',
      2, 2,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- R-005 DFT Coating Deficiency
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-005') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-005', 'RISK',
      'Coating DFT Below Specification',
      'Applied paint system DFT readings below the client-specified minimum per SSPC-PA-2. Requires re-blast and re-coat, delaying dispatch and increasing cost.',
      'TECHNICAL', 'OPEN',
      3, 3, 9, 'MEDIUM',
      2, 2,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- R-006 WPS/PQR Qualification Gap
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-006') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-006', 'RISK',
      'WPS/PQR Not Covering Client-Specified Joint Configuration',
      'A project requires a joint or base metal combination not covered by current approved WPS. Welding cannot proceed without additional qualification, causing delay.',
      'COMPLIANCE', 'OPEN',
      2, 4, 8, 'MEDIUM',
      1, 3,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- R-007 Welder Qualification Expiry
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-007') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-007', 'RISK',
      'Welder WQT Qualification Expired or Not Valid for Scope',
      'Welder qualification test record (WQT) expires or does not cover required material grade/thickness. Production affected or NDT rejection risk increases.',
      'COMPLIANCE', 'UNDER_TREATMENT',
      2, 3, 6, 'MEDIUM',
      1, 2,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- R-008 NDT Finding Rate Increase
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-008') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-008', 'RISK',
      'NDT Weld Rejection Rate Increase (UT/RT)',
      'Ultrasonic or radiographic testing reveals elevated defect rate (porosity, lack of fusion, undercut) in primary welds. Indicates systemic welding process issue.',
      'TECHNICAL', 'OPEN',
      2, 4, 8, 'MEDIUM',
      1, 3,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_9001', 'ISO_45001'),
      NOW(), NOW());
  END IF;

  -- R-009 Key Personnel Resignation (QC/QMR)
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-009') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-009', 'RISK',
      'Loss of Key QC / QMR Personnel',
      'Resignation of QC Manager or QMR creates gap in IMS maintenance, audit coordination, and certification compliance. Risk of surveillance audit finding.',
      'STRATEGIC', 'OPEN',
      2, 4, 8, 'MEDIUM',
      1, 2,
      180, DATE_ADD(NOW(), INTERVAL 180 DAY),
      JSON_ARRAY('ISO_9001', 'ISO_14001', 'ISO_45001'),
      NOW(), NOW());
  END IF;

  -- R-010 Dimensional Out-of-Tolerance
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-010') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-010', 'RISK',
      'Dimensional Out-of-Tolerance on Secondary Members',
      'Cold-formed sections (purlins, girts) produced outside tolerances for length, camber, or web depth. Causes site fit-up problems and rework.',
      'OPERATIONAL', 'OPEN',
      3, 2, 6, 'MEDIUM',
      2, 1,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- ──────────────────────────────────────────────────────────────────────────────
  -- HSE HAZARDS (type = HAZARD)
  -- ──────────────────────────────────────────────────────────────────────────────

  -- H-001 Hot Work / Welding Flash
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-011') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-011', 'HAZARD',
      'Arc Flash / UV Radiation from Welding Operations',
      'Welders and adjacent workers exposed to UV radiation and arc flash without adequate eye protection or welding screens. Can cause arc eye (photokeratitis) and skin burns.',
      'HEALTH_SAFETY', 'OPEN',
      3, 3, 9, 'MEDIUM',
      1, 2,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_45001'),
      NOW(), NOW());
  END IF;

  -- H-002 Grinding / Abrasive Wheel Hazard
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-012') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-012', 'HAZARD',
      'Grinding Wheel Burst / Flying Fragment Injury',
      'Incorrect abrasive wheel installation, over-speed, or improper guard removal increases risk of wheel burst and laceration to face/hands.',
      'HEALTH_SAFETY', 'OPEN',
      2, 5, 10, 'HIGH',
      1, 3,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_45001'),
      NOW(), NOW());
  END IF;

  -- H-003 Overhead Crane / Lifting Operations
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-013') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-013', 'HAZARD',
      'Dropped Load During Overhead Crane / Rigging Operations',
      'Sling failure, improper rigging, or overloading of EOT crane could result in load drop onto personnel or equipment in the fabrication bay.',
      'HEALTH_SAFETY', 'OPEN',
      2, 5, 10, 'HIGH',
      1, 4,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_45001'),
      NOW(), NOW());
  END IF;

  -- H-004 Chemical Exposure (Blasting / Coating)
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-014') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-014', 'HAZARD',
      'Solvent Vapour Inhalation / Skin Contact in Coating Area',
      'Painters and helpers exposed to isocyanate-containing epoxy/polyurethane fumes in enclosed or poorly ventilated coating booth.',
      'HEALTH_SAFETY', 'OPEN',
      3, 4, 12, 'HIGH',
      2, 2,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_45001', 'ISO_14001'),
      NOW(), NOW());
  END IF;

  -- H-005 Manual Handling / Musculoskeletal
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-015') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-015', 'HAZARD',
      'Musculoskeletal Injury from Manual Handling of Steel Sections',
      'Repetitive lifting, carrying, and positioning of heavy steel sections causes back, shoulder, and knee injuries among fabrication workers.',
      'HEALTH_SAFETY', 'UNDER_TREATMENT',
      4, 3, 12, 'HIGH',
      2, 2,
      90, DATE_ADD(NOW(), INTERVAL 90 DAY),
      JSON_ARRAY('ISO_45001'),
      NOW(), NOW());
  END IF;

  -- ──────────────────────────────────────────────────────────────────────────────
  -- LEGAL / REGULATORY (type = LEGAL)
  -- ──────────────────────────────────────────────────────────────────────────────

  -- L-001 ZATCA E-Invoicing
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-016') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-016', 'LEGAL',
      'ZATCA E-Invoicing Phase 2 Compliance Obligation',
      'Hexa Steel is required to integrate VAT invoicing with the Fatoorah e-invoicing platform under ZATCA Phase 2 mandate. Non-compliance results in penalties.',
      'COMPLIANCE', 'UNDER_TREATMENT',
      1, 5, 5, 'MEDIUM',
      1, 2,
      180, DATE_ADD(NOW(), INTERVAL 180 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- L-002 Saudi Labor Law (Saudization / Nitaqat)
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-017') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-017', 'LEGAL',
      'Saudization (Nitaqat) Quota Non-Compliance',
      'Failure to maintain Saudization percentages as required by MHRSD. Risk of Nitaqat status downgrade restricting visa issuance and renewals.',
      'COMPLIANCE', 'MONITORING',
      1, 4, 4, 'LOW',
      1, 3,
      180, DATE_ADD(NOW(), INTERVAL 180 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- L-003 GOSI Registration & Contribution
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-018') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-018', 'LEGAL',
      'GOSI Contribution Delinquency',
      'Late or incorrect GOSI contributions expose the company to fines, employee grievances, and contract blacklisting by government clients.',
      'COMPLIANCE', 'MONITORING',
      1, 3, 3, 'LOW',
      1, 2,
      180, DATE_ADD(NOW(), INTERVAL 180 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- ──────────────────────────────────────────────────────────────────────────────
  -- ENVIRONMENTAL (type = ENVIRONMENTAL)
  -- ──────────────────────────────────────────────────────────────────────────────

  -- E-001 Abrasive Blast Media Disposal
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-019') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-019', 'ENVIRONMENTAL',
      'Hazardous Waste — Spent Blasting Media & Paint Residue',
      'Used copper slag/garnet blasting abrasive contaminated with heavy metal primers and existing paint residue must be disposed via licensed hazardous waste contractor. Improper disposal triggers MoEW penalties.',
      'ENVIRONMENTAL', 'UNDER_TREATMENT',
      2, 4, 8, 'MEDIUM',
      1, 2,
      180, DATE_ADD(NOW(), INTERVAL 180 DAY),
      JSON_ARRAY('ISO_14001', 'ISO_45001'),
      NOW(), NOW());
  END IF;

  -- E-002 VOC Emissions from Coating Operations
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-020') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-020', 'ENVIRONMENTAL',
      'VOC Emissions Exceeding Permitted Threshold',
      'Airborne solvent (VOC) emissions from coating operations exceed GAMEP air quality standards. Requires exhaust treatment and monitoring programme.',
      'ENVIRONMENTAL', 'OPEN',
      2, 3, 6, 'MEDIUM',
      1, 2,
      180, DATE_ADD(NOW(), INTERVAL 180 DAY),
      JSON_ARRAY('ISO_14001'),
      NOW(), NOW());
  END IF;

  -- ──────────────────────────────────────────────────────────────────────────────
  -- CONTEXT (type = CONTEXT) — ISO §4.1 / §4.2
  -- ──────────────────────────────────────────────────────────────────────────────

  -- C-001 Steel Price Volatility
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-021') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-021', 'CONTEXT',
      'Steel Price Volatility — External Context',
      'Global steel market fluctuations (HRC/HR/Section prices) impact raw material cost projections in fixed-price contracts. Affects gross margin on long-tenure projects.',
      'FINANCIAL', 'MONITORING',
      4, 3, 12, 'HIGH',
      3, 2,
      180, DATE_ADD(NOW(), INTERVAL 180 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

  -- C-002 Vision 2030 Localization Opportunity
  IF NOT EXISTS (SELECT 1 FROM ImsRisk WHERE riskNumber = 'RISK-2026-022') THEN
    INSERT INTO ImsRisk (id, riskNumber, type, title, description, category, status,
      currentLikelihood, currentSeverity, currentRiskLevel, currentRiskRating,
      residualLikelihood, residualSeverity,
      reviewFrequencyDays, nextReviewDate, applicableStandards, createdAt, updatedAt)
    VALUES (UUID(), 'RISK-2026-022', 'CONTEXT',
      'Vision 2030 Infrastructure Spend — Market Opportunity',
      'Saudi Vision 2030 GIGA projects (NEOM, Qiddiya, The Line) driving unprecedented demand for structural steel. Opportunity to expand capacity and secure preferred supplier status.',
      'STRATEGIC', 'OPEN',
      5, 4, 20, 'CRITICAL',
      NULL, NULL,
      180, DATE_ADD(NOW(), INTERVAL 180 DAY),
      JSON_ARRAY('ISO_9001'),
      NOW(), NOW());
  END IF;

END$$
DELIMITER ;
CALL seed_steel_risks();
DROP PROCEDURE IF EXISTS seed_steel_risks;

-- ──────────────────────────────────────────────────────────────────────────────
-- RISK TREATMENTS — initial treatment plans for HIGH/CRITICAL risks
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_steel_risk_treatments;
DELIMITER $$
CREATE PROCEDURE seed_steel_risk_treatments()
BEGIN
  DECLARE v_r001 CHAR(36); DECLARE v_r002 CHAR(36); DECLARE v_r003 CHAR(36);
  DECLARE v_r012 CHAR(36); DECLARE v_r013 CHAR(36); DECLARE v_r014 CHAR(36);
  DECLARE v_r015 CHAR(36);

  SELECT id INTO v_r001 FROM ImsRisk WHERE riskNumber = 'RISK-2026-001' LIMIT 1;
  SELECT id INTO v_r002 FROM ImsRisk WHERE riskNumber = 'RISK-2026-002' LIMIT 1;
  SELECT id INTO v_r003 FROM ImsRisk WHERE riskNumber = 'RISK-2026-003' LIMIT 1;
  SELECT id INTO v_r012 FROM ImsRisk WHERE riskNumber = 'RISK-2026-012' LIMIT 1;
  SELECT id INTO v_r013 FROM ImsRisk WHERE riskNumber = 'RISK-2026-013' LIMIT 1;
  SELECT id INTO v_r014 FROM ImsRisk WHERE riskNumber = 'RISK-2026-014' LIMIT 1;
  SELECT id INTO v_r015 FROM ImsRisk WHERE riskNumber = 'RISK-2026-015' LIMIT 1;

  -- Treatments for RISK-2026-001 (Weld Quality)
  IF v_r001 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ImsRiskTreatment WHERE riskId = v_r001 AND treatmentType = 'Reduce'
  ) THEN
    INSERT INTO ImsRiskTreatment (id, riskId, treatmentType, description, targetDate, status, createdAt, updatedAt)
    VALUES (UUID(), v_r001, 'Reduce',
      'Implement 100% visual inspection + 10% NDE spot-check on all primary member welds. Update ITP hold-point matrix to require QC sign-off before next operation.',
      DATE_ADD(NOW(), INTERVAL 60 DAY), 'IN_PROGRESS', NOW(), NOW());
  END IF;
  IF v_r001 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ImsRiskTreatment WHERE riskId = v_r001 AND treatmentType = 'Mitigate'
  ) THEN
    INSERT INTO ImsRiskTreatment (id, riskId, treatmentType, description, targetDate, status, createdAt, updatedAt)
    VALUES (UUID(), v_r001, 'Mitigate',
      'Conduct WPS refresher training for all welders. Review and revalidate all WPS/PQR documents against current project scope.',
      DATE_ADD(NOW(), INTERVAL 90 DAY), 'PLANNED', NOW(), NOW());
  END IF;

  -- Treatment for RISK-2026-002 (Mill Certs)
  IF v_r002 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ImsRiskTreatment WHERE riskId = v_r002
  ) THEN
    INSERT INTO ImsRiskTreatment (id, riskId, treatmentType, description, targetDate, status, createdAt, updatedAt)
    VALUES (UUID(), v_r002, 'Reduce',
      'Require mill certificates as mandatory pre-condition of goods receipt. Implement MIR procedure requiring certificate verification before issue to production.',
      DATE_ADD(NOW(), INTERVAL 30 DAY), 'IN_PROGRESS', NOW(), NOW());
  END IF;

  -- Treatment for RISK-2026-003 (Drawings)
  IF v_r003 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ImsRiskTreatment WHERE riskId = v_r003
  ) THEN
    INSERT INTO ImsRiskTreatment (id, riskId, treatmentType, description, targetDate, status, createdAt, updatedAt)
    VALUES (UUID(), v_r003, 'Reduce',
      'Enforce OTS document control: all approved drawings issued through IMS Document Registry. Production floor access restricted to printed copies stamped CONTROLLED.',
      DATE_ADD(NOW(), INTERVAL 45 DAY), 'IN_PROGRESS', NOW(), NOW());
  END IF;

  -- Treatment for RISK-2026-012 (Grinding)
  IF v_r012 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ImsRiskTreatment WHERE riskId = v_r012
  ) THEN
    INSERT INTO ImsRiskTreatment (id, riskId, treatmentType, description, targetDate, status, createdAt, updatedAt)
    VALUES (UUID(), v_r012, 'Eliminate',
      'Mandatory wheel inspection before use, guard installation checklist, and RPM rating verification. Non-compliant grinders removed from service.',
      DATE_ADD(NOW(), INTERVAL 21 DAY), 'PLANNED', NOW(), NOW());
  END IF;

  -- Treatment for RISK-2026-013 (Crane)
  IF v_r013 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ImsRiskTreatment WHERE riskId = v_r013
  ) THEN
    INSERT INTO ImsRiskTreatment (id, riskId, treatmentType, description, targetDate, status, createdAt, updatedAt)
    VALUES (UUID(), v_r013, 'Reduce',
      'All rigging personnel to hold valid LEEA rigging certificate. Implement pre-lift checklist and exclusion zone marking for all lifts > 2 tonnes.',
      DATE_ADD(NOW(), INTERVAL 60 DAY), 'IN_PROGRESS', NOW(), NOW());
  END IF;

  -- Treatment for RISK-2026-014 (Coating chemicals)
  IF v_r014 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ImsRiskTreatment WHERE riskId = v_r014
  ) THEN
    INSERT INTO ImsRiskTreatment (id, riskId, treatmentType, description, targetDate, status, createdAt, updatedAt)
    VALUES (UUID(), v_r014, 'Reduce',
      'Install local exhaust ventilation (LEV) in coating booth. Mandatory supplied air respirators for all coating operatives. Conduct air monitoring quarterly.',
      DATE_ADD(NOW(), INTERVAL 90 DAY), 'PLANNED', NOW(), NOW());
  END IF;

  -- Treatment for RISK-2026-015 (Manual handling)
  IF v_r015 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ImsRiskTreatment WHERE riskId = v_r015
  ) THEN
    INSERT INTO ImsRiskTreatment (id, riskId, treatmentType, description, targetDate, status, createdAt, updatedAt)
    VALUES (UUID(), v_r015, 'Reduce',
      'Introduce mechanical lifting aids (jib cranes, ergonomic trolleys) at critical handling points. Deliver manual handling training to all shop floor staff.',
      DATE_ADD(NOW(), INTERVAL 60 DAY), 'IN_PROGRESS', NOW(), NOW());
  END IF;

END$$
DELIMITER ;
CALL seed_steel_risk_treatments();
DROP PROCEDURE IF EXISTS seed_steel_risk_treatments;

-- ──────────────────────────────────────────────────────────────────────────────
-- ISP REGISTER — Update IMS documents with new ISP list (Hexa-ISM-001 Rev.01 App.A)
-- Sets domain field on existing ISP documents; inserts new ISP category if needed
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_isp_register_v2;
DELIMITER $$
CREATE PROCEDURE seed_isp_register_v2()
BEGIN
  DECLARE v_cat CHAR(36);

  -- Ensure ISP category exists
  IF NOT EXISTS (SELECT 1 FROM ImsCategory WHERE code = 'ISP') THEN
    INSERT INTO ImsCategory (id, code, name, nameAr, level, isActive, createdAt, updatedAt)
    VALUES (UUID(), 'ISP', 'IMS System Procedure', 'إجراء نظام الإدارة', 2, 1, NOW(), NOW());
  END IF;
  SELECT id INTO v_cat FROM ImsCategory WHERE code = 'ISP' LIMIT 1;

  -- Mark old ISPs (ISP-008 to ISP-015 where not in new list) as SUPERSEDED
  UPDATE ImsDocument
  SET status = 'SUPERSEDED', updatedAt = NOW()
  WHERE categoryId = v_cat
    AND (documentNumber COLLATE utf8mb4_0900_ai_ci) NOT IN (
      'ISP-001','ISP-002','ISP-003','ISP-004','ISP-005',
      'ISP-006','ISP-030',
      'ISP-010','ISP-011','ISP-012','ISP-013','ISP-014','ISP-015','ISP-016','ISP-017',
      'ISP-020',
      'DCP-001','WPS-HEXA.S-01'
    )
    AND deletedAt IS NULL;

  -- ── LEVEL 1 — SYSTEM ─────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-001') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-001', 'Document & Data Governance', v_cat, 'APPROVED', '2.0', 'INTERNAL', 365, 'SYSTEM', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'SYSTEM', status = 'APPROVED', title = 'Document & Data Governance', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-002') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-002', 'Risk & Compliance Management', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'SYSTEM', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'SYSTEM', status = 'APPROVED', title = 'Risk & Compliance Management', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-002';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-003') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-003', 'Management Review', v_cat, 'APPROVED', '1.1', 'INTERNAL', 365, 'SYSTEM', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'SYSTEM', status = 'APPROVED', title = 'Management Review', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-003';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-004') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-004', 'Internal Audit', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'SYSTEM', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'SYSTEM', status = 'APPROVED', title = 'Internal Audit', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-004';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-005') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-005', 'Nonconformance & CAPA', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'SYSTEM', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'SYSTEM', status = 'APPROVED', title = 'Nonconformance & CAPA', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-005';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-006') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-006', 'Competence, Training & HR Control', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'SYSTEM', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'SYSTEM', status = 'APPROVED', title = 'Competence, Training & HR Control', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-006';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-030') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-030', 'Business Planning & KPI Management', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'SYSTEM', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'SYSTEM', status = 'APPROVED', title = 'Business Planning & KPI Management', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-030';
  END IF;

  -- ── LEVEL 2 — OPERATIONS ─────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-010') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-010', 'Design & Engineering Control', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'OPERATIONS', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'OPERATIONS', status = 'APPROVED', title = 'Design & Engineering Control', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-010';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-011') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-011', 'Procurement & Supplier Control', v_cat, 'APPROVED', '1.1', 'INTERNAL', 365, 'OPERATIONS', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'OPERATIONS', status = 'APPROVED', title = 'Procurement & Supplier Control', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-011';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-012') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-012', 'Primary Fabrication & Welding Control', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'OPERATIONS', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'OPERATIONS', status = 'APPROVED', title = 'Primary Fabrication & Welding Control', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-012';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-013') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-013', 'Secondary Members & Roll Forming', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'OPERATIONS', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'OPERATIONS', status = 'APPROVED', title = 'Secondary Members & Roll Forming', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-013';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-014') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-014', 'Shot Blasting, Surface Prep & Coating', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'OPERATIONS', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'OPERATIONS', status = 'APPROVED', title = 'Shot Blasting, Surface Prep & Coating', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-014';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-015') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-015', 'QC & Inspection Control', v_cat, 'APPROVED', '1.1', 'INTERNAL', 365, 'OPERATIONS', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'OPERATIONS', status = 'APPROVED', title = 'QC & Inspection Control', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-015';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-016') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-016', 'Outsourced NDT Control', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'OPERATIONS', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'OPERATIONS', status = 'APPROVED', title = 'Outsourced NDT Control', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-016';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-017') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-017', 'Logistics & Dispatch Control', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'OPERATIONS', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'OPERATIONS', status = 'APPROVED', title = 'Logistics & Dispatch Control', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-017';
  END IF;

  -- ── LEVEL 3 — HSE ────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-020') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'ISP-020', 'HSE Operational Control', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'HSE', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'HSE', status = 'APPROVED', title = 'HSE Operational Control', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'ISP-020';
  END IF;

  -- ── TECHNICAL ────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'DCP-001') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'DCP-001', 'Design Control Programme', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'TECHNICAL', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'TECHNICAL', status = 'APPROVED', title = 'Design Control Programme', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'DCP-001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsDocument WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'WPS-HEXA.S-01') AND v_cat IS NOT NULL THEN
    INSERT INTO ImsDocument (id, documentNumber, title, categoryId, status, currentVersion, confidentiality, reviewFrequencyDays, domain, createdAt, updatedAt)
    VALUES (UUID(), 'WPS-HEXA.S-01', 'Welding Procedure Specification', v_cat, 'APPROVED', '1.0', 'INTERNAL', 365, 'TECHNICAL', NOW(), NOW());
  ELSE
    UPDATE ImsDocument SET domain = 'TECHNICAL', status = 'APPROVED', title = 'Welding Procedure Specification', updatedAt = NOW()
    WHERE (documentNumber COLLATE utf8mb4_0900_ai_ci) = 'WPS-HEXA.S-01';
  END IF;

  -- Set nextReviewDate for all ISP docs where it has not been set yet
  UPDATE ImsDocument
  SET nextReviewDate = DATE_ADD(NOW(), INTERVAL reviewFrequencyDays DAY),
      updatedAt = NOW()
  WHERE categoryId = v_cat
    AND nextReviewDate IS NULL
    AND deletedAt IS NULL;

END$$
DELIMITER ;
CALL seed_isp_register_v2();
DROP PROCEDURE IF EXISTS seed_isp_register_v2;
