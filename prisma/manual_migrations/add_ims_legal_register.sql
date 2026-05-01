-- 22.2.0 — Gap 1: Legal & Regulatory Register (ISO 9001/14001/45001 §6.1.3)

-- ── ImsLegalRegister table ───────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_legal_register;
DELIMITER $$
CREATE PROCEDURE create_ims_legal_register()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsLegalRegister'
  ) THEN
    CREATE TABLE `ImsLegalRegister` (
      `id`               CHAR(36)     NOT NULL PRIMARY KEY,
      `referenceNumber`  VARCHAR(100) NOT NULL UNIQUE,
      `title`            VARCHAR(255) NOT NULL,
      `standard`         VARCHAR(255) NOT NULL,
      `isoStandard`      VARCHAR(50)  NOT NULL,
      `category`         VARCHAR(50)  NOT NULL,
      `applicableTo`     VARCHAR(255) NOT NULL,
      `complianceStatus` VARCHAR(30)  NOT NULL DEFAULT 'Under Review',
      `lastReviewedAt`   DATETIME(3)  NULL,
      `nextReviewDue`    DATETIME(3)  NULL,
      `reviewFrequency`  VARCHAR(30)  NOT NULL DEFAULT 'Annual',
      `responsibleId`    CHAR(36)     NULL,
      `notes`            TEXT         NULL,
      `evidenceInOts`    VARCHAR(255) NULL,
      `deletedAt`        DATETIME(3)  NULL,
      `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `createdById`      CHAR(36)     NULL,
      `updatedById`      CHAR(36)     NULL,
      INDEX `idx_ilr_status`   (`complianceStatus`),
      INDEX `idx_ilr_iso`      (`isoStandard`),
      INDEX `idx_ilr_review`   (`nextReviewDue`),
      INDEX `idx_ilr_deleted`  (`deletedAt`),
      INDEX `idx_ilr_resp`     (`responsibleId`),
      CONSTRAINT `fk_ilr_responsible` FOREIGN KEY (`responsibleId`) REFERENCES `User`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_legal_register();
DROP PROCEDURE IF EXISTS create_ims_legal_register;

-- ── Seed 12 Saudi Arabia applicable regulations ───────────────────────────────
DROP PROCEDURE IF EXISTS seed_ims_legal_register;
DELIMITER $$
CREATE PROCEDURE seed_ims_legal_register()
BEGIN
  DECLARE v_next_review DATETIME(3);
  SET v_next_review = DATE_ADD(NOW(), INTERVAL 1 YEAR);

  IF NOT EXISTS (SELECT 1 FROM `ImsLegalRegister` WHERE `referenceNumber` = 'LR-001') THEN
    INSERT INTO `ImsLegalRegister`
      (`id`, `referenceNumber`, `title`, `standard`, `isoStandard`, `category`, `applicableTo`,
       `complianceStatus`, `lastReviewedAt`, `nextReviewDue`, `reviewFrequency`, `notes`, `createdAt`, `updatedAt`)
    VALUES
    -- 1. Saudi Labor Law
    (UUID(), 'LR-001',
     'Saudi Labor Law (Royal Decree M/51)',
     'MHRSD Saudi Labor Law (Royal Decree M/51)',
     'ISO 45001', 'Legal', 'HR',
     'Compliant', NOW(), v_next_review, 'Annual',
     'Covers employment contracts, working hours, leave entitlements, and termination procedures.',
     NOW(), NOW()),

    -- 2. GOSI Regulations
    (UUID(), 'LR-002',
     'GOSI Social Insurance Regulations',
     'GOSI Regulations (Social Insurance Law)',
     'ISO 45001', 'Regulatory', 'HR / Finance',
     'Compliant', NOW(), v_next_review, 'Annual',
     'General Organization for Social Insurance contribution and registration requirements.',
     NOW(), NOW()),

    -- 3. Civil Defense OHS
    (UUID(), 'LR-003',
     'Civil Defense OHS Requirements',
     'Civil Defense OHS Requirements (MoI)',
     'ISO 45001', 'Regulatory', 'HSE / Production',
     'Compliant', NOW(), v_next_review, 'Annual',
     'Ministry of Interior Civil Defense requirements for industrial facilities.',
     NOW(), NOW()),

    -- 4. ZATCA VAT
    (UUID(), 'LR-004',
     'ZATCA VAT Regulations',
     'ZATCA VAT Regulations',
     'ISO 9001', 'Regulatory', 'Finance',
     'Compliant', NOW(), v_next_review, 'Annual',
     'Value Added Tax compliance per ZATCA requirements including e-invoicing (FATOORAH).',
     NOW(), NOW()),

    -- 5. MOMRA Industrial Licensing
    (UUID(), 'LR-005',
     'MOMRA Industrial Facility Licensing',
     'MOMRA Industrial Facility Licensing',
     'ISO 9001', 'Regulatory', 'All',
     'Compliant', NOW(), v_next_review, 'Annual',
     'Ministry of Municipalities and Rural Affairs licensing for industrial operations.',
     NOW(), NOW()),

    -- 6. SASO Safety Standards
    (UUID(), 'LR-006',
     'SASO Safety Standards for Steel Products',
     'SASO Safety Standards for Steel Products',
     'ISO 9001', 'Regulatory', 'Production / QC',
     'Compliant', NOW(), v_next_review, 'Annual',
     'Saudi Standards, Metrology and Quality Organization standards applicable to structural steel.',
     NOW(), NOW()),

    -- 7. Environment Law
    (UUID(), 'LR-007',
     'Saudi Environment Law (Royal Decree M/165)',
     'Environment Law (Royal Decree M/165)',
     'ISO 14001', 'Legal', 'HSE',
     'Compliant', NOW(), v_next_review, 'Annual',
     'National Center for Environmental Compliance requirements for industrial operations.',
     NOW(), NOW()),

    -- 8. Hazardous Materials
    (UUID(), 'LR-008',
     'Chemical & Hazardous Materials Regulations (NCEC)',
     'Chemical & Hazardous Materials Regulations (NCEC)',
     'ISO 14001', 'Regulatory', 'HSE / Production',
     'Compliant', NOW(), v_next_review, 'Annual',
     'National Center for Environmental Compliance chemical storage and handling requirements.',
     NOW(), NOW()),

    -- 9. Work Permit System
    (UUID(), 'LR-009',
     'MHRSD Work Permit System (Expatriate)',
     'MHRSD Work Permit System (Expatriate)',
     'ISO 45001', 'Legal', 'HR',
     'Compliant', NOW(), v_next_review, 'Annual',
     'Nitaqat Saudization compliance and expatriate work permit requirements.',
     NOW(), NOW()),

    -- 10. Saudi Building Code
    (UUID(), 'LR-010',
     'Saudi Building Code (SBC)',
     'Saudi Building Code (SBC)',
     'ISO 9001', 'Regulatory', 'Production',
     'Compliant', NOW(), v_next_review, 'Annual',
     'Structural and fire safety requirements per Saudi Building Code for steel structures.',
     NOW(), NOW()),

    -- 11. ARAMCO HSE
    (UUID(), 'LR-011',
     'ARAMCO Contractor HSE Requirements (GI-0002.102)',
     'ARAMCO Contractor HSE Requirements (GI-0002.102)',
     'ISO 45001', 'Contractual', 'HSE',
     'Compliant', NOW(), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'Semi-Annual',
     'Saudi Aramco General Instructions for contractor HSE management applicable to all Aramco project work.',
     NOW(), NOW()),

    -- 12. AWS D1.1
    (UUID(), 'LR-012',
     'AWS D1.1:2020 Structural Welding Code — Steel',
     'AWS D1.1:2020 Structural Welding Code — Steel',
     'ISO 9001', 'Regulatory', 'Production / QC',
     'Compliant', NOW(), v_next_review, 'Annual',
     'American Welding Society structural welding code governing weld qualification, inspection, and acceptance.',
     NOW(), NOW());
  END IF;
END$$
DELIMITER ;
CALL seed_ims_legal_register();
DROP PROCEDURE IF EXISTS seed_ims_legal_register;
