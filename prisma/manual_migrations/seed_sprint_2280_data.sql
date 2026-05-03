-- Sprint 22.8.0 Demo Seed Data
-- IMS Audit Plans (FRM-006/007/009), NCR Findings (FRM-008),
-- Management Reviews (FRM-011/012), Company Objectives (FRM-013)
-- All inserts are idempotent (IF NOT EXISTS guards on unique keys)

SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci';

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Audit Plans FRM-006 / FRM-007 / FRM-009
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_audit_plans_2280;
DELIMITER $$
CREATE PROCEDURE seed_audit_plans_2280()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ImsAuditPlan WHERE (planNumber COLLATE utf8mb4_0900_ai_ci) = 'AP-25-001') THEN
    INSERT INTO ImsAuditPlan (id, planNumber, year, auditType, status, updatedAt)
    VALUES (UUID(), 'AP-25-001', 2025, 'Internal', 'COMPLETED', NOW());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsAuditPlan WHERE (planNumber COLLATE utf8mb4_0900_ai_ci) = 'AP-25-002') THEN
    INSERT INTO ImsAuditPlan (id, planNumber, year, auditType, status, updatedAt)
    VALUES (UUID(), 'AP-25-002', 2025, 'Surveillance', 'COMPLETED', NOW());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ImsAuditPlan WHERE (planNumber COLLATE utf8mb4_0900_ai_ci) = 'AP-26-001') THEN
    INSERT INTO ImsAuditPlan (id, planNumber, year, auditType, status, updatedAt)
    VALUES (UUID(), 'AP-26-001', 2026, 'Internal', 'IN_PROGRESS', NOW());
  END IF;
END$$
DELIMITER ;
CALL seed_audit_plans_2280();
DROP PROCEDURE IF EXISTS seed_audit_plans_2280;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Audits + Findings (FRM-008 NCR Reports)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_audits_and_findings_2280;
DELIMITER $$
CREATE PROCEDURE seed_audits_and_findings_2280()
BEGIN
  DECLARE v_plan1 CHAR(36);
  DECLARE v_plan2 CHAR(36);
  DECLARE v_plan3 CHAR(36);
  DECLARE v_audit1 CHAR(36);
  DECLARE v_audit2 CHAR(36);
  DECLARE v_audit3 CHAR(36);
  DECLARE v_audit4 CHAR(36);

  SELECT id INTO v_plan1 FROM ImsAuditPlan WHERE (planNumber COLLATE utf8mb4_0900_ai_ci) = 'AP-25-001' LIMIT 1;
  SELECT id INTO v_plan2 FROM ImsAuditPlan WHERE (planNumber COLLATE utf8mb4_0900_ai_ci) = 'AP-25-002' LIMIT 1;
  SELECT id INTO v_plan3 FROM ImsAuditPlan WHERE (planNumber COLLATE utf8mb4_0900_ai_ci) = 'AP-26-001' LIMIT 1;

  -- Audits for AP-25-001
  IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE (auditNumber COLLATE utf8mb4_0900_ai_ci) = 'AUD-25-001') AND v_plan1 IS NOT NULL THEN
    SET v_audit1 = UUID();
    INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, actualDate, status, summary, updatedAt)
    VALUES (v_audit1, v_plan1, 'AUD-25-001',
      'Production & Fabrication (§8.5)',
      JSON_ARRAY('8.5.1', '8.5.2', '8.5.6'),
      '2025-03-10', '2025-03-12', 'COMPLETED',
      'Annual internal audit of fabrication processes. Overall conformance satisfactory.', NOW());

    -- NCR Finding (FRM-008)
    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE (findingNumber COLLATE utf8mb4_0900_ai_ci) = 'NCR-25-001') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, correctiveAction, status, targetDate, closedAt, closureEvidence, updatedAt)
      VALUES (UUID(), v_audit1, 'NCR-25-001', 'NC', '8.5.1',
        'Weld inspection records for I-beam WB-215 were not updated after final VT inspection. ITP sign-off sheet missing for 3 members.',
        'Review of ITP records for project 277, items WB-213 through WB-215.',
        'Update all ITP inspection sheets for the identified members. Implement mandatory checklist review before release sign-off.',
        'CLOSED', '2025-04-10', '2025-03-29',
        'Updated ITP sheets provided and reviewed. Sign-off procedure updated.',
        NOW());
    END IF;

    -- OFI Finding
    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE (findingNumber COLLATE utf8mb4_0900_ai_ci) = 'OFI-25-001') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, status, targetDate, closedAt, updatedAt)
      VALUES (UUID(), v_audit1, 'OFI-25-001', 'OFI', '8.5.1',
        'Opportunity to reduce fabrication re-work by implementing visual control boards on the production floor to track ITP hold points.',
        'CLOSED', '2025-05-01', '2025-04-20', NOW());
    END IF;
  END IF;

  -- Audit 2 for AP-25-001
  IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE (auditNumber COLLATE utf8mb4_0900_ai_ci) = 'AUD-25-002') AND v_plan1 IS NOT NULL THEN
    SET v_audit2 = UUID();
    INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, actualDate, status, summary, updatedAt)
    VALUES (v_audit2, v_plan1, 'AUD-25-002',
      'Quality Control & Inspection (§9.2)',
      JSON_ARRAY('9.2', '9.1.1', '8.6'),
      '2025-04-15', '2025-04-16', 'COMPLETED',
      'QC processes audit. NCR closure process adequate. Minor gap in dimensional inspection documentation.', NOW());

    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE (findingNumber COLLATE utf8mb4_0900_ai_ci) = 'NCR-25-002') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, correctiveAction, status, targetDate, closedAt, updatedAt)
      VALUES (UUID(), v_audit2, 'NCR-25-002', 'NC', '9.1.1',
        'DFT coating inspection records for Project 257 show readings taken but average calculation not documented per SSPC-PA-2 requirements.',
        'Coating inspection forms COAT-2025-014 through COAT-2025-019 reviewed.',
        'Update coating inspection form template to include automatic average DFT calculation field. Train coating inspectors on revised form.',
        'CLOSED', '2025-05-15', '2025-05-02', NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE (findingNumber COLLATE utf8mb4_0900_ai_ci) = 'OBS-25-001') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, status, targetDate, updatedAt)
      VALUES (UUID(), v_audit2, 'OBS-25-001', 'Observation', '8.6',
        'Release note process is effective. Recommend adding digital signature capability to streamline approval workflow.',
        'OPEN', '2025-08-01', NOW());
    END IF;
  END IF;

  -- Audit for AP-25-002 (Surveillance)
  IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE (auditNumber COLLATE utf8mb4_0900_ai_ci) = 'AUD-25-003') AND v_plan2 IS NOT NULL THEN
    SET v_audit3 = UUID();
    INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, actualDate, status, summary, updatedAt)
    VALUES (v_audit3, v_plan2, 'AUD-25-003',
      'IMS System — ISO 9001/14001/45001 Combined Surveillance',
      JSON_ARRAY('4.1', '4.2', '5.1', '6.1', '6.2', '9.3'),
      '2025-09-22', '2025-09-23', 'COMPLETED',
      'Third-party surveillance audit by TUV Rheinland. Certification maintained. Two NCRs raised.', NOW());

    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE (findingNumber COLLATE utf8mb4_0900_ai_ci) = 'NCR-25-003') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, correctiveAction, status, targetDate, closedAt, closureEvidence, updatedAt)
      VALUES (UUID(), v_audit3, 'NCR-25-003', 'NC', '6.2.1',
        'Quality objectives for Q3 2025 have not been formally communicated to all relevant departments. Production team unable to confirm awareness of current objectives.',
        'Interviews with Production Supervisor and three line operators.',
        'Issue formal objectives awareness communication to all departments. Confirm receipt via signed acknowledgement.',
        'CLOSED', '2025-10-22', '2025-10-15',
        'Communication records and signed acknowledgements provided to TUV Rheinland.', NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE (findingNumber COLLATE utf8mb4_0900_ai_ci) = 'NCR-25-004') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, correctiveAction, status, targetDate, closedAt, updatedAt)
      VALUES (UUID(), v_audit3, 'NCR-25-004', 'NC', '9.3',
        'Management review for H1 2025 was conducted but minutes were not formally distributed to all top management attendees within the required 7-day window.',
        'MOM distribution records reviewed; gap of 14 days identified.',
        'Update management review procedure to enforce 7-day distribution requirement. Set system reminder in OTS.',
        'CLOSED', '2025-10-30', '2025-10-22', NOW());
    END IF;
  END IF;

  -- Audit for AP-26-001 (In Progress)
  IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE (auditNumber COLLATE utf8mb4_0900_ai_ci) = 'AUD-26-001') AND v_plan3 IS NOT NULL THEN
    SET v_audit4 = UUID();
    INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, actualDate, status, summary, updatedAt)
    VALUES (v_audit4, v_plan3, 'AUD-26-001',
      'Supply Chain & Procurement (§8.4)',
      JSON_ARRAY('8.4', '8.4.1', '8.4.2'),
      '2026-02-17', '2026-02-18', 'COMPLETED',
      'Supplier evaluation and procurement controls audit. Approved supplier register up to date.', NOW());

    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE (findingNumber COLLATE utf8mb4_0900_ai_ci) = 'NCR-26-001') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, correctiveAction, status, targetDate, updatedAt)
      VALUES (UUID(), v_audit4, 'NCR-26-001', 'NC', '8.4.1',
        'SUP-010 approval has expired since 01-Jan-2025 but continues to be used for abrasive consumable supply without documented conditional approval.',
        'Approved supplier register reviewed. Purchase records for abrasives Jan-Feb 2026.',
        'Immediately obtain updated ISO 9001 certificate from SUP-010 or suspend use. Update approved supplier register with expiry date alert.',
        'IN_PROGRESS', '2026-03-17', NOW());
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE (auditNumber COLLATE utf8mb4_0900_ai_ci) = 'AUD-26-002') AND v_plan3 IS NOT NULL THEN
    INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, status, updatedAt)
    VALUES (UUID(), v_plan3, 'AUD-26-002', 'HR & Competence Management (§7.2, §7.3)',
      JSON_ARRAY('7.2', '7.3'), '2026-04-10', 'SCHEDULED', NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE (auditNumber COLLATE utf8mb4_0900_ai_ci) = 'AUD-26-003') AND v_plan3 IS NOT NULL THEN
    INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, status, updatedAt)
    VALUES (UUID(), v_plan3, 'AUD-26-003', 'Design & Engineering (§8.3)',
      JSON_ARRAY('8.3', '8.3.3', '8.3.4', '8.3.6'), '2026-05-20', 'SCHEDULED', NOW());
  END IF;
END$$
DELIMITER ;
CALL seed_audits_and_findings_2280();
DROP PROCEDURE IF EXISTS seed_audits_and_findings_2280;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Management Reviews FRM-011 / FRM-012
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_management_reviews_2280;
DELIMITER $$
CREATE PROCEDURE seed_management_reviews_2280()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ImsManagementReview WHERE (reviewNumber COLLATE utf8mb4_0900_ai_ci) = 'MR-25-001') THEN
    INSERT INTO ImsManagementReview (
      id, reviewNumber, reviewDate, chairperson, period, status, approvedAt,
      attendees, inputAuditResults, inputNcrSummary, inputKpiStatus,
      inputSupplierPerf, inputResourceStatus, inputCustomerFeedback,
      outputDecisions, outputObjectives, outputResourceNeeds, notes, updatedAt
    ) VALUES (
      UUID(), 'MR-25-001', '2025-07-10', 'CEO', 'H1 2025 (Jan–Jun 2025)', 'APPROVED', '2025-07-10',
      JSON_ARRAY(
        JSON_OBJECT('name','Abdullah Al-Harbi','role','CEO (Chairperson)','present',true),
        JSON_OBJECT('name','Khalid Al-Dossari','role','IMS Manager / QMR','present',true),
        JSON_OBJECT('name','Ahmed Al-Rashidi','role','QC Manager','present',true),
        JSON_OBJECT('name','Faisal Al-Ghamdi','role','Production Manager','present',true),
        JSON_OBJECT('name','Saleh Al-Mutairi','role','Supply Chain Manager','present',true)
      ),
      JSON_OBJECT('openFindings',2,'closedFindings',8,'note','Internal audits AUD-25-001 and AUD-25-002 completed. All major NCRs closed within target dates.'),
      JSON_OBJECT('total',4,'open',1,'closed',3,'overdue',0,'note','NCR closure rate 75%.'),
      JSON_OBJECT('onTrack',8,'atRisk',2,'behind',1,'note','Drawing accuracy rate at 96.8% (target >=98%). Corrective action in progress.'),
      JSON_QUOTE('All Tier-1 suppliers (SUP-001 to SUP-007) maintained A rating. SUP-010 approval expired — renewal in progress.'),
      JSON_QUOTE('Workshop capacity at 85%. Additional CNC operator hired Q2.'),
      JSON_QUOTE('Client satisfaction score: 4.2/5.0 (target >=4.0). Delivery on-time rate: 91% (target >=93%).'),
      JSON_ARRAY(
        JSON_OBJECT('decision','Increase ITP training for inspectors','responsible','QC Manager','targetDate','2025-09-30','status','IN_PROGRESS'),
        JSON_OBJECT('decision','Complete SUP-010 re-approval or identify alternative abrasive supplier','responsible','Supply Chain Manager','targetDate','2025-08-31','status','CLOSED'),
        JSON_OBJECT('decision','Initiate SASO certification process','responsible','Chief Engineer','targetDate','2025-12-31','status','IN_PROGRESS')
      ),
      JSON_QUOTE('Maintain ISO certification through H2 2025 surveillance audit. Achieve delivery on-time rate >=93% by Q3 2025.'),
      JSON_QUOTE('Additional QC inspector hire approved for Q3 2025. Coating gauge calibration budget approved (SAR 8,500).'),
      'Next management review scheduled for January 2026 to cover H2 2025 performance.',
      NOW()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ImsManagementReview WHERE (reviewNumber COLLATE utf8mb4_0900_ai_ci) = 'MR-26-001') THEN
    INSERT INTO ImsManagementReview (
      id, reviewNumber, reviewDate, chairperson, period, status, approvedAt,
      attendees, inputAuditResults, inputNcrSummary, inputKpiStatus,
      inputSupplierPerf, inputResourceStatus, inputCustomerFeedback,
      outputDecisions, outputObjectives, outputResourceNeeds, notes, updatedAt
    ) VALUES (
      UUID(), 'MR-26-001', '2026-01-15', 'CEO', 'H2 2025 (Jul–Dec 2025)', 'APPROVED', '2026-01-15',
      JSON_ARRAY(
        JSON_OBJECT('name','Abdullah Al-Harbi','role','CEO (Chairperson)','present',true),
        JSON_OBJECT('name','Khalid Al-Dossari','role','IMS Manager / QMR','present',true),
        JSON_OBJECT('name','Ahmed Al-Rashidi','role','QC Manager','present',true),
        JSON_OBJECT('name','Faisal Al-Ghamdi','role','Production Manager','present',true),
        JSON_OBJECT('name','Saleh Al-Mutairi','role','Supply Chain Manager','present',true),
        JSON_OBJECT('name','Nasser Al-Shahrani','role','HR Manager','present',true)
      ),
      JSON_OBJECT('openFindings',4,'closedFindings',12,'note','Surveillance audit by TUV Rheinland completed September 2025. Two NCRs raised and closed within 30 days. Certification maintained.'),
      JSON_OBJECT('total',6,'open',2,'closed',4,'overdue',0,'note','Excellent NCR closure performance in H2. Average closure time: 18 days.'),
      JSON_OBJECT('onTrack',9,'atRisk',1,'behind',0,'note','All KPIs within target except delivery on-time rate (92% vs 93% target).'),
      JSON_QUOTE('All Tier-1 suppliers maintaining A rating. SUP-010 re-approved November 2025. SUP-008 upgraded to full Approved status.'),
      JSON_QUOTE('Workshop capacity stable at 87%. New QC inspector onboarded September 2025.'),
      JSON_QUOTE('Client satisfaction improved to 4.4/5.0. Zero formal complaints in H2 2025.'),
      JSON_ARRAY(
        JSON_OBJECT('decision','Finalize SASO certification process and prepare for site inspection','responsible','Chief Engineer','targetDate','2026-06-30','status','IN_PROGRESS'),
        JSON_OBJECT('decision','Launch 2026 internal audit programme','responsible','IMS Manager','targetDate','2026-02-01','status','CLOSED'),
        JSON_OBJECT('decision','Introduce digital ITP sign-off to eliminate paper-based inspection records','responsible','QC Manager','targetDate','2026-04-30','status','IN_PROGRESS')
      ),
      JSON_QUOTE('Achieve ISO 9001/14001/45001 full re-certification in 2027 cycle. Target delivery on-time rate >=95% by Q4 2026.'),
      JSON_QUOTE('Digital ITP system implementation budget approved: SAR 45,000. Additional IT infrastructure: SAR 12,000.'),
      'Next review: July 2026 for H1 2026.',
      NOW()
    );
  END IF;
END$$
DELIMITER ;
CALL seed_management_reviews_2280();
DROP PROCEDURE IF EXISTS seed_management_reviews_2280;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Company Objectives FRM-013
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_objectives_2280;
DELIMITER $$
CREATE PROCEDURE seed_objectives_2280()
BEGIN
  DECLARE v_owner CHAR(36);
  DECLARE v_obj1 CHAR(36);
  DECLARE v_obj2 CHAR(36);
  DECLARE v_obj3 CHAR(36);
  DECLARE v_obj4 CHAR(36);
  DECLARE v_obj5 CHAR(36);

  SELECT id INTO v_owner FROM User LIMIT 1;

  IF v_owner IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM company_objectives WHERE title = 'Achieve ≥95% On-Time Delivery Rate' AND year = 2026) THEN
      SET v_obj1 = UUID();
      INSERT INTO company_objectives (id, year, title, description, category, ownerId, priority, status, progress, updatedAt)
      VALUES (v_obj1, 2026, 'Achieve ≥95% On-Time Delivery Rate',
        'Improve logistics and dispatch scheduling to reach 95% on-time delivery for all projects.',
        'Customer', v_owner, 'High', 'On Track', 68, NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj1, 'On-time delivery rate (all projects)', 95, 92, '%', 'Numeric', 'On Track', NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj1, 'Average days late per shipment', 0, 0.4, 'days', 'Numeric', 'On Track', NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM company_objectives WHERE title = 'Reduce NCR Rate to < 1% of Fabricated Tonnage' AND year = 2026) THEN
      SET v_obj2 = UUID();
      INSERT INTO company_objectives (id, year, title, description, category, ownerId, priority, status, progress, updatedAt)
      VALUES (v_obj2, 2026, 'Reduce NCR Rate to < 1% of Fabricated Tonnage',
        'Drive down non-conformances through improved ITP compliance and first-pass inspection rates.',
        'Internal Process', v_owner, 'High', 'On Track', 72, NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj2, 'NCR rate (% of fabricated tonnage)', 1, 1.3, '%', 'Numeric', 'At Risk', NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj2, 'First-pass inspection rate', 95, 94, '%', 'Numeric', 'On Track', NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj2, 'Average NCR closure time', 14, 18, 'days', 'Numeric', 'At Risk', NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM company_objectives WHERE title = 'Maintain 100% ISO Certification Compliance' AND year = 2026) THEN
      SET v_obj3 = UUID();
      INSERT INTO company_objectives (id, year, title, description, category, ownerId, priority, status, progress, updatedAt)
      VALUES (v_obj3, 2026, 'Maintain 100% ISO Certification Compliance',
        'Sustain ISO 9001, 14001, and 45001 certification with zero major NCRs in external audits.',
        'Internal Process', v_owner, 'Critical', 'On Track', 85, NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj3, 'External audit major NCRs', 0, 0, 'count', 'Numeric', 'On Track', NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj3, 'Internal audit completion rate', 100, 83, '%', 'Numeric', 'On Track', NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj3, 'CAPA closure rate (within target date)', 95, 91, '%', 'Numeric', 'On Track', NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM company_objectives WHERE title = 'Complete SASO Structural Steel Certification' AND year = 2026) THEN
      SET v_obj4 = UUID();
      INSERT INTO company_objectives (id, year, title, description, category, ownerId, priority, status, progress, updatedAt)
      VALUES (v_obj4, 2026, 'Complete SASO Structural Steel Certification',
        'Obtain SASO product certification for structural steel members to enable new municipal project bids.',
        'Customer', v_owner, 'High', 'On Track', 35, NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj4, 'SASO application submitted', 1, 1, 'milestone', 'Boolean', 'Completed', NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj4, 'SASO site inspection passed', 1, 0, 'milestone', 'Boolean', 'Not Started', NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM company_objectives WHERE title = 'Achieve Zero Lost-Time Injuries (LTI)' AND year = 2026) THEN
      SET v_obj5 = UUID();
      INSERT INTO company_objectives (id, year, title, description, category, ownerId, priority, status, progress, updatedAt)
      VALUES (v_obj5, 2026, 'Achieve Zero Lost-Time Injuries (LTI)',
        'Maintain a safe working environment with zero lost-time injuries across all production areas.',
        'Internal Process', v_owner, 'Critical', 'On Track', 90, NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj5, 'Lost-Time Injuries (LTI)', 0, 0, 'incidents', 'Numeric', 'On Track', NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj5, 'Near-miss reports submitted', 12, 7, 'count', 'Numeric', 'On Track', NOW());
      INSERT INTO key_results (id, objectiveId, title, targetValue, currentValue, unit, measurementType, status, updatedAt)
      VALUES (UUID(), v_obj5, 'Toolbox talks conducted', 4, 2, 'sessions', 'Numeric', 'On Track', NOW());
    END IF;
  END IF;
END$$
DELIMITER ;
CALL seed_objectives_2280();
DROP PROCEDURE IF EXISTS seed_objectives_2280;
