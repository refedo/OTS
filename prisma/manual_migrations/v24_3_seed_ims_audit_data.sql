-- ============================================================
-- v24.3.0 — IMS Seed: Checklist Library, 2026 Audit Data,
--            OFI Register, CAR Records, Calibration Assets
-- Forms: HEXA-FRM-024 (OFI), HEXA-FRM-025 (CAR),
--        HEXA-FRM-026 (Checklist Library), HEXA-REC-026 (Audit Programme)
-- Calibration: ISO 9001:2015 §7.1.5
-- Facility: Hexa Steel® — ~3,000 t/year structural steel fabrication
-- Period covered: Jan 2026 – May 2026
-- All inserts are idempotent (IF NOT EXISTS guards)
-- ============================================================

SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci';

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. HEXA-FRM-026 — Audit Checklist Library (master question bank)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_checklist_library_v243;
DELIMITER $$
CREATE PROCEDURE seed_checklist_library_v243()
BEGIN
  -- Guard: only run if library appears empty (seed marker absent)
  IF NOT EXISTS (
    SELECT 1 FROM ImsChecklistQuestion
    WHERE questionText LIKE 'Are structural steel shop drawings reviewed and approved%'
  ) THEN

    -- ── Engineering (Design & Detailing) ──────────────────────────────────────
    INSERT INTO ImsChecklistQuestion (id, questionText, processArea, isoClause, evidenceType, riskLevel, isActive, createdAt, updatedAt) VALUES
    (UUID(), 'Are structural steel shop drawings reviewed and approved by a qualified engineer before issue to production?', 'Engineering', 'ISO 9001:2015 §8.3.3', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Is the drawing revision control system maintained and all superseded revisions clearly marked?', 'Engineering', 'ISO 9001:2015 §7.5.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are connection design calculations documented, peer-reviewed, and filed for each project?', 'Engineering', 'ISO 9001:2015 §8.3.3', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are material specifications on drawings compliant with applicable standards (ASTM, EN, SASO)?', 'Engineering', 'ISO 9001:2015 §8.4.3', 'Document', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are weld symbols, weld sizes, and joint details complete and legible on all shop drawings?', 'Engineering', 'ISO 9001:2015 §8.5.1', 'Observation', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are shop drawing submission logs maintained and client/EOR approval status tracked per project?', 'Engineering', 'ISO 9001:2015 §8.5', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are design change controls (DCRs) documented, reviewed, and communicated to production before fabrication?', 'Engineering', 'ISO 9001:2015 §8.3.6', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Is the CAD file naming convention and layer standard consistently applied across all active projects?', 'Engineering', 'ISO 9001:2015 §7.5.2', 'Observation', 'Low', 1, NOW(), NOW()),
    (UUID(), 'Are material take-off quantities validated against the approved BOM before procurement?', 'Engineering', 'ISO 9001:2015 §8.4.3', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are as-built drawing updates completed and issued within the required timeframe after installation?', 'Engineering', 'ISO 9001:2015 §7.5', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are applicable design standards and load codes referenced on all structural drawings?', 'Engineering', 'ISO 9001:2015 §8.3.2', 'Document', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Is a drawing register maintained and updated to reflect the current issued revision for all drawings?', 'Engineering', 'ISO 9001:2015 §7.5.3', 'Record', 'High', 1, NOW(), NOW());

    -- ── Supply Chain ──────────────────────────────────────────────────────────
    INSERT INTO ImsChecklistQuestion (id, questionText, processArea, isoClause, evidenceType, riskLevel, isActive, createdAt, updatedAt) VALUES
    (UUID(), 'Is the approved supplier register maintained, current, and reviewed at least annually?', 'Supply Chain', 'ISO 9001:2015 §8.4.1', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are purchase orders raised with complete technical specifications, applicable standards, and acceptance criteria?', 'Supply Chain', 'ISO 9001:2015 §8.4.3', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are incoming material inspection reports (mill test certificates, dimensional checks) completed before goods acceptance?', 'Supply Chain', 'ISO 9001:2015 §8.4.3', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are mill certificates verified against purchase order specifications (grade, heat number, mechanical properties)?', 'Supply Chain', 'ISO 9001:2015 §8.4.3', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are non-conforming materials tagged, quarantined, and reported on an NCR within 24 hours of identification?', 'Supply Chain', 'ISO 9001:2015 §8.7', 'Observation', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are supplier performance evaluations conducted and documented at least annually based on quality, delivery, and service?', 'Supply Chain', 'ISO 9001:2015 §8.4.1', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Is there a process to identify and manage critical materials to prevent receipt of counterfeit or sub-standard product?', 'Supply Chain', 'ISO 9001:2015 §8.4.1', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are goods receipt notes matched to purchase orders before materials are released to the warehouse?', 'Supply Chain', 'ISO 9001:2015 §8.4.3', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Is stock accuracy maintained through regular cycle counts and documented in the inventory system?', 'Supply Chain', 'ISO 9001:2015 §8.1', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are procurement records (POs, GRNs, certificates) retained in accordance with the document retention schedule?', 'Supply Chain', 'ISO 9001:2015 §7.5.3', 'Record', 'Low', 1, NOW(), NOW()),
    (UUID(), 'Are supplier approvals current (certificates not expired) before issuing purchase orders?', 'Supply Chain', 'ISO 9001:2015 §8.4.1', 'Record', 'High', 1, NOW(), NOW());

    -- ── Projects ──────────────────────────────────────────────────────────────
    INSERT INTO ImsChecklistQuestion (id, questionText, processArea, isoClause, evidenceType, riskLevel, isActive, createdAt, updatedAt) VALUES
    (UUID(), 'Is a project quality plan (PQP) prepared, reviewed, and approved before fabrication commences on each project?', 'Projects', 'ISO 9001:2015 §8.1', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are project milestones and progress tracked against the approved baseline schedule with documented updates?', 'Projects', 'ISO 9001:2015 §8.5', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are client-specific quality requirements, codes, and specifications documented in the project file?', 'Projects', 'ISO 9001:2015 §8.2.2', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are site survey reports completed and reviewed by engineering before connection design is finalised?', 'Projects', 'ISO 9001:2015 §8.3.1', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are subcontractor qualifications (capacity, certification, past performance) verified before engagement?', 'Projects', 'ISO 9001:2015 §8.4.1', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Is a project risk register maintained and reviewed with the project team at key project stages?', 'Projects', 'ISO 9001:2015 §6.1', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are project lessons learned captured, reviewed, and shared with relevant departments at project close-out?', 'Projects', 'ISO 9001:2015 §10.3', 'Document', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are project handover documents (drawings, certificates, test reports) complete before final delivery?', 'Projects', 'ISO 9001:2015 §8.5.5', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are customer complaints resolved, documented, and root cause analysis completed within the target response time?', 'Projects', 'ISO 9001:2015 §10.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are erection/installation method statements prepared and approved before erection activities begin on site?', 'Projects', 'ISO 45001:2018 §8.1.3', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are post-delivery customer satisfaction assessments conducted and results recorded for each project?', 'Projects', 'ISO 9001:2015 §9.1.2', 'Record', 'Medium', 1, NOW(), NOW());

    -- ── Sales ─────────────────────────────────────────────────────────────────
    INSERT INTO ImsChecklistQuestion (id, questionText, processArea, isoClause, evidenceType, riskLevel, isActive, createdAt, updatedAt) VALUES
    (UUID(), 'Are customer requirements (technical, quality, delivery) reviewed and documented before submitting a bid?', 'Sales', 'ISO 9001:2015 §8.2.1', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are tender documents reviewed for technical risks and capability gaps before bid submission?', 'Sales', 'ISO 9001:2015 §8.2.2', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are contract review records maintained for all accepted orders prior to order confirmation?', 'Sales', 'ISO 9001:2015 §8.2.3', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are delivery commitments validated with production planning before confirming to the customer?', 'Sales', 'ISO 9001:2015 §8.2.2', 'Interview', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are customer change orders documented, reviewed, and formally approved before implementation?', 'Sales', 'ISO 9001:2015 §8.2.4', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are customer satisfaction surveys conducted after project delivery and results reviewed by management?', 'Sales', 'ISO 9001:2015 §9.1.2', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are lost bid analyses conducted to identify improvement opportunities and feed into business planning?', 'Sales', 'ISO 9001:2015 §9.1.3', 'Record', 'Low', 1, NOW(), NOW()),
    (UUID(), 'Is the CRM system updated with all customer communications, meeting notes, and agreed commitments?', 'Sales', 'ISO 9001:2015 §8.2', 'Record', 'Low', 1, NOW(), NOW()),
    (UUID(), 'Are pricing authorities and discount approval levels defined in a formal approval matrix?', 'Sales', 'ISO 9001:2015 §5.3', 'Document', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are customer-supplied drawings and specifications properly controlled (uniquely identified, revision tracked)?', 'Sales', 'ISO 9001:2015 §7.5.3', 'Record', 'Medium', 1, NOW(), NOW());

    -- ── Production ────────────────────────────────────────────────────────────
    INSERT INTO ImsChecklistQuestion (id, questionText, processArea, isoClause, evidenceType, riskLevel, isActive, createdAt, updatedAt) VALUES
    (UUID(), 'Are welding procedure specifications (WPS) available, current, and displayed at all welding stations?', 'Production', 'ISO 9001:2015 §8.5.1', 'Observation', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are welder qualification records (WPQR/WPQ) current, on file, and covering the processes in use?', 'Production', 'ISO 9001:2015 §8.5.1', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are fit-up checks performed, accepted by QC, and recorded on the ITP before welding proceeds?', 'Production', 'ISO 9001:2015 §8.5.1', 'Observation', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are weld visual inspection (VT) records completed and signed off for all weld joints on the ITP?', 'Production', 'ISO 9001:2015 §8.5.1', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Is production equipment maintained in accordance with the preventive maintenance schedule with records available?', 'Production', 'ISO 9001:2015 §7.1.3', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are material traceability records (heat number, grade, cert reference) maintained throughout production?', 'Production', 'ISO 9001:2015 §8.5.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are NCRs raised promptly for all rejected or non-conforming components, and disposition documented?', 'Production', 'ISO 9001:2015 §8.7', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are surface preparation and painting/coating operations performed per the approved coating procedure?', 'Production', 'ISO 9001:2015 §8.5.1', 'Document', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are production work orders completed, QC sign-offs recorded, and dispatch releases authorised before shipping?', 'Production', 'ISO 9001:2015 §8.5.1', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are weld consumables (electrodes, wire, flux) stored per manufacturer requirements (temperature, humidity, dryness)?', 'Production', 'ISO 9001:2015 §7.1.4', 'Observation', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are first-article inspections conducted and documented for new component types or new projects?', 'Production', 'ISO 9001:2015 §8.5.1', 'Observation', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Is the shop floor 5S standard (Sort, Set, Shine, Standardise, Sustain) maintained and audited regularly?', 'Production', 'ISO 9001:2015 §7.1.4', 'Observation', 'Low', 1, NOW(), NOW());

    -- ── HSE ───────────────────────────────────────────────────────────────────
    INSERT INTO ImsChecklistQuestion (id, questionText, processArea, isoClause, evidenceType, riskLevel, isActive, createdAt, updatedAt) VALUES
    (UUID(), 'Is a site-specific HSE induction provided to all new workers and contractors before commencing work?', 'HSE', 'ISO 45001:2018 §8.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are hot work permits (cutting, welding, grinding) issued, controlled, and closed out for every hot work operation?', 'HSE', 'ISO 45001:2018 §8.1.3', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are PPE items inspected regularly, defective items removed from service, and records maintained?', 'HSE', 'ISO 45001:2018 §8.1.4', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are all workplace incidents and near-misses reported, investigated, and documented within 24 hours?', 'HSE', 'ISO 45001:2018 §9.1', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are weekly toolbox talks conducted with all production employees and attendance records maintained?', 'HSE', 'ISO 45001:2018 §8.2', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are chemical Safety Data Sheets (SDS) current (within 2 years), accessible, and displayed at point of use?', 'HSE', 'ISO 14001:2015 §8.1', 'Observation', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are emergency response drills conducted at least semi-annually and outcomes documented for improvement?', 'HSE', 'ISO 45001:2018 §8.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are overhead crane and lifting equipment operators certified and certification records current?', 'HSE', 'ISO 45001:2018 §7.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are hazardous waste (paint waste, grinding dust, chemical containers) disposed of per environmental regulations?', 'HSE', 'ISO 14001:2015 §8.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Is the environmental monitoring register (noise, air quality, waste generation) maintained and reviewed?', 'HSE', 'ISO 14001:2015 §9.1', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are first aid kits inspected monthly, contents restocked after use, and inventory records maintained?', 'HSE', 'ISO 45001:2018 §8.1.4', 'Observation', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are confined space entry permits issued and controlled for all confined space entry work on site?', 'HSE', 'ISO 45001:2018 §8.1.3', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are risk assessments (JSA/JHA) completed for non-routine and high-risk tasks before work commences?', 'HSE', 'ISO 45001:2018 §6.1.2', 'Record', 'High', 1, NOW(), NOW());

    -- ── HR ────────────────────────────────────────────────────────────────────
    INSERT INTO ImsChecklistQuestion (id, questionText, processArea, isoClause, evidenceType, riskLevel, isActive, createdAt, updatedAt) VALUES
    (UUID(), 'Are job descriptions available for all positions, reviewed, and updated within the last 2 years?', 'HR', 'ISO 9001:2015 §7.2', 'Document', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are annual performance appraisals completed for all employees and outcomes documented?', 'HR', 'ISO 9001:2015 §7.2', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are training needs assessments conducted annually and linked to identified competence gaps?', 'HR', 'ISO 9001:2015 §7.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are training effectiveness evaluations completed within 60 days of training delivery?', 'HR', 'ISO 9001:2015 §7.2', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are employee competence records (qualifications, certifications, training history) maintained and accessible?', 'HR', 'ISO 9001:2015 §7.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Is the new employee induction checklist completed, signed, and filed within the first week of employment?', 'HR', 'ISO 9001:2015 §7.3', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are Iqama (residency permits) and work authorisations current for all foreign national employees?', 'HR', 'ISO 45001:2018 §7.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are disciplinary and grievance procedures applied consistently and documented per HR policy?', 'HR', 'ISO 9001:2015 §7.3', 'Document', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are organisational charts maintained and reflect the current reporting structure and headcount?', 'HR', 'ISO 9001:2015 §5.3', 'Document', 'Low', 1, NOW(), NOW()),
    (UUID(), 'Are succession plans documented for business-critical roles to ensure operational continuity?', 'HR', 'ISO 9001:2015 §7.1.2', 'Document', 'Low', 1, NOW(), NOW()),
    (UUID(), 'Are employee qualification certificates (welding, inspection, crane operation) tracked with expiry date alerts?', 'HR', 'ISO 9001:2015 §7.2', 'Record', 'High', 1, NOW(), NOW());

    -- ── Management ────────────────────────────────────────────────────────────
    INSERT INTO ImsChecklistQuestion (id, questionText, processArea, isoClause, evidenceType, riskLevel, isActive, createdAt, updatedAt) VALUES
    (UUID(), 'Are management review meetings conducted at planned intervals (at least annually) with minutes documented?', 'Management', 'ISO 9001:2015 §9.3', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are internal audit results reviewed by top management and corrective actions tracked to closure?', 'Management', 'ISO 9001:2015 §9.3.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are quality objectives set, measurable, communicated to all relevant functions, and monitored monthly?', 'Management', 'ISO 9001:2015 §6.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are corrective action effectiveness reviews completed within the agreed timeframe?', 'Management', 'ISO 9001:2015 §10.2', 'Record', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are KPI dashboards reviewed at least monthly by department managers and reviewed in management meetings?', 'Management', 'ISO 9001:2015 §9.1', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are business continuity risks assessed and documented mitigation plans in place for critical processes?', 'Management', 'ISO 9001:2015 §6.1', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are internal and external issues (§4.1) and interested party needs (§4.2) reviewed and documented annually?', 'Management', 'ISO 9001:2015 §4.1', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Is the IMS policy communicated, understood, and accessible to all employees and interested parties?', 'Management', 'ISO 9001:2015 §5.2', 'Interview', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are improvement initiatives tracked from initiation to verified close-out with evidence of effectiveness?', 'Management', 'ISO 9001:2015 §10.3', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are customer complaint trends analysed and presented in management review as an agenda item?', 'Management', 'ISO 9001:2015 §9.3.2', 'Record', 'High', 1, NOW(), NOW());

    -- ── Finance ───────────────────────────────────────────────────────────────
    INSERT INTO ImsChecklistQuestion (id, questionText, processArea, isoClause, evidenceType, riskLevel, isActive, createdAt, updatedAt) VALUES
    (UUID(), 'Are project budgets reviewed monthly against actual costs and variances escalated for management review?', 'Finance', 'ISO 9001:2015 §9.1', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are capital expenditure requests assessed for quality and safety compliance before approval?', 'Finance', 'ISO 9001:2015 §7.1.3', 'Document', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are financial authorities and approval limits defined, documented, and communicated to relevant staff?', 'Finance', 'ISO 9001:2015 §5.3', 'Document', 'High', 1, NOW(), NOW()),
    (UUID(), 'Are cost-of-quality data (rework, scrap, warranty) tracked and reviewed quarterly?', 'Finance', 'ISO 9001:2015 §9.1.3', 'Record', 'Medium', 1, NOW(), NOW()),
    (UUID(), 'Are supplier payment terms reviewed against contractual agreements before processing payments?', 'Finance', 'ISO 9001:2015 §8.4.3', 'Record', 'Low', 1, NOW(), NOW()),
    (UUID(), 'Are annual budgets for IMS-related activities (audits, training, calibration) allocated and tracked?', 'Finance', 'ISO 9001:2015 §7.1', 'Document', 'Medium', 1, NOW(), NOW());

  END IF;
END$$
DELIMITER ;
CALL seed_checklist_library_v243();
DROP PROCEDURE IF EXISTS seed_checklist_library_v243;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. HEXA-REC-026 — 2026 Audit Programme Expansion
--    New plan AP-26-002 + additional audits (AUD-26-004 through AUD-26-008)
--    Update AUD-26-002 (HR) to COMPLETED (was SCHEDULED, now past due date)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_2026_audit_expansion_v243;
DELIMITER $$
CREATE PROCEDURE seed_2026_audit_expansion_v243()
BEGIN
  DECLARE v_plan1 CHAR(36);
  DECLARE v_plan2 CHAR(36);
  DECLARE v_aud001 CHAR(36);
  DECLARE v_aud002 CHAR(36);
  DECLARE v_aud004 CHAR(36);
  DECLARE v_aud005 CHAR(36);
  DECLARE v_aud006 CHAR(36);

  -- Resolve existing plan IDs
  SELECT id INTO v_plan1 FROM ImsAuditPlan WHERE planNumber COLLATE utf8mb4_0900_ai_ci = 'AP-26-001' LIMIT 1;

  -- Add AP-26-002 — second internal plan for H2 2026 (Planned)
  IF NOT EXISTS (SELECT 1 FROM ImsAuditPlan WHERE planNumber COLLATE utf8mb4_0900_ai_ci = 'AP-26-002') THEN
    INSERT INTO ImsAuditPlan (id, planNumber, year, auditType, status, createdAt, updatedAt)
    VALUES (UUID(), 'AP-26-002', 2026, 'Internal', 'PLANNED', '2026-05-01 08:00:00', NOW());
  END IF;

  SELECT id INTO v_plan2 FROM ImsAuditPlan WHERE planNumber COLLATE utf8mb4_0900_ai_ci = 'AP-26-002' LIMIT 1;

  -- ── Update AUD-26-002 (HR, scheduled Apr 2026) → COMPLETED ─────────────────
  UPDATE ImsAudit
  SET
    status        = 'COMPLETED',
    actualDate    = '2026-04-10 15:30:00',
    processArea   = 'HR',
    riskLevel     = 'Low',
    isoClausesInScope = JSON_ARRAY('ISO 9001:2015 §7.2', 'ISO 9001:2015 §7.3', 'ISO 45001:2018 §7.2'),
    auditorIndependenceConfirmed = 1,
    approvedByImsManagerName = 'Khalid Al-Dossari',
    approvedByImsManagerDate = '2026-03-25 09:00:00',
    approvedByImsManagerSigned = 1,
    approvedByTopMgmtName = 'Abdullah Al-Harbi',
    approvedByTopMgmtDate = '2026-03-26 11:00:00',
    approvedByTopMgmtSigned = 1,
    reportExecutiveSummary = 'HR department audit conducted April 2026 covering competence management, training, and workforce compliance. Overall conformance satisfactory with one OFI noted.',
    reportAuditMethod = JSON_ARRAY('Checklist-based interview', 'Document review', 'Observation'),
    reportPositiveFindings = 'Employee induction process is well-documented and consistently applied. Iqama tracking system is effectively maintained with proactive renewal alerts.',
    reportConclusion = 'Fully conforming',
    reportLeadAuditorName = 'Ahmed Al-Rashidi',
    reportLeadAuditorDate = '2026-04-12 10:00:00',
    reportLeadAuditorSigned = 1,
    reportImsMgrName = 'Khalid Al-Dossari',
    reportImsMgrDate = '2026-04-13 09:00:00',
    reportImsMgrSigned = 1,
    summary = 'HR audit completed. Fully conforming. One OFI for training effectiveness evaluation.',
    updatedAt = NOW()
  WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-002';

  -- Retrieve updated audit IDs
  SELECT id INTO v_aud002 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-002' LIMIT 1;
  SELECT id INTO v_aud001 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-001' LIMIT 1;

  -- ── Additional findings for AUD-26-001 (Supply Chain, Feb 2026) ─────────────
  IF v_aud001 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-001-F02') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, status, targetDate, updatedAt)
      VALUES (UUID(), v_aud001, 'AUD-26-001-F02', 'OFI', 'ISO 9001:2015 §8.4.1',
        'The current supplier scorecard uses only two criteria (delivery and cert validity). Expanding to include quality defect rate and price competitiveness would strengthen supplier evaluation and support sourcing decisions.',
        'Supplier scorecard template reviewed. Comparison with industry scoring models noted.',
        'Open', '2026-08-31', NOW());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-001-F03') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, status, updatedAt)
      VALUES (UUID(), v_aud001, 'AUD-26-001-F03', 'Conforming', 'ISO 9001:2015 §8.4.3',
        'Purchase order process is well-controlled. All reviewed POs included full specifications, applicable standards, and clear acceptance criteria. GRN matching process is consistently followed.',
        'OPEN', NOW());
    END IF;
  END IF;

  -- ── Findings for AUD-26-002 (HR, Apr 2026) ──────────────────────────────────
  IF v_aud002 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-002-F01') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, status, targetDate, updatedAt)
      VALUES (UUID(), v_aud002, 'AUD-26-002-F01', 'OFI', 'ISO 9001:2015 §7.2',
        'Training effectiveness evaluations are not consistently completed within 60 days of training delivery. Of 14 training events in Q1 2026, only 9 had completed effectiveness evaluation forms on file.',
        'HR training register reviewed. 5 training records with no effectiveness evaluation form.',
        'Open', '2026-07-31', NOW());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-002-F02') THEN
      INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, status, updatedAt)
      VALUES (UUID(), v_aud002, 'AUD-26-002-F02', 'Conforming', 'ISO 9001:2015 §7.3',
        'Employee induction process is well-documented and consistently implemented. All 6 new employees onboarded in Q1 2026 have completed induction checklists on file, signed by employee and line manager.',
        'OPEN', NOW());
    END IF;
  END IF;

  -- ── AUD-26-004 — Production (January 2026, COMPLETED) ───────────────────────
  IF v_plan1 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-004') THEN
      SET v_aud004 = UUID();
      INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, actualDate, status,
        processArea, riskLevel, isoClausesInScope, auditorIndependenceConfirmed,
        approvedByImsManagerName, approvedByImsManagerDate, approvedByImsManagerSigned,
        approvedByTopMgmtName, approvedByTopMgmtDate, approvedByTopMgmtSigned,
        reportExecutiveSummary, reportAuditMethod, reportPositiveFindings, reportConclusion,
        reportRecommendation, reportLeadAuditorName, reportLeadAuditorDate, reportLeadAuditorSigned,
        reportImsMgrName, reportImsMgrDate, reportImsMgrSigned,
        summary, createdAt, updatedAt)
      VALUES (v_aud004, v_plan1, 'AUD-26-004',
        'Production & Fabrication',
        JSON_ARRAY('8.5.1', '8.5.2', '7.1.3', '7.1.4', '8.7'),
        '2026-01-14 08:00:00', '2026-01-15 16:00:00', 'COMPLETED',
        'Production', 'High',
        JSON_ARRAY('ISO 9001:2015 §8.5.1', 'ISO 9001:2015 §8.5.2', 'ISO 9001:2015 §7.1.4'),
        1,
        'Khalid Al-Dossari', '2026-01-05 09:00:00', 1,
        'Abdullah Al-Harbi', '2026-01-06 11:00:00', 1,
        'Production department audit conducted January 2026. WPS availability and material traceability are well controlled. One NC raised for weld consumable storage records and one OFI identified.',
        JSON_ARRAY('Checklist-based interview', 'Document review', 'Observation'),
        'Material traceability system is effectively maintained across all fabrication stages. WPS documents are current and available at all welding stations.',
        'Minor NCs identified',
        'Complete corrective action for consumable storage NC. Review effectiveness of the weld log update process quarterly.',
        'Ahmed Al-Rashidi', '2026-01-17 10:00:00', 1,
        'Khalid Al-Dossari', '2026-01-18 09:00:00', 1,
        'Production audit completed. One NC for consumable records; one OFI for digital weld log.', '2026-01-14 08:00:00', NOW());
    ELSE
      SELECT id INTO v_aud004 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-004' LIMIT 1;
    END IF;

    -- Findings for AUD-26-004
    IF v_aud004 IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-004-F01') THEN
        INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, correctiveAction, status, targetDate, createdAt, updatedAt)
        VALUES (UUID(), v_aud004, 'AUD-26-004-F01', 'NC', 'ISO 9001:2015 §7.1.4',
          'Weld consumable storage records (electrode batch logs) were not updated for the period 28 Dec 2025 – 10 Jan 2026. Three electrode batches (E7018, ER70S-6) drawn from the rod oven had no entry in the consumable log.',
          'Consumable issuance log reviewed for weeks 52–2. Three batch entries (E7018 Lot 25-4412, E7018 Lot 25-4413, ER70S-6 Lot 25-8821) confirmed missing.',
          'Update consumable log immediately for missing entries. Implement a daily sign-off requirement on the consumable log. Retrain welder supervisors on procedure WPS-GEN-003 consumable control section.',
          'OPEN', '2026-02-14', '2026-01-15 08:00:00', NOW());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-004-F02') THEN
        INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, status, updatedAt)
        VALUES (UUID(), v_aud004, 'AUD-26-004-F02', 'Conforming', 'ISO 9001:2015 §8.5.1',
          'WPS documents reviewed at all 8 active welding stations. All WPS versions current (Rev 3 or later). WPQR records for all 12 active welders on file and valid. ITP sign-off process consistently followed for fit-up and weld stages.',
          'OPEN', NOW());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-004-F03') THEN
        INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, status, targetDate, updatedAt)
        VALUES (UUID(), v_aud004, 'AUD-26-004-F03', 'OFI', 'ISO 9001:2015 §8.5.1',
          'Current paper-based weld log requires manual entry after each welding session and is prone to omission. Implementing a simple digital weld log (mobile form or tablet-based entry) would reduce recording gaps and enable real-time QC oversight.',
          'Reviewed 4 weeks of weld log entries; 11 recording gaps identified across 3 shifts.',
          'Open', '2026-06-30', NOW());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-004-F04') THEN
        INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, status, targetDate, updatedAt)
        VALUES (UUID(), v_aud004, 'AUD-26-004-F04', 'Observation', 'ISO 9001:2015 §7.1.4',
          'Shop floor aisle markings in Bay 3 (heavy fabrication) are worn and difficult to distinguish. Recommend refreshing aisle markings and adding colour-coded zones for raw material, WIP, and finished goods staging.',
          'OPEN', '2026-04-30', NOW());
      END IF;
    END IF;
  END IF;

  -- ── AUD-26-005 — HSE (February 2026, COMPLETED) ─────────────────────────────
  IF v_plan1 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-005') THEN
      SET v_aud005 = UUID();
      INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, actualDate, status,
        processArea, riskLevel, isoClausesInScope, auditorIndependenceConfirmed,
        approvedByImsManagerName, approvedByImsManagerDate, approvedByImsManagerSigned,
        reportExecutiveSummary, reportAuditMethod, reportPositiveFindings, reportConclusion,
        reportRecommendation, reportLeadAuditorName, reportLeadAuditorDate, reportLeadAuditorSigned,
        reportImsMgrName, reportImsMgrDate, reportImsMgrSigned,
        summary, createdAt, updatedAt)
      VALUES (v_aud005, v_plan1, 'AUD-26-005',
        'Health, Safety & Environment',
        JSON_ARRAY('8.1', '8.1.3', '8.1.4', '9.1', '7.2'),
        '2026-02-10 08:00:00', '2026-02-11 15:00:00', 'COMPLETED',
        'HSE', 'High',
        JSON_ARRAY('ISO 45001:2018 §8.1.3', 'ISO 45001:2018 §8.1.4', 'ISO 14001:2015 §8.1'),
        1,
        'Khalid Al-Dossari', '2026-02-03 09:00:00', 1,
        'HSE department audit conducted February 2026. PPE management and lifting equipment certification are well maintained. One NC raised for hot work permit retention. Two observations noted.',
        JSON_ARRAY('Checklist-based interview', 'Document review', 'Observation'),
        'PPE distribution and replacement process is effective. Overhead crane operator certificates are all current and correctly filed. Toolbox talk programme is well-structured.',
        'Minor NCs identified',
        'Close out hot work permit NC promptly. Update SDS sheets approaching the 2-year renewal interval.',
        'Ahmed Al-Rashidi', '2026-02-13 10:00:00', 1,
        'Khalid Al-Dossari', '2026-02-14 09:00:00', 1,
        'HSE audit completed. One NC (hot work permit retention). Two observations.', '2026-02-10 08:00:00', NOW());
    ELSE
      SELECT id INTO v_aud005 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-005' LIMIT 1;
    END IF;

    -- Findings for AUD-26-005
    IF v_aud005 IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-005-F01') THEN
        INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, correctiveAction, status, targetDate, createdAt, updatedAt)
        VALUES (UUID(), v_aud005, 'AUD-26-005-F01', 'NC', 'ISO 45001:2018 §8.1.3',
          'Hot work permit records for welding operations carried out in Bay 2 on 02-Jan-2026 and 07-Jan-2026 could not be located in the HSE permit-to-work file. Permits were issued verbally without completion of the formal PTW form.',
          'PTW register for January 2026 reviewed. Two gaps identified: 02-Jan (welding on platform H-117) and 07-Jan (cutting operation on mezzanine level). Confirmed by shift supervisor interview.',
          'Issue corrective notice to Bay 2 supervisor. Conduct refresher briefing for all welding supervisors on the PTW procedure. Implement spot checks by HSE officer for first 30 days.',
          'IN_PROGRESS', '2026-03-10', '2026-02-11 08:00:00', NOW());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-005-F02') THEN
        INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, status, updatedAt)
        VALUES (UUID(), v_aud005, 'AUD-26-005-F02', 'Conforming', 'ISO 45001:2018 §8.1.4',
          'PPE issue log reviewed — all employees have signed acknowledgement of PPE receipt. Defective PPE (damaged welding screens, worn gloves) is being replaced on identification. Monthly PPE inspection checklist is completed and signed by HSE officer.',
          'OPEN', NOW());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-005-F03') THEN
        INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, status, targetDate, updatedAt)
        VALUES (UUID(), v_aud005, 'AUD-26-005-F03', 'Observation', 'ISO 14001:2015 §8.1',
          'Three SDS sheets in the chemical storage room (thinners, zinc primer, acetylene) are dated 2023 and approaching the 2-year review interval. Recommend scheduling renewal before August 2026.',
          'SDS binder reviewed. Sheets dated: Alvent Thinner (Jun 2023), Sigma Primer (Aug 2023), BOC Acetylene (Sep 2023).',
          'OPEN', '2026-08-31', NOW());
      END IF;
    END IF;
  END IF;

  -- ── AUD-26-006 — Projects (March 2026, IN_PROGRESS) ─────────────────────────
  IF v_plan1 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-006') THEN
      SET v_aud006 = UUID();
      INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, actualDate, status,
        processArea, riskLevel, isoClausesInScope, auditorIndependenceConfirmed,
        approvedByImsManagerName, approvedByImsManagerDate, approvedByImsManagerSigned,
        summary, createdAt, updatedAt)
      VALUES (v_aud006, v_plan1, 'AUD-26-006',
        'Projects Department',
        JSON_ARRAY('8.1', '8.2', '8.3', '8.5', '10.2'),
        '2026-03-18 08:00:00', '2026-03-19 14:00:00', 'IN_PROGRESS',
        'Projects', 'Medium',
        JSON_ARRAY('ISO 9001:2015 §8.1', 'ISO 9001:2015 §8.2', 'ISO 9001:2015 §8.5.5'),
        1,
        'Khalid Al-Dossari', '2026-03-10 09:00:00', 1,
        'Projects department audit in progress. Opening meeting held 19 March. One NC raised for missing PQP on small project.', '2026-03-18 08:00:00', NOW());
    ELSE
      SELECT id INTO v_aud006 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-006' LIMIT 1;
    END IF;

    -- Findings for AUD-26-006
    IF v_aud006 IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-006-F01') THEN
        INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, correctiveAction, status, targetDate, createdAt, updatedAt)
        VALUES (UUID(), v_aud006, 'AUD-26-006-F01', 'NC', 'ISO 9001:2015 §8.1',
          'Project OTS-2026-014 (canopy steel for Riyadh client, 45-ton scope) commenced fabrication on 02-Mar-2026 without an approved Project Quality Plan. PQP template exists but was not completed or approved prior to production start.',
          'Project file OTS-2026-014 reviewed. Fabrication work orders dated 02-Mar-2026. No PQP document found in project file or QMS system.',
          'Prepare and obtain IMS Manager approval for a retrospective PQP for OTS-2026-014 within 5 working days. Conduct team briefing on PQP mandatory requirement. Update project kick-off checklist to include PQP sign-off.',
          'OPEN', '2026-04-18', '2026-03-19 09:00:00', NOW());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM ImsAuditFinding WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-006-F02') THEN
        INSERT INTO ImsAuditFinding (id, auditId, findingNumber, type, clause, description, evidence, status, targetDate, updatedAt)
        VALUES (UUID(), v_aud006, 'AUD-26-006-F02', 'OFI', 'ISO 9001:2015 §10.3',
          'Lessons learned from completed projects are captured in meeting minutes but are not systematically accessible to project teams starting similar projects. A structured lessons-learned register with searchable tags (scope type, material, client) would significantly improve knowledge reuse.',
          'Three project close-out reports reviewed. Lessons mentioned in narrative but not entered into a searchable register.',
          'Open', '2026-09-30', NOW());
      END IF;
    END IF;
  END IF;

  -- ── AUD-26-007 — Sales (April 2026, SCHEDULED — under plan 1) ───────────────
  IF v_plan1 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-007') THEN
      INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, status,
        processArea, riskLevel, isoClausesInScope, updatedAt)
      VALUES (UUID(), v_plan1, 'AUD-26-007',
        'Sales & Contract Review',
        JSON_ARRAY('8.2', '8.2.1', '8.2.2', '8.2.3', '8.2.4'),
        '2026-05-19 08:00:00', 'SCHEDULED',
        'Sales', 'Low',
        JSON_ARRAY('ISO 9001:2015 §8.2.1', 'ISO 9001:2015 §8.2.3', 'ISO 9001:2015 §8.2.4'),
        NOW());
    END IF;
  END IF;

  -- ── AUD-26-008 — Engineering (June 2026, SCHEDULED — under plan 2) ───────────
  IF v_plan2 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM ImsAudit WHERE auditNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-008') THEN
      INSERT INTO ImsAudit (id, planId, auditNumber, scope, clausesCovered, scheduledDate, status,
        processArea, riskLevel, isoClausesInScope, updatedAt)
      VALUES (UUID(), v_plan2, 'AUD-26-008',
        'Design & Engineering',
        JSON_ARRAY('8.3', '8.3.3', '8.3.4', '8.3.6', '7.5'),
        '2026-06-16 08:00:00', 'SCHEDULED',
        'Engineering', 'Medium',
        JSON_ARRAY('ISO 9001:2015 §8.3.3', 'ISO 9001:2015 §8.3.6', 'ISO 9001:2015 §7.5.2'),
        NOW());
    END IF;
  END IF;

END$$
DELIMITER ;
CALL seed_2026_audit_expansion_v243();
DROP PROCEDURE IF EXISTS seed_2026_audit_expansion_v243;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. ImsNcr — QA NCR records for 2026 NC findings
--    (Auto-creation that would normally happen via API POST)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_2026_ncr_records_v243;
DELIMITER $$
CREATE PROCEDURE seed_2026_ncr_records_v243()
BEGIN
  DECLARE v_admin CHAR(36);
  DECLARE v_aud001_find CHAR(36);
  DECLARE v_aud004_find CHAR(36);
  DECLARE v_aud005_find CHAR(36);
  DECLARE v_aud006_find CHAR(36);

  SELECT id INTO v_admin FROM User WHERE deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1;

  IF v_admin IS NOT NULL THEN

    -- NCR for AUD-26-001 Supply Chain NC (NCR-26-001 finding)
    SELECT af.id INTO v_aud001_find
    FROM ImsAuditFinding af
    JOIN ImsAudit a ON a.id = af.auditId
    WHERE af.findingNumber COLLATE utf8mb4_0900_ai_ci = 'NCR-26-001' AND a.auditNumber = 'AUD-26-001'
    LIMIT 1;

    IF v_aud001_find IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM ImsNcr WHERE ncrNumber COLLATE utf8mb4_0900_ai_ci = 'QA-NCR-2602-001') THEN
        INSERT INTO ImsNcr (id, ncrNumber, auditFindingId, auditId, auditNumber, department,
          title, description, category, severity, status,
          correctiveAction, deadline, raisedById, createdAt, updatedAt)
        SELECT UUID(), 'QA-NCR-2602-001', v_aud001_find, a.id, a.auditNumber, a.scope,
          'Supplier approval lapse — SUP-010 certificate expired',
          af.description, 'System', 'Medium', 'IN_PROGRESS',
          af.correctiveAction, '2026-03-17 23:59:59', v_admin,
          a.scheduledDate, NOW()
        FROM ImsAuditFinding af
        JOIN ImsAudit a ON a.id = af.auditId
        WHERE af.id = v_aud001_find;
      END IF;
    END IF;

    -- NCR for AUD-26-004 Production NC (consumable records)
    SELECT id INTO v_aud004_find
    FROM ImsAuditFinding
    WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-004-F01'
    LIMIT 1;

    IF v_aud004_find IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM ImsNcr WHERE ncrNumber COLLATE utf8mb4_0900_ai_ci = 'QA-NCR-2601-001') THEN
        INSERT INTO ImsNcr (id, ncrNumber, auditFindingId, auditId, auditNumber, department,
          title, description, category, severity, status,
          correctiveAction, deadline, raisedById, createdAt, updatedAt)
        SELECT UUID(), 'QA-NCR-2601-001', v_aud004_find, af.auditId, a.auditNumber, a.scope,
          'Weld consumable storage records not maintained — three batches unlogged',
          af.description, 'System', 'Medium', 'OPEN',
          af.correctiveAction, '2026-02-14 23:59:59', v_admin,
          '2026-01-15 08:00:00', NOW()
        FROM ImsAuditFinding af
        JOIN ImsAudit a ON a.id = af.auditId
        WHERE af.id = v_aud004_find;
      END IF;
    END IF;

    -- NCR for AUD-26-005 HSE NC (hot work permits)
    SELECT id INTO v_aud005_find
    FROM ImsAuditFinding
    WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-005-F01'
    LIMIT 1;

    IF v_aud005_find IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM ImsNcr WHERE ncrNumber COLLATE utf8mb4_0900_ai_ci = 'QA-NCR-2602-002') THEN
        INSERT INTO ImsNcr (id, ncrNumber, auditFindingId, auditId, auditNumber, department,
          title, description, category, severity, status,
          correctiveAction, deadline, raisedById, createdAt, updatedAt)
        SELECT UUID(), 'QA-NCR-2602-002', v_aud005_find, af.auditId, a.auditNumber, a.scope,
          'Hot work permits not raised for two welding operations — verbal authorisation only',
          af.description, 'System', 'High', 'IN_PROGRESS',
          af.correctiveAction, '2026-03-10 23:59:59', v_admin,
          '2026-02-11 08:00:00', NOW()
        FROM ImsAuditFinding af
        JOIN ImsAudit a ON a.id = af.auditId
        WHERE af.id = v_aud005_find;
      END IF;
    END IF;

    -- NCR for AUD-26-006 Projects NC (missing PQP)
    SELECT id INTO v_aud006_find
    FROM ImsAuditFinding
    WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'AUD-26-006-F01'
    LIMIT 1;

    IF v_aud006_find IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM ImsNcr WHERE ncrNumber COLLATE utf8mb4_0900_ai_ci = 'QA-NCR-2603-001') THEN
        INSERT INTO ImsNcr (id, ncrNumber, auditFindingId, auditId, auditNumber, department,
          title, description, category, severity, status,
          correctiveAction, deadline, raisedById, createdAt, updatedAt)
        SELECT UUID(), 'QA-NCR-2603-001', v_aud006_find, af.auditId, a.auditNumber, a.scope,
          'Project OTS-2026-014 commenced without an approved Project Quality Plan',
          af.description, 'System', 'Medium', 'OPEN',
          af.correctiveAction, '2026-04-18 23:59:59', v_admin,
          '2026-03-19 09:00:00', NOW()
        FROM ImsAuditFinding af
        JOIN ImsAudit a ON a.id = af.auditId
        WHERE af.id = v_aud006_find;
      END IF;
    END IF;

  END IF;
END$$
DELIMITER ;
CALL seed_2026_ncr_records_v243();
DROP PROCEDURE IF EXISTS seed_2026_ncr_records_v243;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. HEXA-FRM-024 — OFI Register (Opportunities for Improvement)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_ofi_register_v243;
DELIMITER $$
CREATE PROCEDURE seed_ofi_register_v243()
BEGIN
  -- Guard: skip if already seeded
  IF NOT EXISTS (SELECT 1 FROM ImsOfiEntry WHERE findingNumber COLLATE utf8mb4_0900_ai_ci = 'OFI-2601-001') THEN

    INSERT INTO ImsOfiEntry (id, findingNumber, auditNumber, findingType, processArea, description, potentialBenefit, targetReviewDate, status, notes, createdAt, updatedAt)
    VALUES
    -- Production: digital weld log (from AUD-26-004)
    (UUID(), 'OFI-2601-001', 'AUD-26-004', 'OFI', 'Production',
      'Implement a tablet-based digital weld log to replace the current paper consumable and weld tracking system. System would auto-populate batch numbers from barcoded packaging and flag incomplete entries in real time.',
      'Eliminate recording gaps identified in Jan 2026 audit. Reduce weld-related rework queries by estimated 40%. Enable real-time QC oversight of welding operations.',
      '2026-06-30', 'Open',
      'IT team to assess cost of off-the-shelf inspection app vs. custom development. Budget estimate SAR 15,000–25,000.',
      '2026-01-17 10:00:00', NOW()),

    -- Engineering: automated drawing register (raised by department)
    (UUID(), 'OFI-2601-002', NULL, 'OFI', 'Engineering',
      'Automate the drawing register to pull revision status directly from the CAD vault (currently updated manually in an Excel spreadsheet). Integration with the existing PDM system would eliminate manual update step.',
      'Eliminate version control discrepancies. Reduce drawing register maintenance time by an estimated 3 hours/week. Reduce risk of superseded drawings reaching the shop floor.',
      '2026-07-31', 'In Progress',
      'IT evaluated two PDM integration tools. CAD admin shortlisted SolidWorks PDM Professional connector. Trial in progress.',
      '2026-01-20 09:00:00', NOW()),

    -- Supply Chain: supplier scorecard (from AUD-26-001)
    (UUID(), 'OFI-2602-001', 'AUD-26-001', 'OFI', 'Supply Chain',
      'Expand the current two-criterion supplier scorecard to include quality defect rate (NCRs per 100 deliveries), price competitiveness, and technical support responsiveness. Review scores quarterly and share results with Tier-1 suppliers.',
      'Improved supplier selection decisions. Strengthen supplier relationships through transparent performance feedback. Reduce incoming non-conformance rate.',
      '2026-08-31', 'Open',
      'Supply Chain Manager to draft revised scorecard template for IMS Manager review by end of Q2 2026.',
      '2026-02-20 11:00:00', NOW()),

    -- HSE: real-time gas monitoring (from AUD-26-005)
    (UUID(), 'OFI-2602-002', 'AUD-26-005', 'OFI', 'HSE',
      'Install fixed 4-gas detector units (O2, CO, H2S, LEL) in confined spaces within the fabrication bays (rod oven room, paint storage vault, sub-crawl spaces). Currently relies on portable units that are not always available at point of work.',
      'Eliminate reliance on portable detectors for routine confined space monitoring. Provide continuous alarm capability. Strengthen compliance with ISO 45001 §8.1.3.',
      '2026-10-31', 'In Progress',
      'HSE Manager obtained quotes. Two fixed units and one portable backup unit — estimated cost SAR 18,500. Awaiting budget approval.',
      '2026-02-14 09:00:00', NOW()),

    -- HR: e-learning platform for inductions (raised by HR)
    (UUID(), 'OFI-2603-001', NULL, 'OFI', 'HR',
      'Develop an e-learning module for new employee induction covering IMS policy, HSE basics, quality expectations, and company values. Would allow self-paced completion and automatic tracking of completion status.',
      'Reduce induction delivery time from ~1 day to 4 hours. Enable induction completion tracking without paper checklists. Support remote/site-based employee induction.',
      '2026-09-30', 'Open',
      'HR to scope content requirements. IT confirmed LMS platform (Moodle) available at no additional licence cost.',
      '2026-03-05 10:00:00', NOW()),

    -- Projects: lessons-learned register (from AUD-26-006)
    (UUID(), 'OFI-2603-002', 'AUD-26-006', 'OFI', 'Projects',
      'Establish a structured lessons-learned register within the OTS system, searchable by project type, scope category, and client. Currently lessons are captured in project close-out minutes but are not accessible to future project teams.',
      'Reduce repeat mistakes on similar projects. Improve project quality plan preparation. Support continuous improvement culture.',
      '2026-09-30', 'Open',
      'Project Manager to define required data fields and tagging taxonomy. IMS Manager to review and approve before IT development.',
      '2026-03-21 09:00:00', NOW()),

    -- Management: KPI automation (raised in MR-26-001)
    (UUID(), 'OFI-2604-001', NULL, 'OFI', 'Management',
      'Automate the monthly KPI dashboard report by extracting data directly from production, QC, and sales modules in OTS. Currently, department heads manually compile KPI data and email to IMS Manager each month.',
      'Save an estimated 6 person-hours/month in KPI compilation. Reduce reporting errors. Enable real-time KPI visibility for management.',
      '2026-08-31', 'Closed',
      'OTS development team implemented KPI dashboard integration in v22.5.0 (March 2026). Dashboard now auto-populates from production and QC data. Closed as implemented.',
      '2026-04-02 10:00:00', NOW()),

    -- Production: 5S digital audit app (raised by Production Manager)
    (UUID(), 'OFI-2604-002', NULL, 'OFI', 'Production',
      'Implement a mobile 5S audit checklist app that allows production supervisors to conduct weekly 5S assessments on their smartphones and automatically records scores in the IMS system. Currently uses paper checklists that are scanned and filed.',
      'Increase 5S audit compliance. Enable trend tracking of 5S scores by bay. Reduce paper handling.',
      '2026-10-31', 'Open',
      'Exploring integration with existing IMS module. Production Manager to define scoring criteria and frequency requirements.',
      '2026-04-08 09:00:00', NOW()),

    -- Sales: CRM integration (raised by Sales Director)
    (UUID(), 'OFI-2605-001', NULL, 'OFI', 'Sales',
      'Integrate the OTS CRM module with the client portal to enable customers to view project progress, upload documents, and receive automated delivery notifications. Currently all client communication is via email.',
      'Improve client experience and satisfaction scores. Reduce inbound status enquiry calls by estimated 30%. Provide auditable communication trail.',
      '2026-12-31', 'Open',
      'Sales Director discussed with IT. Scoping document in preparation. Expected development effort: 3–4 weeks.',
      '2026-05-02 11:00:00', NOW()),

    -- Engineering: BIM adoption (raised by Chief Engineer)
    (UUID(), 'OFI-2605-002', NULL, 'OFI', 'Engineering',
      'Evaluate adoption of BIM (Building Information Modelling) level 2 for structural steel projects above 500 tonnes. Current 2D/3D CAD approach limits clash detection capability and coordination with other trades on large projects.',
      'Reduce design-related site RFIs on large projects. Improve coordination with civil and MEP contractors. Position Hexa Steel as BIM-capable for premium project bids.',
      '2026-12-31', 'Open',
      'Chief Engineer to prepare feasibility report including software (Tekla, Revit), training, and workflow change requirements by September 2026.',
      '2026-05-07 10:00:00', NOW());

  END IF;
END$$
DELIMITER ;
CALL seed_ofi_register_v243();
DROP PROCEDURE IF EXISTS seed_ofi_register_v243;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. HEXA-FRM-025 — Corrective Action & Verification Records (CAR)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_car_records_v243;
DELIMITER $$
CREATE PROCEDURE seed_car_records_v243()
BEGIN
  DECLARE v_ncr_aud001 CHAR(36);
  DECLARE v_ncr_aud004 CHAR(36);
  DECLARE v_ncr_aud005 CHAR(36);
  DECLARE v_ncr_aud006 CHAR(36);

  -- Resolve NCR IDs
  SELECT id INTO v_ncr_aud001 FROM ImsNcr WHERE ncrNumber COLLATE utf8mb4_0900_ai_ci = 'QA-NCR-2602-001' LIMIT 1;
  SELECT id INTO v_ncr_aud004 FROM ImsNcr WHERE ncrNumber COLLATE utf8mb4_0900_ai_ci = 'QA-NCR-2601-001' LIMIT 1;
  SELECT id INTO v_ncr_aud005 FROM ImsNcr WHERE ncrNumber COLLATE utf8mb4_0900_ai_ci = 'QA-NCR-2602-002' LIMIT 1;
  SELECT id INTO v_ncr_aud006 FROM ImsNcr WHERE ncrNumber COLLATE utf8mb4_0900_ai_ci = 'QA-NCR-2603-001' LIMIT 1;

  -- CAR-26-001: Supplier approval lapse (Supply Chain, AUD-26-001)
  IF NOT EXISTS (SELECT 1 FROM ImsCarRecord WHERE carNumber COLLATE utf8mb4_0900_ai_ci = 'CAR-26-001') THEN
    INSERT INTO ImsCarRecord (id, carNumber, linkedNcrId, linkedNcrNumber, ncStatement,
      rootCauseMethod, rootCauseText, actionPlan, targetDate, status,
      verificationDate, verificationMethod, verificationResult, verifiedByName,
      createdAt, updatedAt)
    VALUES (UUID(), 'CAR-26-001', v_ncr_aud001, 'QA-NCR-2602-001',
      'SUP-010 ISO 9001 certificate expired 01-Jan-2025 and was not identified during monthly approved supplier register review. Supplier continued to supply abrasive consumables for 13 months without current approval.',
      '5-Why',
      'Why 1: Supplier continued to be used after certificate expired. Why 2: Monthly register review did not flag the expiry. Why 3: Register spreadsheet had no conditional formatting for expiry dates. Why 4: No automated alert system in place. Why 5: Responsibility for certificate expiry monitoring was not clearly assigned to a specific role.',
      '1. Add 90-day and 30-day automated expiry alerts to the approved supplier register. 2. Assign certificate monitoring responsibility explicitly to Supply Chain Coordinator. 3. Update supplier approval procedure (SOP-SC-002) to require expiry alert setup for each new supplier certificate. 4. Conduct refresher training for Supply Chain team on supplier approval requirements.',
      '2026-03-17', 'In Progress',
      NULL, NULL, NULL, NULL,
      '2026-02-22 09:00:00', NOW());
  END IF;

  -- CAR-26-002: Weld consumable records (Production, AUD-26-004)
  IF NOT EXISTS (SELECT 1 FROM ImsCarRecord WHERE carNumber COLLATE utf8mb4_0900_ai_ci = 'CAR-26-002') THEN
    INSERT INTO ImsCarRecord (id, carNumber, linkedNcrId, linkedNcrNumber, ncStatement,
      rootCauseMethod, rootCauseText, actionPlan, targetDate, status,
      verificationDate, verificationMethod, verificationResult, verifiedByName,
      createdAt, updatedAt)
    VALUES (UUID(), 'CAR-26-002', v_ncr_aud004, 'QA-NCR-2601-001',
      'Weld consumable batch logs not updated for three electrode batches drawn from the rod oven during the holiday period 28 Dec 2025 – 10 Jan 2026.',
      '5-Why',
      'Why 1: Log entries missing for holiday period batches. Why 2: Reduced supervision during holiday shifts. Why 3: No dedicated sign-off requirement at shift handover. Why 4: Consumable procedure relies on welder self-reporting without supervisory countersign. Why 5: Procedure was not updated when shift structure was changed in 2024.',
      '1. Update procedure WPS-GEN-003 to require supervisor countersignature on consumable log at each shift handover. 2. Retrain all welding supervisors and welders on updated procedure. 3. Implement QC spot-check of consumable log completeness every Friday. 4. Add consumable log review to weekly production supervisor checklist.',
      '2026-02-28', 'Closed',
      '2026-03-05', 'Document Review',
      'Effective', 'Khalid Al-Dossari',
      '2026-01-20 10:00:00', NOW());
  END IF;

  -- CAR-26-003: Hot work permit (HSE, AUD-26-005)
  IF NOT EXISTS (SELECT 1 FROM ImsCarRecord WHERE carNumber COLLATE utf8mb4_0900_ai_ci = 'CAR-26-003') THEN
    INSERT INTO ImsCarRecord (id, carNumber, linkedNcrId, linkedNcrNumber, ncStatement,
      rootCauseMethod, rootCauseText, actionPlan, targetDate, status,
      verificationDate, verificationMethod, verificationResult, verifiedByName,
      createdAt, updatedAt)
    VALUES (UUID(), 'CAR-26-003', v_ncr_aud005, 'QA-NCR-2602-002',
      'Two hot work operations in Bay 2 during January 2026 were authorised verbally by the Bay Supervisor without completing the mandatory hot work permit-to-work (PTW) form.',
      'Fishbone',
      'Root cause (Man): Bay 2 supervisor assumed verbal authorisation was acceptable for in-shop operations (misunderstanding of scope). Root cause (Method): PTW procedure (HSE-PR-001) does not clearly state that all hot work within the factory boundary — including production bays — requires a formal permit. Previous practice in some bays tolerated informal verbal approval for routine operations.',
      '1. Conduct immediate briefing with all supervisors clarifying that PTW is mandatory for ALL hot work without exception. 2. Revise HSE-PR-001 to explicitly state "no exceptions within production bays." 3. Implement HSE officer random PTW spot-checks three times per week for 30 days. 4. Non-compliance with PTW requirement to be treated as a disciplinary matter — update HR policy.',
      '2026-03-10', 'In Progress',
      NULL, NULL, NULL, NULL,
      '2026-02-15 09:00:00', NOW());
  END IF;

  -- CAR-26-004: Missing PQP (Projects, AUD-26-006)
  IF NOT EXISTS (SELECT 1 FROM ImsCarRecord WHERE carNumber COLLATE utf8mb4_0900_ai_ci = 'CAR-26-004') THEN
    INSERT INTO ImsCarRecord (id, carNumber, linkedNcrId, linkedNcrNumber, ncStatement,
      rootCauseMethod, rootCauseText, actionPlan, targetDate, status,
      createdAt, updatedAt)
    VALUES (UUID(), 'CAR-26-004', v_ncr_aud006, 'QA-NCR-2603-001',
      'Project OTS-2026-014 commenced fabrication on 02-Mar-2026 without an approved Project Quality Plan, contrary to procedure IMS-PR-008.',
      '5-Why',
      'Why 1: Fabrication started without PQP. Why 2: Project Coordinator assumed PQP was optional for small scope projects (<50t). Why 3: Procedure IMS-PR-008 does not specify a minimum tonnage threshold — it applies to ALL projects. Why 4: Ambiguity was not clarified during last procedure revision. Why 5: PQP requirement was not included in the project kick-off checklist used by coordinators.',
      '1. Add "PQP approved by IMS Manager" as a mandatory item on the project kick-off checklist before any fabrication work orders are released. 2. Prepare and retrospectively approve a PQP for OTS-2026-014 within 5 working days. 3. Conduct a 30-minute briefing with all Project Coordinators on PQP requirements. 4. Update IMS-PR-008 to clarify scope (applies to all projects regardless of tonnage).',
      '2026-04-18', 'Open',
      '2026-03-25 10:00:00', NOW());
  END IF;

END$$
DELIMITER ;
CALL seed_car_records_v243();
DROP PROCEDURE IF EXISTS seed_car_records_v243;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Calibration Register — ISO 9001:2015 §7.1.5
--    Insert measuring/monitoring equipment requiring calibration
--    Today: 2026-05-10 (reference for status)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_calibration_assets_v243;
DELIMITER $$
CREATE PROCEDURE seed_calibration_assets_v243()
BEGIN
  DECLARE v_admin CHAR(36);
  SELECT id INTO v_admin FROM User WHERE deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1;

  IF v_admin IS NOT NULL THEN

    -- UT Thickness Gauge — OVERDUE (due Apr 2026)
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-UTG-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-UTG-001', 'Ultrasonic Thickness Gauge — Krautkramer CL5', 'EQUIPMENT', 'AVAILABLE',
        'Baker Hughes (Krautkramer)', 'CL5+', 'KK-CL5-2019-00847',
        1, '12 months',
        '2025-04-12 10:00:00', '2026-04-12 10:00:00', NULL, NULL, 'OVERDUE',
        'QC Inspection Bay', 'Used for weld and base metal thickness verification. Calibration overdue — remove from service until recalibrated.', v_admin,
        '2023-09-01 08:00:00', NOW());
    END IF;

    -- Measuring Tape 50m (Unit 1) — OVERDUE (due Jan 2026)
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-MT-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-MT-001', 'Measuring Tape 50m — Stabila BM 50', 'TOOL', 'AVAILABLE',
        'Stabila', 'BM 50', 'ST-50-2021-001',
        1, '12 months',
        '2025-01-08 09:00:00', '2026-01-08 09:00:00', NULL, NULL, 'OVERDUE',
        'Production Bay 1', 'Primary layout tape. Calibration overdue — verify accuracy against reference tape before use.', v_admin,
        '2021-09-01 08:00:00', NOW());
    END IF;

    -- Digital Vernier Caliper — DUE SOON (due Jun 2026)
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-VC-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-VC-001', 'Digital Vernier Caliper 300mm — Mitutoyo 500-196-30', 'TOOL', 'AVAILABLE',
        'Mitutoyo', '500-196-30', 'MIT-VC-2024-00312',
        1, '12 months',
        '2025-06-03 10:00:00', '2026-06-03 10:00:00', 'CERT-VC-2025-003', 'Saudi Metrology Institute', 'CURRENT',
        'QC Inspection Bay', 'Main dimensional inspection caliper. Due for annual calibration in June 2026.', v_admin,
        '2022-06-01 08:00:00', NOW());
    END IF;

    -- Weld Fillet Gauge Set — DUE SOON (due Jun 2026)
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-WG-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-WG-001', 'Weld Fillet Gauge Set (AWS) — 7-piece', 'TOOL', 'AVAILABLE',
        'GAL Gage', 'AWS 7-piece set', 'GAL-WG-SET-019',
        1, '12 months',
        '2025-06-18 10:00:00', '2026-06-18 10:00:00', 'CERT-WG-2025-006', 'Bureau Veritas', 'CURRENT',
        'QC Inspection Bay', 'Used for weld fillet size and throat measurement per AWS D1.1.', v_admin,
        '2022-06-01 08:00:00', NOW());
    END IF;

    -- Torque Wrench 50–250 Nm — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-TW-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-TW-001', 'Torque Wrench 50–250 Nm — Norbar 13021', 'TOOL', 'AVAILABLE',
        'Norbar', '13021 (1R)', 'NB-TW250-2023-1102',
        1, '12 months',
        '2025-09-15 10:00:00', '2026-09-15 10:00:00', 'CERT-TW-2025-009', 'SGS Arabia', 'CURRENT',
        'Production Bay 2 — Bolting Station', 'Used for HSFG bolt tightening per BS EN 14399. Annual calibration.', v_admin,
        '2023-09-01 08:00:00', NOW());
    END IF;

    -- Torque Wrench 140–700 Nm — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-TW-002') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-TW-002', 'Torque Wrench 140–700 Nm — Norbar 13079', 'TOOL', 'AVAILABLE',
        'Norbar', '13079 (TTi 3/4")', 'NB-TW700-2023-1103',
        1, '12 months',
        '2025-09-15 10:00:00', '2026-09-15 10:00:00', 'CERT-TW-2025-010', 'SGS Arabia', 'CURRENT',
        'Production Bay 2 — Bolting Station', 'Heavy-duty torque wrench for M24–M36 structural bolts.', v_admin,
        '2023-09-01 08:00:00', NOW());
    END IF;

    -- Platform Scale 300 kg — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-SC-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-SC-001', 'Platform Scale 300 kg — OHAUS T31P', 'EQUIPMENT', 'AVAILABLE',
        'OHAUS', 'T31P', 'OH-T31-2022-0449',
        1, '12 months',
        '2026-03-10 10:00:00', '2027-03-10 10:00:00', 'CERT-SC-2026-003', 'Saudi Metrology Institute', 'CURRENT',
        'Warehouse — Goods Receipt Area', 'Used for incoming material weight verification. Most recent calibration March 2026.', v_admin,
        '2022-03-01 08:00:00', NOW());
    END IF;

    -- Digital Level / Angle Meter — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-LV-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-LV-001', 'Digital Angle Level — Bosch GIM 60 L', 'EQUIPMENT', 'AVAILABLE',
        'Bosch', 'GIM 60 L Professional', 'BSH-GIM-2023-0088',
        1, '24 months',
        '2024-11-20 10:00:00', '2026-11-20 10:00:00', 'CERT-LV-2024-011', 'Bureau Veritas', 'CURRENT',
        'QC Inspection Bay', 'Used for plumb and level checks of fabricated assemblies. 24-month calibration interval.', v_admin,
        '2023-11-01 08:00:00', NOW());
    END IF;

    -- Laser Distance Meter — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-LDM-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-LDM-001', 'Laser Distance Meter — Leica DISTO D510', 'EQUIPMENT', 'AVAILABLE',
        'Leica Geosystems', 'DISTO D510', 'LC-D510-2023-1198',
        1, '12 months',
        '2025-12-08 10:00:00', '2026-12-08 10:00:00', 'CERT-LDM-2025-012', 'SGS Arabia', 'CURRENT',
        'QC Inspection Bay', 'Range measurement tool for span and camber verification. ±1mm accuracy.', v_admin,
        '2023-12-01 08:00:00', NOW());
    END IF;

    -- Measuring Tape 50m (Unit 2) — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-MT-002') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-MT-002', 'Measuring Tape 50m — Stabila BM 50', 'TOOL', 'AVAILABLE',
        'Stabila', 'BM 50', 'ST-50-2022-002',
        1, '12 months',
        '2025-07-15 10:00:00', '2026-07-15 10:00:00', 'CERT-MT-2025-007', 'Saudi Metrology Institute', 'CURRENT',
        'Production Bay 3', 'Secondary layout tape. Reserve unit when CAL-MT-001 is out for calibration.', v_admin,
        '2022-07-01 08:00:00', NOW());
    END IF;

    -- Digital Infrared Thermometer — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-DT-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-DT-001', 'Digital Infrared Thermometer — Fluke 62 MAX+', 'EQUIPMENT', 'AVAILABLE',
        'Fluke', '62 MAX+', 'FLK-62MAX-2023-0771',
        1, '12 months',
        '2025-10-20 10:00:00', '2026-10-20 10:00:00', 'CERT-DT-2025-010', 'Bureau Veritas', 'CURRENT',
        'Production Bay 1 — Welding Area', 'Preheat temperature verification per WPS requirements (range -30 to +650°C).', v_admin,
        '2023-10-01 08:00:00', NOW());
    END IF;

    -- Pressure Gauge 0–400 bar — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-PG-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-PG-001', 'Pressure Gauge 0–400 bar — WIKA 232.50', 'EQUIPMENT', 'AVAILABLE',
        'WIKA', '232.50', 'WK-232-2024-0218',
        1, '12 months',
        '2025-08-05 10:00:00', '2026-08-05 10:00:00', 'CERT-PG-2025-008', 'SGS Arabia', 'CURRENT',
        'Hydraulic Press Area', 'Used for hydraulic press system monitoring and testing. Glycerine-filled.', v_admin,
        '2024-08-01 08:00:00', NOW());
    END IF;

    -- 4-Gas Detector — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-GD-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-GD-001', '4-Gas Detector (O2/CO/H2S/LEL) — MSA Altair 4X', 'EQUIPMENT', 'AVAILABLE',
        'MSA Safety', 'Altair 4X', 'MSA-4X-2024-00547',
        1, '12 months',
        '2025-07-22 10:00:00', '2026-07-22 10:00:00', 'CERT-GD-2025-007', 'Bureau Veritas', 'CURRENT',
        'HSE Equipment Store', 'Mandatory for confined space entry. Annual calibration and bump-test daily before use.', v_admin,
        '2024-07-01 08:00:00', NOW());
    END IF;

    -- Portable Hardness Tester — CURRENT (24-month interval)
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-HT-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-HT-001', 'Portable Hardness Tester — Equotip Bambino 2', 'EQUIPMENT', 'AVAILABLE',
        'Proceq (Screening Eagle)', 'Equotip Bambino 2', 'PQ-BAMB-2024-0118',
        1, '24 months',
        '2025-06-10 10:00:00', '2027-06-10 10:00:00', 'CERT-HT-2025-006', 'SGS Arabia', 'CURRENT',
        'QC Inspection Bay', 'Rebound hardness tester for post-weld HAZ verification. Leeb method.', v_admin,
        '2024-06-01 08:00:00', NOW());
    END IF;

    -- Anemometer — CURRENT (24-month interval)
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-AN-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-AN-001', 'Anemometer — Kestrel 3000', 'EQUIPMENT', 'AVAILABLE',
        'Kestrel Instruments', '3000', 'KS-3000-2023-0341',
        1, '24 months',
        '2025-05-14 10:00:00', '2027-05-14 10:00:00', 'CERT-AN-2025-005', 'Saudi Metrology Institute', 'CURRENT',
        'HSE Equipment Store', 'Wind speed measurement for outdoor crane lift operations. Lifts suspended above 15 m/s.', v_admin,
        '2023-05-01 08:00:00', NOW());
    END IF;

    -- Load Cell 10T — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-LC-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-LC-001', 'Load Cell 10T — HBM S9', 'EQUIPMENT', 'AVAILABLE',
        'HBM (Hottinger Brüel & Kjær)', 'S9', 'HBM-S9-2023-0048',
        1, '12 months',
        '2025-12-15 10:00:00', '2026-12-15 10:00:00', 'CERT-LC-2025-012', 'Bureau Veritas', 'CURRENT',
        'QC Inspection Bay — Load Testing Frame', 'Used for crane and lifting gear proof-load testing. Traceable to national standard.', v_admin,
        '2023-12-01 08:00:00', NOW());
    END IF;

    -- Wire Rope Diameter Gauge — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-WRG-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-WRG-001', 'Wire Rope Diameter Gauge — Silverline 5-in-1', 'TOOL', 'AVAILABLE',
        'Silverline Tools', '5-in-1 Wire Rope Gauge', 'SL-WRG-2024-0019',
        1, '24 months',
        '2024-11-05 10:00:00', '2026-11-05 10:00:00', 'CERT-WRG-2024-011', 'SGS Arabia', 'CURRENT',
        'HSE Equipment Store', 'Diameter measurement for pre-use crane sling and wire rope inspection.', v_admin,
        '2024-11-01 08:00:00', NOW());
    END IF;

    -- Coating DFT Gauge — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-DFT-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-DFT-001', 'Coating Thickness Gauge (DFT) — Elcometer 456', 'EQUIPMENT', 'AVAILABLE',
        'Elcometer', '456 B', 'EL-456B-2024-0299',
        1, '12 months',
        '2025-08-20 10:00:00', '2026-08-20 10:00:00', 'CERT-DFT-2025-008', 'Bureau Veritas', 'CURRENT',
        'Painting Bay', 'Dry film thickness measurement per SSPC-PA-2. Ferrous/non-ferrous dual mode.', v_admin,
        '2024-08-01 08:00:00', NOW());
    END IF;

    -- Portable Roughness Tester (Surface Profile) — CURRENT
    IF NOT EXISTS (SELECT 1 FROM Asset WHERE assetCode COLLATE utf8mb4_0900_ai_ci = 'CAL-RT-001') THEN
      INSERT INTO Asset (id, assetCode, name, category, status,
        make, model, serialNumber,
        calibrationRequired, calibrationFrequency,
        lastCalibratedAt, calibrationDueAt, calibrationCertRef, calibrationBody, calibrationStatus,
        location, notes, createdById, createdAt, updatedAt)
      VALUES (UUID(), 'CAL-RT-001', 'Surface Profile Gauge — Elcometer 224', 'EQUIPMENT', 'AVAILABLE',
        'Elcometer', '224', 'EL-224-2024-0112',
        1, '12 months',
        '2025-08-20 10:00:00', '2026-08-20 10:00:00', 'CERT-RT-2025-008', 'Bureau Veritas', 'CURRENT',
        'Painting Bay', 'Blast profile depth measurement per ISO 8503. Rz range 0–500 µm.', v_admin,
        '2024-08-01 08:00:00', NOW());
    END IF;

  END IF;
END$$
DELIMITER ;
CALL seed_calibration_assets_v243();
DROP PROCEDURE IF EXISTS seed_calibration_assets_v243;
