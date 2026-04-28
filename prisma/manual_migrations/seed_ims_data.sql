-- 22.0.0 — IMS Seed Data
-- Section 1: Document Categories
-- Section 2: ISO Clauses (9001, 14001, 45001)
-- Section 3: Workflow Definitions

-- ──────────────────────────────────────────────────────────────────────────────
-- SECTION 1: Document Categories
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_ims_categories;
DELIMITER $$
CREATE PROCEDURE seed_ims_categories()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ImsCategory WHERE code = 'QM') THEN
    INSERT INTO ImsCategory (id, code, name, nameAr, level, isActive, createdAt, updatedAt)
    VALUES (UUID(), 'QM', 'Quality Manual', 'دليل الجودة', 1, 1, NOW(), NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsCategory WHERE code = 'POL') THEN
    INSERT INTO ImsCategory (id, code, name, nameAr, level, isActive, createdAt, updatedAt)
    VALUES (UUID(), 'POL', 'Policy', 'السياسة', 1, 1, NOW(), NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsCategory WHERE code = 'SOP') THEN
    INSERT INTO ImsCategory (id, code, name, nameAr, level, isActive, createdAt, updatedAt)
    VALUES (UUID(), 'SOP', 'Standard Operating Procedure', 'إجراء تشغيل موحد', 2, 1, NOW(), NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsCategory WHERE code = 'PLN') THEN
    INSERT INTO ImsCategory (id, code, name, nameAr, level, isActive, createdAt, updatedAt)
    VALUES (UUID(), 'PLN', 'Plan', 'خطة', 2, 1, NOW(), NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsCategory WHERE code = 'WI') THEN
    INSERT INTO ImsCategory (id, code, name, nameAr, level, isActive, createdAt, updatedAt)
    VALUES (UUID(), 'WI', 'Work Instruction', 'تعليمات عمل', 3, 1, NOW(), NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsCategory WHERE code = 'FRM') THEN
    INSERT INTO ImsCategory (id, code, name, nameAr, level, isActive, createdAt, updatedAt)
    VALUES (UUID(), 'FRM', 'Form', 'نموذج', 4, 1, NOW(), NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsCategory WHERE code = 'EXT') THEN
    INSERT INTO ImsCategory (id, code, name, nameAr, level, isActive, createdAt, updatedAt)
    VALUES (UUID(), 'EXT', 'External Document', 'وثيقة خارجية', 5, 1, NOW(), NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsCategory WHERE code = 'REC') THEN
    INSERT INTO ImsCategory (id, code, name, nameAr, level, isActive, createdAt, updatedAt)
    VALUES (UUID(), 'REC', 'Record', 'سجل', 6, 1, NOW(), NOW());
  END IF;
END$$
DELIMITER ;
CALL seed_ims_categories();
DROP PROCEDURE IF EXISTS seed_ims_categories;

-- ──────────────────────────────────────────────────────────────────────────────
-- SECTION 2a: ISO 9001:2015 Clauses
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_iso9001_clauses;
DELIMITER $$
CREATE PROCEDURE seed_iso9001_clauses()
BEGIN
  DECLARE v4 CHAR(36); DECLARE v5 CHAR(36); DECLARE v6 CHAR(36);
  DECLARE v7 CHAR(36); DECLARE v8 CHAR(36); DECLARE v9 CHAR(36); DECLARE v10 CHAR(36);
  DECLARE v51 CHAR(36); DECLARE v52 CHAR(36); DECLARE v53 CHAR(36);
  DECLARE v61 CHAR(36); DECLARE v62 CHAR(36);
  DECLARE v71 CHAR(36); DECLARE v72 CHAR(36); DECLARE v73 CHAR(36); DECLARE v74 CHAR(36); DECLARE v75 CHAR(36);
  DECLARE v81 CHAR(36); DECLARE v82 CHAR(36); DECLARE v83 CHAR(36); DECLARE v84 CHAR(36); DECLARE v85 CHAR(36);
  DECLARE v91 CHAR(36); DECLARE v92 CHAR(36); DECLARE v93 CHAR(36);
  DECLARE v101 CHAR(36); DECLARE v102 CHAR(36);

  -- Clause 4
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='4') THEN
    SET v4 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v4,'ISO_9001','4','Context of the organization',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v4 FROM ImsClause WHERE standard='ISO_9001' AND clause='4'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='4.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','4.1','Understanding the organization and its context',v4,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='4.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','4.2','Understanding the needs and expectations of interested parties',v4,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='4.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','4.3','Determining the scope of the quality management system',v4,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='4.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','4.4','Quality management system and its processes',v4,2,1,NOW(),NOW()); END IF;

  -- Clause 5
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='5') THEN
    SET v5 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v5,'ISO_9001','5','Leadership',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v5 FROM ImsClause WHERE standard='ISO_9001' AND clause='5'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='5.1') THEN
    SET v51 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v51,'ISO_9001','5.1','Leadership and commitment',v5,2,1,NOW(),NOW());
  ELSE SELECT id INTO v51 FROM ImsClause WHERE standard='ISO_9001' AND clause='5.1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='5.1.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','5.1.1','General',v51,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='5.1.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','5.1.2','Customer focus',v51,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='5.2') THEN
    SET v52 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v52,'ISO_9001','5.2','Policy',v5,2,1,NOW(),NOW());
  ELSE SELECT id INTO v52 FROM ImsClause WHERE standard='ISO_9001' AND clause='5.2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='5.2.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','5.2.1','Establishing the quality policy',v52,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='5.2.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','5.2.2','Communicating the quality policy',v52,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='5.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','5.3','Organizational roles, responsibilities and authorities',v5,2,1,NOW(),NOW()); END IF;

  -- Clause 6
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='6') THEN
    SET v6 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v6,'ISO_9001','6','Planning',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v6 FROM ImsClause WHERE standard='ISO_9001' AND clause='6'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='6.1') THEN
    SET v61 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v61,'ISO_9001','6.1','Actions to address risks and opportunities',v6,2,1,NOW(),NOW());
  ELSE SELECT id INTO v61 FROM ImsClause WHERE standard='ISO_9001' AND clause='6.1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='6.1.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','6.1.1','General',v61,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='6.1.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','6.1.2','Actions to address risks and opportunities',v61,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='6.2') THEN
    SET v62 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v62,'ISO_9001','6.2','Quality objectives and planning to achieve them',v6,2,1,NOW(),NOW());
  ELSE SELECT id INTO v62 FROM ImsClause WHERE standard='ISO_9001' AND clause='6.2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='6.2.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','6.2.1','Quality objectives',v62,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='6.2.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','6.2.2','Planning to achieve quality objectives',v62,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='6.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','6.3','Planning of changes',v6,2,1,NOW(),NOW()); END IF;

  -- Clause 7
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7') THEN
    SET v7 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v7,'ISO_9001','7','Support',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v7 FROM ImsClause WHERE standard='ISO_9001' AND clause='7'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.1') THEN
    SET v71 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v71,'ISO_9001','7.1','Resources',v7,2,1,NOW(),NOW());
  ELSE SELECT id INTO v71 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.1.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.1.1','General',v71,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.1.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.1.2','People',v71,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.1.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.1.3','Infrastructure',v71,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.1.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.1.4','Environment for the operation of processes',v71,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.1.5') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.1.5','Monitoring and measuring resources',v71,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.1.6') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.1.6','Organizational knowledge',v71,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.2','Competence',v7,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.3','Awareness',v7,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.4','Communication',v7,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.5') THEN
    SET v75 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v75,'ISO_9001','7.5','Documented information',v7,2,1,NOW(),NOW());
  ELSE SELECT id INTO v75 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.5.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.5.1','General',v75,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.5.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.5.2','Creating and updating',v75,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='7.5.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','7.5.3','Control of documented information',v75,3,1,NOW(),NOW()); END IF;

  -- Clause 8
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8') THEN
    SET v8 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v8,'ISO_9001','8','Operation',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v8 FROM ImsClause WHERE standard='ISO_9001' AND clause='8'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.1','Operational planning and control',v8,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.2') THEN
    SET v82 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v82,'ISO_9001','8.2','Requirements for products and services',v8,2,1,NOW(),NOW());
  ELSE SELECT id INTO v82 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.2.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.2.1','Customer communication',v82,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.2.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.2.2','Determining the requirements for products and services',v82,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.2.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.2.3','Review of the requirements',v82,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.2.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.2.4','Changes to requirements',v82,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.3') THEN
    SET v83 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v83,'ISO_9001','8.3','Design and development of products and services',v8,2,1,NOW(),NOW());
  ELSE SELECT id INTO v83 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.3'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.3.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.3.1','General',v83,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.3.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.3.2','Design and development planning',v83,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.3.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.3.3','Design and development inputs',v83,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.3.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.3.4','Design and development controls',v83,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.3.5') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.3.5','Design and development outputs',v83,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.3.6') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.3.6','Design and development changes',v83,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.4') THEN
    SET v84 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v84,'ISO_9001','8.4','Control of externally provided processes, products and services',v8,2,1,NOW(),NOW());
  ELSE SELECT id INTO v84 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.4'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.4.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.4.1','General',v84,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.4.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.4.2','Type and extent of control',v84,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.4.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.4.3','Information for external providers',v84,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.5') THEN
    SET v85 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v85,'ISO_9001','8.5','Production and service provision',v8,2,1,NOW(),NOW());
  ELSE SELECT id INTO v85 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.5.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.5.1','Control of production and service provision',v85,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.5.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.5.2','Identification and traceability',v85,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.5.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.5.3','Property belonging to customers or external providers',v85,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.5.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.5.4','Preservation',v85,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.5.5') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.5.5','Post-delivery activities',v85,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.5.6') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.5.6','Control of changes',v85,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.6') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.6','Release of products and services',v8,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='8.7') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','8.7','Control of nonconforming outputs',v8,2,1,NOW(),NOW()); END IF;

  -- Clause 9
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9') THEN
    SET v9 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v9,'ISO_9001','9','Performance evaluation',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v9 FROM ImsClause WHERE standard='ISO_9001' AND clause='9'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.1') THEN
    SET v91 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v91,'ISO_9001','9.1','Monitoring, measurement, analysis and evaluation',v9,2,1,NOW(),NOW());
  ELSE SELECT id INTO v91 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.1.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','9.1.1','General',v91,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.1.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','9.1.2','Customer satisfaction',v91,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.1.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','9.1.3','Analysis and evaluation',v91,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.2') THEN
    SET v92 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v92,'ISO_9001','9.2','Internal audit',v9,2,1,NOW(),NOW());
  ELSE SELECT id INTO v92 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.2.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','9.2.1','General',v92,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.2.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','9.2.2','Internal audit programme',v92,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.3') THEN
    SET v93 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v93,'ISO_9001','9.3','Management review',v9,2,1,NOW(),NOW());
  ELSE SELECT id INTO v93 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.3'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.3.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','9.3.1','General',v93,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.3.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','9.3.2','Management review inputs',v93,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='9.3.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','9.3.3','Management review outputs',v93,3,1,NOW(),NOW()); END IF;

  -- Clause 10
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='10') THEN
    SET v10 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v10,'ISO_9001','10','Improvement',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v10 FROM ImsClause WHERE standard='ISO_9001' AND clause='10'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='10.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','10.1','General',v10,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='10.2') THEN
    SET v102 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v102,'ISO_9001','10.2','Nonconformity and corrective action',v10,2,1,NOW(),NOW());
  ELSE SELECT id INTO v102 FROM ImsClause WHERE standard='ISO_9001' AND clause='10.2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='10.2.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','10.2.1','Reaction to nonconformity',v102,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='10.2.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','10.2.2','Evaluation of need for corrective action',v102,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_9001' AND clause='10.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_9001','10.3','Continual improvement',v10,2,1,NOW(),NOW()); END IF;
END$$
DELIMITER ;
CALL seed_iso9001_clauses();
DROP PROCEDURE IF EXISTS seed_iso9001_clauses;

-- =============================================================================
-- Section 2b: ISO 14001:2015 Clauses
-- =============================================================================
DROP PROCEDURE IF EXISTS seed_iso14001_clauses;
DELIMITER $$
CREATE PROCEDURE seed_iso14001_clauses()
BEGIN
  DECLARE v4 VARCHAR(36) DEFAULT NULL;
  DECLARE v41 VARCHAR(36) DEFAULT NULL;
  DECLARE v42 VARCHAR(36) DEFAULT NULL;
  DECLARE v43 VARCHAR(36) DEFAULT NULL;
  DECLARE v44 VARCHAR(36) DEFAULT NULL;
  DECLARE v5 VARCHAR(36) DEFAULT NULL;
  DECLARE v51 VARCHAR(36) DEFAULT NULL;
  DECLARE v52 VARCHAR(36) DEFAULT NULL;
  DECLARE v53 VARCHAR(36) DEFAULT NULL;
  DECLARE v6 VARCHAR(36) DEFAULT NULL;
  DECLARE v61 VARCHAR(36) DEFAULT NULL;
  DECLARE v62 VARCHAR(36) DEFAULT NULL;
  DECLARE v63 VARCHAR(36) DEFAULT NULL;
  DECLARE v7 VARCHAR(36) DEFAULT NULL;
  DECLARE v71 VARCHAR(36) DEFAULT NULL;
  DECLARE v72 VARCHAR(36) DEFAULT NULL;
  DECLARE v73 VARCHAR(36) DEFAULT NULL;
  DECLARE v74 VARCHAR(36) DEFAULT NULL;
  DECLARE v8 VARCHAR(36) DEFAULT NULL;
  DECLARE v81 VARCHAR(36) DEFAULT NULL;
  DECLARE v82 VARCHAR(36) DEFAULT NULL;
  DECLARE v9 VARCHAR(36) DEFAULT NULL;
  DECLARE v91 VARCHAR(36) DEFAULT NULL;
  DECLARE v92 VARCHAR(36) DEFAULT NULL;
  DECLARE v93 VARCHAR(36) DEFAULT NULL;
  DECLARE v10 VARCHAR(36) DEFAULT NULL;
  DECLARE v101 VARCHAR(36) DEFAULT NULL;
  DECLARE v102 VARCHAR(36) DEFAULT NULL;

  -- Clause 4
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='4') THEN
    SET v4 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v4,'ISO_14001','4','Context of the organisation',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v4 FROM ImsClause WHERE standard='ISO_14001' AND clause='4'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='4.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','4.1','Understanding the organisation and its context',v4,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='4.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','4.2','Understanding the needs and expectations of interested parties',v4,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='4.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','4.3','Determining the scope of the EMS',v4,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='4.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','4.4','Environmental management system',v4,2,1,NOW(),NOW()); END IF;

  -- Clause 5
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='5') THEN
    SET v5 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v5,'ISO_14001','5','Leadership',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v5 FROM ImsClause WHERE standard='ISO_14001' AND clause='5'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='5.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','5.1','Leadership and commitment',v5,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='5.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','5.2','Environmental policy',v5,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='5.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','5.3','Organisational roles, responsibilities and authorities',v5,2,1,NOW(),NOW()); END IF;

  -- Clause 6
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='6') THEN
    SET v6 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v6,'ISO_14001','6','Planning',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v6 FROM ImsClause WHERE standard='ISO_14001' AND clause='6'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.1') THEN
    SET v61 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v61,'ISO_14001','6.1','Actions to address risks and opportunities',v6,2,1,NOW(),NOW());
  ELSE SELECT id INTO v61 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.1.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','6.1.1','General',v61,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.1.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','6.1.2','Environmental aspects',v61,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.1.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','6.1.3','Compliance obligations',v61,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.1.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','6.1.4','Planning action',v61,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.2') THEN
    SET v62 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v62,'ISO_14001','6.2','Environmental objectives and planning to achieve them',v6,2,1,NOW(),NOW());
  ELSE SELECT id INTO v62 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.2.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','6.2.1','Establish environmental objectives',v62,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='6.2.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','6.2.2','Planning actions to achieve objectives',v62,3,1,NOW(),NOW()); END IF;

  -- Clause 7
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7') THEN
    SET v7 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v7,'ISO_14001','7','Support',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v7 FROM ImsClause WHERE standard='ISO_14001' AND clause='7'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','7.1','Resources',v7,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','7.2','Competence',v7,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','7.3','Awareness',v7,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.4') THEN
    SET v74 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v74,'ISO_14001','7.4','Communication',v7,2,1,NOW(),NOW());
  ELSE SELECT id INTO v74 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.4'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.4.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','7.4.1','General',v74,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.4.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','7.4.2','Internal communication',v74,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.4.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','7.4.3','External communication',v74,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.5') THEN
    SET v72 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v72,'ISO_14001','7.5','Documented information',v7,2,1,NOW(),NOW());
  ELSE SELECT id INTO v72 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.5.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','7.5.1','General',v72,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.5.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','7.5.2','Creating and updating',v72,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='7.5.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','7.5.3','Control of documented information',v72,3,1,NOW(),NOW()); END IF;

  -- Clause 8
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='8') THEN
    SET v8 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v8,'ISO_14001','8','Operation',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v8 FROM ImsClause WHERE standard='ISO_14001' AND clause='8'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='8.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','8.1','Operational planning and control',v8,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='8.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','8.2','Emergency preparedness and response',v8,2,1,NOW(),NOW()); END IF;

  -- Clause 9
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='9') THEN
    SET v9 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v9,'ISO_14001','9','Performance evaluation',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v9 FROM ImsClause WHERE standard='ISO_14001' AND clause='9'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='9.1') THEN
    SET v91 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v91,'ISO_14001','9.1','Monitoring, measurement, analysis and evaluation',v9,2,1,NOW(),NOW());
  ELSE SELECT id INTO v91 FROM ImsClause WHERE standard='ISO_14001' AND clause='9.1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='9.1.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','9.1.1','General',v91,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='9.1.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','9.1.2','Evaluation of compliance',v91,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='9.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','9.2','Internal audit',v9,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='9.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','9.3','Management review',v9,2,1,NOW(),NOW()); END IF;

  -- Clause 10
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='10') THEN
    SET v10 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v10,'ISO_14001','10','Improvement',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v10 FROM ImsClause WHERE standard='ISO_14001' AND clause='10'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='10.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','10.1','General',v10,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='10.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','10.2','Nonconformity and corrective action',v10,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_14001' AND clause='10.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_14001','10.3','Continual improvement',v10,2,1,NOW(),NOW()); END IF;

END$$
DELIMITER ;
CALL seed_iso14001_clauses();
DROP PROCEDURE IF EXISTS seed_iso14001_clauses;

-- =============================================================================
-- Section 2c: ISO 45001:2018 Clauses
-- =============================================================================
DROP PROCEDURE IF EXISTS seed_iso45001_clauses;
DELIMITER $$
CREATE PROCEDURE seed_iso45001_clauses()
BEGIN
  DECLARE v4 VARCHAR(36) DEFAULT NULL;
  DECLARE v5 VARCHAR(36) DEFAULT NULL;
  DECLARE v51 VARCHAR(36) DEFAULT NULL;
  DECLARE v52 VARCHAR(36) DEFAULT NULL;
  DECLARE v6 VARCHAR(36) DEFAULT NULL;
  DECLARE v61 VARCHAR(36) DEFAULT NULL;
  DECLARE v62 VARCHAR(36) DEFAULT NULL;
  DECLARE v7 VARCHAR(36) DEFAULT NULL;
  DECLARE v74 VARCHAR(36) DEFAULT NULL;
  DECLARE v75 VARCHAR(36) DEFAULT NULL;
  DECLARE v8 VARCHAR(36) DEFAULT NULL;
  DECLARE v81 VARCHAR(36) DEFAULT NULL;
  DECLARE v82 VARCHAR(36) DEFAULT NULL;
  DECLARE v83 VARCHAR(36) DEFAULT NULL;
  DECLARE v9 VARCHAR(36) DEFAULT NULL;
  DECLARE v91 VARCHAR(36) DEFAULT NULL;
  DECLARE v92 VARCHAR(36) DEFAULT NULL;
  DECLARE v93 VARCHAR(36) DEFAULT NULL;
  DECLARE v10 VARCHAR(36) DEFAULT NULL;
  DECLARE v102 VARCHAR(36) DEFAULT NULL;

  -- Clause 4
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='4') THEN
    SET v4 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v4,'ISO_45001','4','Context of the organisation',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v4 FROM ImsClause WHERE standard='ISO_45001' AND clause='4'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='4.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','4.1','Understanding the organisation and its context',v4,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='4.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','4.2','Understanding needs and expectations of workers and other interested parties',v4,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='4.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','4.3','Determining the scope of the OH&S MS',v4,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='4.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','4.4','OH&S management system',v4,2,1,NOW(),NOW()); END IF;

  -- Clause 5
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='5') THEN
    SET v5 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v5,'ISO_45001','5','Leadership and worker participation',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v5 FROM ImsClause WHERE standard='ISO_45001' AND clause='5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='5.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','5.1','Leadership and commitment',v5,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='5.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','5.2','OH&S policy',v5,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='5.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','5.3','Organisational roles, responsibilities and authorities',v5,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='5.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','5.4','Consultation and participation of workers',v5,2,1,NOW(),NOW()); END IF;

  -- Clause 6
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='6') THEN
    SET v6 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v6,'ISO_45001','6','Planning',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v6 FROM ImsClause WHERE standard='ISO_45001' AND clause='6'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.1') THEN
    SET v61 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v61,'ISO_45001','6.1','Actions to address risks and opportunities',v6,2,1,NOW(),NOW());
  ELSE SELECT id INTO v61 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.1.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','6.1.1','General',v61,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.1.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','6.1.2','Hazard identification and assessment of risks and opportunities',v61,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.1.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','6.1.3','Determination of legal and other requirements',v61,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.1.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','6.1.4','Planning action',v61,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.2') THEN
    SET v62 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v62,'ISO_45001','6.2','OH&S objectives and planning to achieve them',v6,2,1,NOW(),NOW());
  ELSE SELECT id INTO v62 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.2.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','6.2.1','Establish OH&S objectives',v62,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='6.2.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','6.2.2','Planning actions to achieve objectives',v62,3,1,NOW(),NOW()); END IF;

  -- Clause 7
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7') THEN
    SET v74 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v74,'ISO_45001','7','Support',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v74 FROM ImsClause WHERE standard='ISO_45001' AND clause='7'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','7.1','Resources',v74,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','7.2','Competence',v74,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','7.3','Awareness',v74,2,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.4') THEN
    SET v75 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v75,'ISO_45001','7.4','Communication',v74,2,1,NOW(),NOW());
  ELSE SELECT id INTO v75 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.4'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.4.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','7.4.1','General',v75,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.4.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','7.4.2','Internal communication',v75,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.4.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','7.4.3','External communication',v75,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.5') THEN
    SET v7 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v7,'ISO_45001','7.5','Documented information',v74,2,1,NOW(),NOW());
  ELSE SELECT id INTO v7 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.5.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','7.5.1','General',v7,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.5.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','7.5.2','Creating and updating',v7,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='7.5.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','7.5.3','Control of documented information',v7,3,1,NOW(),NOW()); END IF;

  -- Clause 8
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='8') THEN
    SET v8 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v8,'ISO_45001','8','Operation',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v8 FROM ImsClause WHERE standard='ISO_45001' AND clause='8'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='8.1') THEN
    SET v81 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v81,'ISO_45001','8.1','Operational planning and control',v8,2,1,NOW(),NOW());
  ELSE SELECT id INTO v81 FROM ImsClause WHERE standard='ISO_45001' AND clause='8.1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='8.1.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','8.1.1','General',v81,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='8.1.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','8.1.2','Eliminating hazards and reducing OH&S risks',v81,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='8.1.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','8.1.3','Management of change',v81,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='8.1.4') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','8.1.4','Procurement',v81,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='8.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','8.2','Emergency preparedness and response',v8,2,1,NOW(),NOW()); END IF;

  -- Clause 9
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='9') THEN
    SET v9 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v9,'ISO_45001','9','Performance evaluation',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v9 FROM ImsClause WHERE standard='ISO_45001' AND clause='9'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='9.1') THEN
    SET v91 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v91,'ISO_45001','9.1','Monitoring, measurement, analysis and performance evaluation',v9,2,1,NOW(),NOW());
  ELSE SELECT id INTO v91 FROM ImsClause WHERE standard='ISO_45001' AND clause='9.1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='9.1.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','9.1.1','General',v91,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='9.1.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','9.1.2','Evaluation of compliance',v91,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='9.2') THEN
    SET v92 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v92,'ISO_45001','9.2','Internal audit',v9,2,1,NOW(),NOW());
  ELSE SELECT id INTO v92 FROM ImsClause WHERE standard='ISO_45001' AND clause='9.2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='9.2.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','9.2.1','General',v92,3,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='9.2.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','9.2.2','Internal audit programme',v92,3,1,NOW(),NOW()); END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='9.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','9.3','Management review',v9,2,1,NOW(),NOW()); END IF;

  -- Clause 10
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='10') THEN
    SET v10 = UUID();
    INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (v10,'ISO_45001','10','Improvement',NULL,1,1,NOW(),NOW());
  ELSE SELECT id INTO v10 FROM ImsClause WHERE standard='ISO_45001' AND clause='10'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='10.1') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','10.1','General',v10,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='10.2') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','10.2','Incident, nonconformity and corrective action',v10,2,1,NOW(),NOW()); END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsClause WHERE standard='ISO_45001' AND clause='10.3') THEN INSERT INTO ImsClause (id,standard,clause,title,parentId,level,isActive,createdAt,updatedAt) VALUES (UUID(),'ISO_45001','10.3','Continual improvement',v10,2,1,NOW(),NOW()); END IF;

END$$
DELIMITER ;
CALL seed_iso45001_clauses();
DROP PROCEDURE IF EXISTS seed_iso45001_clauses;

-- =============================================================================
-- Section 3: Workflow Definitions
-- =============================================================================
DROP PROCEDURE IF EXISTS seed_ims_workflows;
DELIMITER $$
CREATE PROCEDURE seed_ims_workflows()
BEGIN
  DECLARE wf1 VARCHAR(36) DEFAULT NULL;
  DECLARE wf2 VARCHAR(36) DEFAULT NULL;
  DECLARE st1 VARCHAR(36) DEFAULT NULL;
  DECLARE st2 VARCHAR(36) DEFAULT NULL;
  DECLARE st3 VARCHAR(36) DEFAULT NULL;

  -- IMS_REVISION_APPROVAL workflow (3-step: DC → Manager → CEO)
  IF NOT EXISTS (SELECT 1 FROM WorkflowDefinition WHERE `key`='IMS_REVISION_APPROVAL') THEN
    SET wf1 = UUID();
    INSERT INTO WorkflowDefinition (id,`key`,name,description,entityType,version,isActive,createdAt,updatedAt)
    VALUES (wf1,'IMS_REVISION_APPROVAL','IMS Document Revision Approval',
      'Approval workflow for IMS document revisions — Document Controller → Manager → CEO',
      'ImsRevision',1,1,NOW(),NOW());

    SET st1 = UUID();
    INSERT INTO WorkflowStep (id,definitionId,sequence,name,approverResolver,minApprovals,slaHours,onRejectBehavior,createdAt,updatedAt)
    VALUES (st1,wf1,1,'Document Controller Review','{"type":"MANAGER_OF_INITIATOR"}',1,72,'TERMINATE',NOW(),NOW());

    SET st2 = UUID();
    INSERT INTO WorkflowStep (id,definitionId,sequence,name,approverResolver,minApprovals,slaHours,onRejectBehavior,createdAt,updatedAt)
    VALUES (st2,wf1,2,'Manager Approval','{"type":"MANAGER_OF_INITIATOR"}',1,72,'TERMINATE',NOW(),NOW());

    SET st3 = UUID();
    INSERT INTO WorkflowStep (id,definitionId,sequence,name,approverResolver,minApprovals,slaHours,onRejectBehavior,createdAt,updatedAt)
    VALUES (st3,wf1,3,'CEO Sign-off','{"type":"MANAGER_OF_INITIATOR"}',1,72,'TERMINATE',NOW(),NOW());
  END IF;

  -- IMS_CHANGE_REQUEST workflow (2-step: DC → Manager)
  IF NOT EXISTS (SELECT 1 FROM WorkflowDefinition WHERE `key`='IMS_CHANGE_REQUEST') THEN
    SET wf2 = UUID();
    INSERT INTO WorkflowDefinition (id,`key`,name,description,entityType,version,isActive,createdAt,updatedAt)
    VALUES (wf2,'IMS_CHANGE_REQUEST','IMS Document Change Request',
      'Review and approval workflow for IMS document change requests (DCR)',
      'ImsChangeRequest',1,1,NOW(),NOW());

    SET st1 = UUID();
    INSERT INTO WorkflowStep (id,definitionId,sequence,name,approverResolver,minApprovals,slaHours,onRejectBehavior,createdAt,updatedAt)
    VALUES (st1,wf2,1,'Document Controller Review','{"type":"MANAGER_OF_INITIATOR"}',1,72,'TERMINATE',NOW(),NOW());

    SET st2 = UUID();
    INSERT INTO WorkflowStep (id,definitionId,sequence,name,approverResolver,minApprovals,slaHours,onRejectBehavior,createdAt,updatedAt)
    VALUES (st2,wf2,2,'Manager Approval','{"type":"MANAGER_OF_INITIATOR"}',1,72,'TERMINATE',NOW(),NOW());
  END IF;
END$$
DELIMITER ;
CALL seed_ims_workflows();
DROP PROCEDURE IF EXISTS seed_ims_workflows;
