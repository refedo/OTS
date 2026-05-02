-- Sprint 22.7.0 Demo Seed Data
-- PEB / Steel fabrication industry sample records
-- Uses INSERT IGNORE (no string comparisons) to avoid collation conflicts.
-- Idempotent: UNIQUE index violations are silently skipped.
-- Tables without UNIQUE keys (HrTrainingNeed, ProjectKickoffChecklist) are
-- guarded by a COUNT(*) = 0 check inside minimal stored procedures.

SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci';

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. QMS Process List (FRM-002 / FRM-004)  — UNIQUE: processNumber
-- ──────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, updatedAt) VALUES
(UUID(), 'PROC-001', 'Design & Engineering', 'Chief Engineer', 'CORE',
 'Client requirements, project brief, architectural drawings, load specifications',
 'Structural design drawings, BOM, welding maps, erection drawings',
 'Drawing accuracy rate >= 98%, design revision rate < 5%, on-time drawing release >= 95%',
 'ISO 9001 §8.3', 'ACTIVE', NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, updatedAt) VALUES
(UUID(), 'PROC-002', 'Material Procurement & Receiving', 'Supply Chain Manager', 'CORE',
 'Approved BOM, purchase orders, supplier mill certificates',
 'Received and inspected steel coils, plates, sections, and fasteners',
 'On-time delivery rate >= 90%, material rejection rate < 2%, certificate compliance 100%',
 'ISO 9001 §8.4', 'ACTIVE', NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, notes, updatedAt) VALUES
(UUID(), 'PROC-003', 'Steel Fabrication — Primary Members', 'Production Manager', 'CORE',
 'Approved drawings, cut lists, material from stores',
 'Welded I-beams, columns, rafters, base plates',
 'First-pass inspection rate >= 92%, welding NCR rate < 1.5%, production efficiency >= 85%',
 'ISO 9001 §8.5.1', 'ACTIVE',
 'CNC plasma/saw cutting, press brake operations, SAW and GMAW welding of primary frame members.',
 NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, updatedAt) VALUES
(UUID(), 'PROC-004', 'Steel Fabrication — Secondary Members', 'Production Manager', 'CORE',
 'Cold-formed sections, eave struts, girts, purlins from roll-forming line',
 'Cut-to-length Cee and Zed purlins, eave beams, roof/wall girts',
 'Dimensional tolerance <= +/-3 mm, throughput >= 50 ton/day',
 'ISO 9001 §8.5.1', 'ACTIVE', NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, updatedAt) VALUES
(UUID(), 'PROC-005', 'Shot Blasting & Surface Preparation', 'QC Manager', 'CORE',
 'Fabricated structural members',
 'Sa 2.5 blasted surfaces ready for primer application',
 'Surface profile Ra 40-70 um, cleanliness Sa 2.5 per ISO 8501-1, 100% inspection',
 'ISO 9001 §8.5.1', 'ACTIVE', NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, notes, updatedAt) VALUES
(UUID(), 'PROC-006', 'Coating & Painting', 'QC Inspector', 'CORE',
 'Blasted members, approved paint system specification',
 'Coated members with DFT per project spec (epoxy primer + alkyd topcoat)',
 'DFT acceptance rate >= 95%, adhesion test pass rate >= 98%, holiday detection 0%',
 'ISO 9001 §8.5.1', 'ACTIVE',
 'Typical system: Jotun Barrier 80 epoxy primer (75 um DFT) + Hardtop AX alkyd topcoat (50 um DFT).',
 NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, updatedAt) VALUES
(UUID(), 'PROC-007', 'Quality Control & Inspection', 'QC Manager', 'SUPPORT',
 'Fabricated members, approved ITP, WPS, drawing package',
 'Inspection records (MIR, WIR, DIR, DFT), NCR reports, release notes',
 'ITP compliance 100%, NCR closure within 7 days, first-time release rate >= 90%',
 'ISO 9001 §9.2', 'ACTIVE', NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, updatedAt) VALUES
(UUID(), 'PROC-008', 'Logistics & Dispatch', 'Logistics Supervisor', 'CORE',
 'Released fabricated members, packing list, erection sequence',
 'Dispatched loads with shipping marks, packing list, and load verification',
 'On-time dispatch rate >= 93%, load damage rate < 0.5%, documentation accuracy 100%',
 'ISO 9001 §8.5.4', 'ACTIVE', NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, updatedAt) VALUES
(UUID(), 'PROC-009', 'Corrective & Preventive Action (CAPA)', 'IMS Manager', 'SUPPORT',
 'NCRs, audit findings, customer complaints, risk assessments',
 'Root cause analysis, corrective actions, effectiveness verification',
 'CAPA closure rate >= 90% on time, recurrence rate < 5%',
 'ISO 9001 §10.2', 'ACTIVE', NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, updatedAt) VALUES
(UUID(), 'PROC-010', 'HR & Competence Management', 'HR Manager', 'SUPPORT',
 'Organizational chart, job profiles, training needs analysis',
 'Competence matrix, training records, welder qualifications',
 'Training completion rate >= 90%, WQT validity 100%',
 'ISO 9001 §7.2', 'ACTIVE', NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, notes, updatedAt) VALUES
(UUID(), 'PROC-011', 'Outsourced NDT Inspection', 'QC Manager', 'OUTSOURCED',
 'Completed welded joints per ITP hold/witness points',
 'UT/RT/PT/MT reports by certified third-party NDT provider',
 'Report turnaround <= 2 working days, finding disposition within 5 days',
 'ISO 9001 §8.4', 'ACTIVE',
 'UT and RT contracted to Level II/III certified NDT company for heavy weld joints (t > 25 mm).',
 NOW());

INSERT IGNORE INTO ImsQmsProcess (id, processNumber, name, processOwner, processType, inputs, outputs, kpis, isoClause, status, notes, updatedAt) VALUES
(UUID(), 'PROC-012', 'In-House Roll Forming — Cladding Panels', 'Production Manager', 'IN_HOUSE',
 'PPGI coils (Zinc 275 g/m2, 0.5-0.7 mm), approved profiles',
 'Standing seam roof panels, trapezoidal wall cladding panels, accessories',
 'Profile dimensional accuracy +/-1.5 mm, scratch/dent rate < 0.3%, daily output >= 2000 lm',
 'ISO 9001 §8.5.1', 'ACTIVE',
 'Dedicated roll-forming lines for IBR, trapezoid, and standing-seam panel profiles for PEB cladding.',
 NOW());

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Approved Supplier List (FRM-003)  — UNIQUE: supplierCode
-- ──────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-001', 'Al-Rajhi Steel Industries', 'Hot-Rolled Structural Steel',
 'HR plates ASTM A36, HR sections IPE/HEA/HEB, ASTM A572 Gr.50',
 'APPROVED', '2025-01-15', '2026-01-14', '2025-01-10', 365, 'A',
 'Main structural steel supplier. ISO 9001 certified mill. EN 10025-2 and ASTM certified.', NOW());

INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-002', 'Saudi Steel Pipe Company (SSP)', 'Hollow Sections / SHS / RHS',
 'Square hollow sections SHS, rectangular RHS, circular CHS per AS 1163 and EN 10219',
 'APPROVED', '2025-02-01', '2026-01-31', '2025-01-28', 365, 'A',
 'Approved for all hollow section requirements. Yield strength >= 355 MPa verified by mill certificate.', NOW());

INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-003', 'Jotun Saudi Arabia LLC', 'Coating & Paint Systems',
 'Barrier 80 epoxy primer, Hardtop AX alkyd topcoat, Interzone 954 advanced protective',
 'APPROVED', '2024-11-01', '2025-10-31', '2024-10-25', 365, 'A',
 'Preferred coating supplier for all structural and architectural coating systems.', NOW());

INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-004', 'Hilti Arabia Co. Ltd.', 'Fasteners & Anchor Systems',
 'HRC anchor bolts, self-drilling fasteners, fire-stopping systems',
 'APPROVED', '2025-03-01', '2026-02-28', '2025-02-20', 365, 'A',
 'Approved for structural anchor bolts, Gr.8.8 bolts, and all roofing/cladding fasteners.', NOW());

INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-005', 'Colorcoat Steel (PPGI Distributor)', 'PPGI Coils — Cladding',
 'Pre-painted galvanized coils: Zinc 275 g/m2, 0.45-0.8 mm, various colors',
 'APPROVED', '2025-01-20', '2026-01-19', '2025-01-15', 365, 'A',
 'PPGI coils for roll-forming of roof/wall cladding panels. Color fastness per ISO 11341.', NOW());

INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-006', 'Lincoln Electric (MENA)', 'Welding Consumables',
 'SMAW electrodes E7018, GMAW wire ER70S-6, SAW flux-wire combinations',
 'APPROVED', '2025-04-01', '2026-03-31', '2025-03-25', 365, 'A',
 'AWS A5.1, A5.18 certified consumables. Hydrogen controlled for thick plate joints.', NOW());

INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-007', 'TUV Rheinland Middle East', 'Third-Party Inspection / NDT',
 'UT, RT, PT, MT inspection services; Level II and Level III certified personnel',
 'APPROVED', '2025-02-15', '2026-02-14', '2025-02-10', 365, 'A',
 'Approved TPI for client-mandated hold/witness points. ASNT SNT-TC-1A qualified inspectors.', NOW());

INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-008', 'Al Moammar Information Systems', 'IT & ERP Systems',
 'ERP support and customization, CAD/CAM software licensing',
 'CONDITIONAL', '2025-05-01', '2025-10-31', '2025-04-28', 180, 'B',
 'Approved on conditional basis pending completion of SLA review. Re-audit required at 6 months.', NOW());

INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-009', 'Gulf Cranes & Hoisting WLL', 'Outsourced Lifting & Erection',
 'Mobile crane supply, rigging, and steel structure erection services',
 'APPROVED', '2024-12-01', '2025-11-30', '2024-11-28', 365, 'A',
 'Approved subcontractor for erection services. LEEA certified riggers, BS 7121 compliant lifts.', NOW());

INSERT IGNORE INTO ScApprovedSupplier (id, supplierCode, name, category, scopeOfApproval, approvalStatus, approvalDate, expiryDate, lastAuditDate, auditFrequencyDays, rating, notes, updatedAt) VALUES
(UUID(), 'SUP-010', 'Zahid Tractor — Abrasive Supplies', 'Abrasives & Consumables',
 'Abrasive discs, cutting discs, grinding wheels for fabrication',
 'EXPIRED', '2024-01-01', '2025-01-01', '2023-12-20', 365, 'B',
 'Approval expired — renewal in progress. Awaiting updated ISO 9001 certificate from supplier.', NOW());

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Training Needs Analysis (FRM-005)  — no UNIQUE key; guard by COUNT = 0
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_tna;
DELIMITER $$
CREATE PROCEDURE seed_tna()
BEGIN
  IF (SELECT COUNT(*) FROM HrTrainingNeed) = 0 THEN
    INSERT INTO HrTrainingNeed (id, employeeName, department, roleTitle, competencyGap, requiredTraining, priority, targetDate, status, notes, updatedAt) VALUES
    (UUID(), 'Ahmed Al-Rashidi', 'QC', 'Senior QC Inspector',
     'No current RT Level II certification; performing UT only',
     'ASNT RT Level II Certification Course',
     'HIGH', '2025-09-30', 'OPEN', 'Client projects now require RT Level II on-site sign-off.', NOW()),
    (UUID(), 'Mohammed Al-Qahtani', 'Production', 'Welder — SAW',
     'Qualified for SMAW only; SAW process required for heavy I-beam production',
     'SAW Welder Qualification Test (WQT) — positions 1G/2G, plates >= 20 mm',
     'HIGH', '2025-08-15', 'IN_PROGRESS', 'Enrolled in pre-qualification practice with Production Supervisor.', NOW()),
    (UUID(), 'Khalid Al-Dossari', 'IMS', 'IMS Coordinator',
     'No ISO 14001:2015 auditor training; currently ISO 9001 internal auditor only',
     'ISO 14001:2015 Internal Auditor Training (2 days)',
     'MEDIUM', '2025-10-31', 'OPEN', 'Prepare for combined IMS surveillance audit scheduled Q4 2025.', NOW()),
    (UUID(), 'Faisal Al-Ghamdi', 'Production', 'Roll-Forming Operator',
     'Unfamiliar with new standing-seam profile tooling introduced in Q1 2025',
     'Manufacturer tooling changeover and parameter setup (1 day on-site)',
     'MEDIUM', '2025-07-31', 'CLOSED', 'Completed June 2025. Operator signed competency sign-off sheet.', NOW()),
    (UUID(), 'Abdullah Al-Harbi', 'Safety', 'HSE Officer',
     'NEBOSH IGC expired; needs renewal. Current provisional OSH knowledge only',
     'NEBOSH International General Certificate (IGC) Renewal',
     'HIGH', '2025-09-01', 'IN_PROGRESS', 'Enrolled in NEBOSH online revision course. Examination booked for August 2025.', NOW()),
    (UUID(), 'Omar Al-Otaibi', 'Design', 'Structural Engineer',
     'No experience with MBMA Low Rise Building Systems Manual (latest edition)',
     'MBMA Metal Building Systems Design — 3-day technical workshop',
     'LOW', '2025-12-31', 'OPEN', 'Scheduled for MBMA workshop in Q4 2025 when AISC hosts regional session.', NOW()),
    (UUID(), 'Saleh Al-Mutairi', 'Supply Chain', 'Procurement Officer',
     'Lacks formal training on supplier auditing per ISO 9001 §8.4 requirements',
     'Supplier Auditing & Evaluation Workshop — 2-day course',
     'MEDIUM', '2025-11-30', 'OPEN', 'Required to take lead on next supplier audit cycle as per Q4 audit plan.', NOW()),
    (UUID(), 'Nasser Al-Shahrani', 'Production', 'CNC Operator',
     'Proficient on Messer CNC plasma only; not trained on Ficep drilling/sawing line',
     'Ficep steel processing line operator training — 3 days on-site',
     'MEDIUM', '2025-08-31', 'OPEN', 'New Ficep line commissioned Q2 2025. Training to be arranged with OEM representative.', NOW());
  END IF;
END$$
DELIMITER ;
CALL seed_tna();
DROP PROCEDURE IF EXISTS seed_tna;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Incidents / Near-Miss (FRM-024)  — UNIQUE: incidentNumber
-- ──────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO ImsIncident (id, incidentNumber, title, incidentType, incidentDate, location, description, immediateAction, rootCause, correctiveAction, preventiveAction, severity, status, closedAt, updatedAt) VALUES
(UUID(), 'INC-2025-0001', 'Fall from elevated work platform — fabrication bay',
 'INCIDENT', '2025-01-12 09:30:00', 'Fabrication Bay 2 — Column Line C',
 'Welder lost footing on elevated platform (4.2 m) while repositioning. Safety harness arrested the fall. Minor bruising on right hand. No lost time.',
 'Work stopped. First aid administered. Platform access restricted pending safety review.',
 'Platform non-slip tape worn out. Welder not using 100% tie-off rule at all times.',
 'All platforms inspected and anti-slip surfaces renewed. 100% tie-off SOP enforced with supervisor accountability.',
 'Monthly platform inspection checklist introduced. Toolbox talk on fall prevention delivered to all fab bay staff.',
 'MEDIUM', 'CLOSED', '2025-01-26', NOW());

INSERT IGNORE INTO ImsIncident (id, incidentNumber, title, incidentType, incidentDate, location, description, immediateAction, rootCause, correctiveAction, preventiveAction, severity, status, closedAt, updatedAt) VALUES
(UUID(), 'INC-2025-0002', 'Near-miss: overhead crane hook swing close to worker',
 'NEAR_MISS', '2025-02-03 13:15:00', 'Bay 1 — Gantry Crane GC-01 travel zone',
 'Rigger working below crane travel zone was not alerted when crane operator commenced travel. Hook swung within 0.5 m of rigger head. No contact.',
 'Crane operations halted. Area evacuated. Incident reported to HSE immediately.',
 'Rigger not in designated safe standing area. Communication between rigger and crane operator inadequate.',
 'Banksman/Rigger communication protocol reinforced. Yellow safe-standing zones repainted on floor.',
 'LED warning siren fitted to GC-01 travel activation. Crane safety TBT delivered to all riggers and operators.',
 'HIGH', 'CLOSED', '2025-02-17', NOW());

INSERT IGNORE INTO ImsIncident (id, incidentNumber, title, incidentType, incidentDate, location, description, immediateAction, rootCause, correctiveAction, preventiveAction, severity, status, closedAt, updatedAt) VALUES
(UUID(), 'INC-2025-0003', 'First aid: grinding disc fragment eye injury',
 'FIRST_AID', '2025-03-18 11:00:00', 'Secondary Fabrication Area — Cutting Station',
 'Metal fragment from cut-off disc entered operator left eye during steel cutting. Safety glasses worn but side shields absent. Minor corneal scratch treated on-site.',
 'Eye wash station used immediately. Occupational nurse treatment provided. Operator released same day.',
 'Standard safety glasses used instead of full wraparound eye protection specified in the task risk assessment.',
 'Full wraparound goggles issued to all grinding/cutting operators as mandatory PPE. Supervisor spot-checks introduced.',
 'PPE compliance added to weekly HSE inspection checklist.',
 'LOW', 'CLOSED', '2025-03-25', NOW());

INSERT IGNORE INTO ImsIncident (id, incidentNumber, title, incidentType, incidentDate, location, description, immediateAction, rootCause, correctiveAction, preventiveAction, severity, status, closedAt, updatedAt) VALUES
(UUID(), 'INC-2025-0004', 'Near-miss: hot metal weld spatter ignites cardboard packaging',
 'NEAR_MISS', '2025-04-07 14:30:00', 'Assembly Bay 3 — near dispatch door',
 'Weld spatter from MIG welding travelled approx 3 m and ignited cardboard used to protect finished panels nearby. Quickly extinguished with CO2 extinguisher. No structural fire.',
 'Fire extinguished. Welding stopped. Area inspected. No damage to panels.',
 'Combustible material (cardboard) stored within 5 m of hot work area contrary to permit requirements.',
 'Hot work exclusion zone extended to 8 m for MIG/MAG operations. Permit-to-Work signage updated.',
 'Pre-job hot work checklist revised to include combustible material clearance verification.',
 'MEDIUM', 'CLOSED', '2025-04-21', NOW());

INSERT IGNORE INTO ImsIncident (id, incidentNumber, title, incidentType, incidentDate, location, description, immediateAction, rootCause, correctiveAction, preventiveAction, severity, status, updatedAt) VALUES
(UUID(), 'INC-2025-0005', 'Dangerous occurrence: structural jig collapse during assembly',
 'DANGEROUS_OCCURRENCE', '2025-05-15 08:45:00', 'Fabrication Bay 1 — Primary Frame Jig Station',
 'Fabrication jig for 50-tonne rafter assembly partially collapsed when a base-plate weld connection failed. No personnel injured — area was cleared for shift change. Significant equipment damage.',
 'Area cordoned off. Engineering review of all fabrication jigs initiated immediately. Production halted in Bay 1.',
 'Jig base-plate weld defect (undercut and lack of fusion) not detected during previous inspection. Jig had not been re-certified after modification.',
 'All fabrication jigs inspected and re-certified. Jig modification procedure updated to require QC sign-off before return to service.',
 'Annual jig inspection program formalized. NDT inspection of all jig welds (t > 10 mm) added to maintenance plan.',
 'CRITICAL', 'UNDER_INVESTIGATION', NOW());

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Emergency Drills (FRM-025)  — UNIQUE: drillNumber
-- ──────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO ImsEmergencyDrill (id, drillNumber, drillType, scheduledDate, conductedDate, location, participantCount, objectives, findings, correctiveActions, status, notes, updatedAt) VALUES
(UUID(), 'DRILL-2025-0001', 'FIRE_EVACUATION', '2025-01-20', '2025-01-20', 'Full Facility — all bays + offices', 147,
 'Test fire evacuation route efficiency; verify muster point accountability; measure full evacuation time against 5-minute target',
 'Evacuation completed in 6:42 min (over target). Two blocked emergency exits identified in Bay 3. 3 employees did not proceed to muster point.',
 'Emergency exits in Bay 3 cleared of obstructions. Floor markings repainted. All employees re-briefed on muster point procedure.',
 'COMPLETED', 'Client safety representative witnessed the drill as part of project HSE requirements.', NOW());

INSERT IGNORE INTO ImsEmergencyDrill (id, drillNumber, drillType, scheduledDate, conductedDate, location, participantCount, objectives, findings, correctiveActions, status, notes, updatedAt) VALUES
(UUID(), 'DRILL-2025-0002', 'FIRST_AID', '2025-02-12', '2025-02-12', 'Fabrication Bay 2 — First Aid Station', 18,
 'Test response time for simulated fall from height scenario; verify first aid kit contents; assess trained first aider competency',
 'Response time 3:45 min — within 5-minute target. First aid kit found to have expired burn dressings. First aider performed CPR correctly.',
 'First aid kits audited across all 6 stations. Expired items replaced. Monthly kit inspection schedule introduced.',
 'COMPLETED', 'Conducted by OSHA-certified first aid trainer engaged for quarterly competence check.', NOW());

INSERT IGNORE INTO ImsEmergencyDrill (id, drillNumber, drillType, scheduledDate, conductedDate, location, participantCount, objectives, status, notes, updatedAt) VALUES
(UUID(), 'DRILL-2025-0003', 'FIRE_EVACUATION', '2025-07-15', '2025-07-15', 'Fabrication Bays 1 & 2 + Offices', 120,
 'Evaluate improvements from January drill; verify blocked exit corrective actions; measure evacuation time against revised 5-minute target',
 'PLANNED', 'Mid-year drill as per annual HSE calendar. Night shift drill to be conducted separately in September.', NOW());

INSERT IGNORE INTO ImsEmergencyDrill (id, drillNumber, drillType, scheduledDate, conductedDate, location, participantCount, objectives, findings, correctiveActions, status, notes, updatedAt) VALUES
(UUID(), 'DRILL-2025-0004', 'CHEMICAL_SPILL', '2025-03-25', '2025-03-25', 'Coating & Paint Shop — Hazmat Storage Area', 22,
 'Test hazmat spill response procedure for solvent-based paint release; verify PPE availability and donning time; test spill kit effectiveness',
 'Spill kit deployed within 2 minutes. All responders used correct PPE. MSDS data sheets not readily accessible — found in office rather than at point of use.',
 'MSDS sheets laminated and posted at each solvent storage location. Spill kit locations reviewed and additional kit added near thinners storage.',
 'COMPLETED', 'Scenario: 20-litre solvent spill from tipping drum. NFPA 30 Flammable Liquids Code compliance verified.', NOW());

INSERT IGNORE INTO ImsEmergencyDrill (id, drillNumber, drillType, scheduledDate, conductedDate, location, participantCount, objectives, findings, correctiveActions, status, notes, updatedAt) VALUES
(UUID(), 'DRILL-2025-0005', 'GENERAL', '2025-09-10', '2025-09-10', 'Night Shift — all fabrication bays', 62,
 'Test night shift emergency response; assess night shift supervisors emergency coordinator role; verify lighting adequacy on evacuation routes',
 'Evacuation completed in 4:55 min — within target. Emergency lighting in corridor between Bays 1-2 found faulty (2 units failed).',
 'Emergency lighting units replaced. All emergency lighting tested monthly as part of electrical PM program.',
 'COMPLETED', 'Unannounced drill to test genuine response. HSE Manager and Plant Director observed.', NOW());

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Toolbox Talks (FRM-026)  — UNIQUE: talkNumber
-- ──────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, updatedAt) VALUES
(UUID(), 'TBT-2025-0001', 'Safe Handling of Structural Steel Members — Slinging & Rigging',
 '2025-01-06', 'Bay 1 Pre-Shift Briefing Area', 24, 20,
 'Rigging angles and sling capacity reduction factors; inspection of slings before use; four-point vs two-point lifts for long columns and rafters; tag-line usage; exclusion zones during lifts. Reference: BS 7121-1, Hexa-ISP-010.',
 'All riggers to inspect personal sling sets and report any defects by end of week.',
 'COMPLETED', NOW());

INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, updatedAt) VALUES
(UUID(), 'TBT-2025-0002', 'Welding Fume Control — Ventilation & RPE in Confined Spaces',
 '2025-01-13', 'Fabrication Bay 2 — Welding Stations', 18, 25,
 'Welding fume hazards (hexavalent chromium, manganese for stainless/alloy steel); LEV effectiveness; correct use of half-mask FFP3 respirators; COSHH assessment review. Demo of correct LEV positioning for MIG butt welds.',
 'LEV units inspected for blockages. Welder who reported RPE discomfort to be fitted for alternative respirator.',
 'COMPLETED', NOW());

INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, notes, updatedAt) VALUES
(UUID(), 'TBT-2025-0003', 'Working at Height — 100% Tie-Off Rule & Harness Inspection',
 '2025-01-27', 'All Bay Muster Points', 41, 20,
 'Reviewed INC-2025-0001 (fall arrest incident). 100% tie-off rule above 1.8 m with no exceptions. Harness pre-use inspection checklist: webbing, stitching, buckles, D-rings, lanyards. Correct anchor point selection for rafter assembly work.',
 'All fall-arrest harnesses to be tagged with next inspection date. Supervisor daily sign-off for WAH tasks introduced.',
 'COMPLETED', 'Delivered in response to INC-2025-0001. Attendance mandatory for all fabrication bay staff.', NOW());

INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, notes, updatedAt) VALUES
(UUID(), 'TBT-2025-0004', 'Hot Work Permit & Fire Watch Responsibilities',
 '2025-02-10', 'Assembly Bay 3 — Pre-Shift', 19, 15,
 'Hot work permit conditions review; 8 m combustible-free zone for MIG/MAG; fire watch responsibilities during and 30 min post-completion; fire extinguisher type selection (CO2 vs dry powder); NFPA 51B Hot Work Program requirements.',
 'Hot work permit forms updated with expanded combustible clearance zone. All supervisors to sign updated form before approving any hot work.',
 'COMPLETED', 'Delivered in response to INC-2025-0004 (weld spatter fire near-miss).', NOW());

INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, updatedAt) VALUES
(UUID(), 'TBT-2025-0005', 'Manual Handling of Steel Components — RAMS Review',
 '2025-03-03', 'Secondary Fabrication Area', 28, 20,
 'Risk of musculoskeletal injury from manual handling of steel angles, channels, and purlins. Manual handling assessment: weight limits (25 kg single handler, 50 kg team lift). Safe team lift coordination calls. Mechanical aids (trolleys, roller conveyors) and when they must be used.',
 'Material flow review to identify top 5 manual handling bottlenecks for engineering controls.',
 'COMPLETED', NOW());

INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, notes, updatedAt) VALUES
(UUID(), 'TBT-2025-0006', 'Crane Exclusion Zones & Banksman Communication Signals',
 '2025-03-17', 'Bay 1 — GC-01 Area', 22, 25,
 'Reviewed INC-2025-0002 (near-miss: overhead crane). Standard hand signals for all crane operations (ASME B30.2). Banksman role, duties, and qualifications. No-go zones during overhead travel. LED siren alert system on GC-01 demonstration.',
 'All crane operators and riggers to sign acknowledgment of updated exclusion zone procedure.',
 'COMPLETED', 'Delivered in response to INC-2025-0002. Guest presenter: Crane Safety Officer from Gulf Cranes & Hoisting.', NOW());

INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, updatedAt) VALUES
(UUID(), 'TBT-2025-0007', 'Shot Blast & PPE — Hearing & Respiratory Protection',
 '2025-04-07', 'Shot Blast Bay — Pre-Shift', 12, 20,
 'Noise levels in shot blast bay measured at 98 dB(A) — mandatory hearing protection (33 dB SNR earmuffs). Dust control: pressurised airline suit + powered air-purifying respirator (PAPR). Shot blast media (S330 steel shot) hazards. Emergency stop procedures.',
 'PAPR units to be serviced and filter cartridges replaced. Noise survey to be repeated after install of acoustic damping panels.',
 'COMPLETED', NOW());

INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, notes, updatedAt) VALUES
(UUID(), 'TBT-2025-0008', 'Pre-Shift Safety Brief: Rafter Assembly Campaign — Project HSG-277',
 '2025-05-05', 'Bay 1 — Project 277 Work Zone', 35, 15,
 'Job-specific safety briefing for 48 m clear-span primary rafter assembly. Hazards: heavy lifts (up to 8.5 tonnes per rafter), temporary stability during assembly, weld preheating requirements for 35 mm flanges. Emergency stop authority delegated to all workers.',
 'Pre-heat temperature monitoring log to be completed every 4 hours during thick plate welding.',
 'COMPLETED', 'Client HSE representative attended per project HSE plan.', NOW());

INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, notes, updatedAt) VALUES
(UUID(), 'TBT-2025-0009', 'Summer Heat Stress Prevention Program',
 '2025-06-02', 'All Bays + Yard — Staggered Briefings', 156, 20,
 'Saudi Labour Law summer working hours restrictions (June-September outdoor work ban 12:00-15:00). Heat illness recognition: heat cramps, heat exhaustion, heat stroke and first response. Hydration targets: 500 ml per 20 min of outdoor work. Shade structures and cooling zone locations.',
 'Outdoor work schedule modified to avoid 12:00-15:00 window. Cool water dispensers installed at yard entry points.',
 'COMPLETED', 'Mandatory annual briefing per SASO and MOL regulations.', NOW());

INSERT IGNORE INTO ImsToolboxTalk (id, talkNumber, topic, conductedDate, location, attendeeCount, durationMinutes, content, followUpActions, status, updatedAt) VALUES
(UUID(), 'TBT-2025-0010', 'Compressed Gas Cylinder Safety — Storage, Handling & Connections',
 '2025-06-16', 'Gas Store & Welding Area', 20, 20,
 'Correct cylinder storage (upright, chained, segregated flammable/oxidant), colour coding (red = acetylene, green = oxygen, grey = argon/CO2). Regulator inspection and connection procedures. Cylinder valve protection caps. Flashback arrestor requirement on all oxy-acetylene sets.',
 'Cylinder storage area to be audited by HSE Officer. New flashback arrestors ordered for 3 sets found without.',
 'COMPLETED', NOW());

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Welder Qualifications (FRM-017)  — UNIQUE: wqtNumber
-- ──────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO QcWelderQualification (id, wqtNumber, welderName, welderCode, weldingProcess, position, baseMaterial, fillMaterial, thickness, testDate, testLocation, visualResult, bendTestResult, radiographyResult, overallResult, qualificationRange, certificationNumber, validFrom, expiryDate, renewalDate, notes, updatedAt) VALUES
(UUID(), 'WQT-2024-0001', 'Mohammed Al-Qahtani', 'WLR-041', 'SMAW', '3G',
 'ASTM A36 / S275JR Carbon Steel', 'Lincoln E7018 (H4R)', '6-32 mm',
 '2024-03-10', 'QC Lab — Hexa Steel', 'PASS', 'PASS', 'NA', 'QUALIFIED',
 'SMAW positions 1G to 4G; t = 3-32 mm; carbon steel groups 1 & 2',
 'WQT-HXS-2024-041-SMAW', '2024-03-10', '2026-03-09', '2026-01-15',
 'WPS-001 qualified. Heavy plate SMAW specialist for column and base plate welding.', NOW());

INSERT IGNORE INTO QcWelderQualification (id, wqtNumber, welderName, welderCode, weldingProcess, position, baseMaterial, fillMaterial, thickness, testDate, testLocation, visualResult, bendTestResult, radiographyResult, overallResult, qualificationRange, certificationNumber, validFrom, expiryDate, renewalDate, notes, updatedAt) VALUES
(UUID(), 'WQT-2024-0002', 'Ahmed Al-Zahrani', 'WLR-019', 'GMAW', '2G',
 'ASTM A36 Carbon Steel, t = 6-20 mm', 'Lincoln ER70S-6 wire 1.2 mm', '6-20 mm',
 '2024-04-18', 'QC Lab — Hexa Steel', 'PASS', 'PASS', 'NA', 'QUALIFIED',
 'GMAW positions 1G, 2G; t = 3-20 mm; carbon steel',
 'WQT-HXS-2024-019-GMAW', '2024-04-18', '2026-04-17', '2026-02-01',
 'Qualified for MIG/MAG welding of secondary framing connections and bracket welding.', NOW());

INSERT IGNORE INTO QcWelderQualification (id, wqtNumber, welderName, welderCode, weldingProcess, position, baseMaterial, fillMaterial, thickness, diameter, testDate, testLocation, visualResult, bendTestResult, radiographyResult, overallResult, qualificationRange, certificationNumber, validFrom, expiryDate, renewalDate, notes, updatedAt) VALUES
(UUID(), 'WQT-2024-0003', 'Sulaiman Al-Dosari', 'WLR-055', 'GTAW', '6G',
 'ASTM A53 Gr.B Carbon Steel Pipe, DN80-DN200', 'Lincoln ER70S-2 wire', '4-12 mm', '80-200 mm',
 '2024-05-22', 'QC Lab — Hexa Steel', 'PASS', 'PASS', 'PASS', 'QUALIFIED',
 'GTAW pipe all positions (6G covers all); carbon steel; OD 48-508 mm',
 'WQT-HXS-2024-055-GTAW', '2024-05-22', '2026-05-21', '2026-03-01',
 '6G position — highest pipe qualification. Used for utility connections in PEB industrial buildings.', NOW());

INSERT IGNORE INTO QcWelderQualification (id, wqtNumber, welderName, welderCode, weldingProcess, position, baseMaterial, fillMaterial, thickness, testDate, testLocation, visualResult, bendTestResult, radiographyResult, overallResult, qualificationRange, certificationNumber, validFrom, expiryDate, renewalDate, notes, updatedAt) VALUES
(UUID(), 'WQT-2024-0004', 'Jaber Al-Khaldi', 'WLR-007', 'SAW', '1G',
 'ASTM A36 / A572 Gr.50 Plates >= 16 mm', 'Lincoln 761 flux + LA-71 wire', '16-60 mm',
 '2024-06-15', 'QC Lab — Hexa Steel', 'PASS', 'PASS', 'PASS', 'QUALIFIED',
 'SAW position 1G; t = 8 mm to unlimited; carbon steel groups 1 & 2',
 'WQT-HXS-2024-007-SAW', '2024-06-15', '2026-06-14', '2026-04-01',
 'Primary SAW specialist for I-beam flange-to-web fillet welds on PEB rafters and columns (up to 60 mm flanges).', NOW());

INSERT IGNORE INTO QcWelderQualification (id, wqtNumber, welderName, welderCode, weldingProcess, position, baseMaterial, fillMaterial, thickness, testDate, testLocation, visualResult, bendTestResult, radiographyResult, overallResult, qualificationRange, certificationNumber, validFrom, expiryDate, renewalDate, notes, updatedAt) VALUES
(UUID(), 'WQT-2024-0005', 'Tariq Al-Asmari', 'WLR-033', 'FCAW', '3G',
 'ASTM A36 Carbon Steel Plate', 'Lincoln Outershield 71M wire 1.6 mm', '6-25 mm',
 '2024-07-08', 'QC Lab — Hexa Steel', 'PASS', 'PASS', 'NA', 'QUALIFIED',
 'FCAW positions 1G to 4G; t = 3-25 mm; carbon steel',
 'WQT-HXS-2024-033-FCAW', '2024-07-08', '2026-07-07', '2026-05-01',
 'FCAW specialist for high-productivity welding on mezzanine floor connections and bracing.', NOW());

INSERT IGNORE INTO QcWelderQualification (id, wqtNumber, welderName, welderCode, weldingProcess, position, baseMaterial, fillMaterial, thickness, testDate, testLocation, visualResult, bendTestResult, radiographyResult, overallResult, qualificationRange, certificationNumber, validFrom, expiryDate, renewalDate, notes, updatedAt) VALUES
(UUID(), 'WQT-2023-0012', 'Rakan Al-Shehri', 'WLR-062', 'SMAW', '2G',
 'ASTM A36 Carbon Steel', 'Lincoln E7018', '6-25 mm',
 '2023-09-05', 'QC Lab — Hexa Steel', 'PASS', 'PASS', 'NA', 'QUALIFIED',
 'SMAW positions 1G, 2G; t = 3-25 mm; carbon steel',
 'WQT-HXS-2023-062-SMAW', '2023-09-05', '2025-09-04', '2025-07-01',
 'Qualification due for renewal September 2025. Welder to be scheduled for continuity test.', NOW());

INSERT IGNORE INTO QcWelderQualification (id, wqtNumber, welderName, welderCode, weldingProcess, position, baseMaterial, fillMaterial, thickness, testDate, testLocation, visualResult, bendTestResult, radiographyResult, overallResult, notes, updatedAt) VALUES
(UUID(), 'WQT-2025-0001', 'Hamad Al-Enezi', 'WLR-071', 'GMAW', '3G',
 'ASTM A36 Carbon Steel, 6-20 mm', 'Lincoln ER70S-6 wire 1.2 mm', '6-20 mm',
 '2025-01-28', 'QC Lab — Hexa Steel', 'PASS', 'FAIL', 'NA', 'NOT_QUALIFIED',
 'Bend test failure — root bend showed lack of fusion at 6 mm land. Welder to re-practice root pass technique and retest within 30 days.', NOW());

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. Coating Inspections (FRM-022)  — UNIQUE: inspectionNumber
-- INSERT IGNORE handles duplicates via the unique index; no WHERE NOT EXISTS needed
-- ──────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO QcCoatingInspection (id, inspectionNumber, projectId, coatingSystem, coatLayer, surfacePrep, ambientTemp, relativeHumidity, dewPoint, nominalDft, minDft, maxDft, readings, averageDft, result, inspectionDate, witnessedBy, remarks, updatedAt)
SELECT UUID(), 'COAT-2025-0001', p.id, 'Jotun Barrier 80 Epoxy Primer', 'PRIMER',
 'Sa 2.5 per ISO 8501-1, profile Rz 50-75 um', 28.0, 52.0, 18.0, 75, 60, 120,
 '[{"point":"F1","value":78},{"point":"F2","value":82},{"point":"F3","value":74},{"point":"F4","value":79},{"point":"F5","value":83}]',
 79.20, 'ACCEPTED', '2025-02-14', 'Client Rep — SABIC Inspection',
 'All 5 readings within specified range. Sa 2.5 confirmed by replica tape. Application temperature and humidity within spec.', NOW()
FROM (SELECT id FROM Project LIMIT 1) p;

INSERT IGNORE INTO QcCoatingInspection (id, inspectionNumber, projectId, coatingSystem, coatLayer, surfacePrep, ambientTemp, relativeHumidity, dewPoint, nominalDft, minDft, maxDft, readings, averageDft, result, inspectionDate, witnessedBy, remarks, updatedAt)
SELECT UUID(), 'COAT-2025-0002', p.id, 'Jotun Hardtop AX Alkyd Topcoat (RAL 9002)', 'TOP_COAT',
 'N/A — over cured primer coat', 30.0, 48.0, 17.5, 50, 40, 80,
 '[{"point":"F1","value":52},{"point":"F2","value":48},{"point":"F3","value":55},{"point":"F4","value":46},{"point":"F5","value":53}]',
 50.80, 'ACCEPTED', '2025-02-21', 'Client Rep — SABIC Inspection',
 'RAL 9002 (off-white) colour confirmed against standard. DFT readings satisfactory. Overcoat time interval complied.', NOW()
FROM (SELECT id FROM Project LIMIT 1) p;

INSERT IGNORE INTO QcCoatingInspection (id, inspectionNumber, projectId, coatingSystem, coatLayer, surfacePrep, ambientTemp, relativeHumidity, dewPoint, nominalDft, minDft, maxDft, readings, averageDft, result, inspectionDate, witnessedBy, remarks, updatedAt)
SELECT UUID(), 'COAT-2025-0003', p.id, 'Jotun Barrier 80 Epoxy Primer', 'PRIMER',
 'Sa 2.5 per ISO 8501-1', 32.5, 61.0, 24.0, 75, 60, 120,
 '[{"point":"C1","value":58},{"point":"C2","value":55},{"point":"C3","value":62},{"point":"C4","value":57},{"point":"C5","value":59}]',
 58.20, 'REJECTED', '2025-03-05', 'Internal QC',
 'REJECTED — all 5 DFT readings below 60 um minimum. Rework required: re-blast and re-apply primer.', NOW()
FROM (SELECT id FROM Project LIMIT 1) p;

INSERT IGNORE INTO QcCoatingInspection (id, inspectionNumber, projectId, coatingSystem, coatLayer, surfacePrep, ambientTemp, relativeHumidity, dewPoint, nominalDft, minDft, maxDft, readings, averageDft, result, inspectionDate, witnessedBy, remarks, updatedAt)
SELECT UUID(), 'COAT-2025-0004', p.id, 'Jotun Barrier 80 Epoxy Primer — Rework (after COAT-2025-0003 rejection)', 'PRIMER',
 'Sa 2.5 re-blast after rejection', 27.0, 44.0, 14.0, 75, 60, 120,
 '[{"point":"C1","value":77},{"point":"C2","value":80},{"point":"C3","value":74},{"point":"C4","value":78},{"point":"C5","value":81}]',
 78.00, 'ACCEPTED', '2025-03-12', 'Client Rep — SABIC Inspection',
 'Rework accepted. All readings within range. Sa 2.5 re-confirmed. Steel temperature 3 C above dew point (compliant).', NOW()
FROM (SELECT id FROM Project LIMIT 1) p;

INSERT IGNORE INTO QcCoatingInspection (id, inspectionNumber, projectId, coatingSystem, coatLayer, surfacePrep, ambientTemp, relativeHumidity, dewPoint, nominalDft, minDft, maxDft, readings, averageDft, result, inspectionDate, witnessedBy, remarks, updatedAt)
SELECT UUID(), 'COAT-2025-0005', p.id, 'Interzone 954 — Epoxy Intermediate Coat (industrial zone specification)', 'MID_COAT',
 'N/A — applied over cured Barrier 80', 29.0, 50.0, 18.5, 125, 100, 175,
 '[{"point":"P1","value":128},{"point":"P2","value":132},{"point":"P3","value":119},{"point":"P4","value":141},{"point":"P5","value":124}]',
 128.80, 'ACCEPTED', '2025-04-02', 'TUV Rheinland — Third Party',
 'Jotun Interzone 954 high-build epoxy for corrosivity category C3 specification. DFT satisfactory.', NOW()
FROM (SELECT id FROM Project LIMIT 1) p;

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. Project Kickoff Checklists (FRM-016)
-- Plain INSERT ... SELECT outside any procedure (SET NAMES applies here).
-- No unique key on this table — safe to re-run on a fresh DB; idempotent enough
-- for demo data since the tables start empty after migration.
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO ProjectKickoffChecklist (id, projectId, meetingDate, location, attendees, agendaItems, deliverablesDiscussed, openItems, nextSteps, status, signedOffAt, notes, updatedAt)
SELECT UUID(), p.id, '2025-01-08 09:00:00', 'Hexa Steel HQ — Conference Room A',
  'Ahmed Al-Rashidi (QC Manager), Khalid Al-Dossari (IMS Coordinator), Nasser Al-Shahrani (Production Manager), Client: Mr. Saud Al-Ghamdi (Project Director), Consultant: Mr. James O Brien (Project Manager)',
  '1. Project scope and drawing package review\n2. Engineering deliverable schedule\n3. Material procurement status and lead times\n4. Quality plan and ITP review\n5. HSE plan and site safety requirements\n6. Communication protocols and submittals register',
  'Structural design drawings IFC: 28 sheets approved. BOM finalized. WPS-001 to WPS-004 submitted for client approval. ITP submitted — client review within 7 days.',
  'OPEN-001: Client to confirm final column anchor bolt layout by 15-Jan\nOPEN-002: Engineer to resubmit Drawing HSG-277-S-007 (connection detail revision)',
  'Weekly progress meetings every Monday 09:00\nFirst steel delivery scheduled 20-Jan\nProduction kickoff for primary frames: 22-Jan',
  'SIGNED_OFF', '2025-01-09 14:00:00',
  'Client expressed satisfaction with preparation. Fast-track schedule confirmed: delivery in 16 weeks.',
  NOW()
FROM (SELECT id FROM Project LIMIT 1) p
WHERE (SELECT COUNT(*) FROM ProjectKickoffChecklist) = 0;

INSERT INTO ProjectKickoffChecklist (id, projectId, meetingDate, location, attendees, agendaItems, deliverablesDiscussed, openItems, nextSteps, status, notes, updatedAt)
SELECT UUID(), p.id, '2025-02-17 10:00:00', 'Hexa Steel HQ — Board Room',
  'Nasser Al-Shahrani (Production Manager), Mohammed Al-Qahtani (QC Inspector), Client: Eng. Walid Al-Hamdan (Project Engineer), Consultant: Ms. Sarah Mitchell (Structural Lead)',
  '1. Drawing package status\n2. ITP and quality requirements\n3. Delivery schedule\n4. Safety induction requirements\n5. Open items from pre-contract stage',
  'IFC drawings: 18 sheets — under review. WPS-001, WPS-002 submitted. ITP draft: under client review.',
  'OPEN-001: Confirm hot-dip galvanizing requirement for secondary members\nOPEN-002: Client to provide anchor bolt setting drawings',
  'ITP approval expected within 5 working days\nProcurement of primary structural steel to commence immediately',
  'DRAFT', 'Meeting minutes to be signed off by client by 20-Feb.',
  NOW()
FROM (SELECT id FROM Project LIMIT 1 OFFSET 1) p
WHERE (SELECT COUNT(*) FROM ProjectKickoffChecklist) < 2;
