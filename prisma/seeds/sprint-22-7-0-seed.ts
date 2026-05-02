import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export async function seedSprint2270() {
  console.log('🌱 Seeding Sprint 22.7.0 — PEB/Steel Industry data...');

  // Resolve a real user for createdById / responsibleId
  const adminUser = await prisma.user.findFirst({ select: { id: true } });
  const createdById = adminUser?.id ?? null;

  // ─── 1. QMS Process List (FRM-002 / FRM-004) ────────────────────────────────
  console.log('  → QMS Process List...');
  const qmsProcesses = [
    { processNumber: 'PROC-001', name: 'Design & Engineering', processOwner: 'Chief Engineer', processType: 'CORE', inputs: 'Client requirements, project brief, architectural drawings, load specifications', outputs: 'Structural design drawings, BOM, welding maps, erection drawings', kpis: 'Drawing accuracy rate ≥ 98%, design revision rate < 5%, on-time drawing release ≥ 95%', isoClause: 'ISO 9001 §8.3', status: 'ACTIVE', notes: 'Covers all PEB structural design including primary frames, secondary members, and connections.' },
    { processNumber: 'PROC-002', name: 'Material Procurement & Receiving', processOwner: 'Supply Chain Manager', processType: 'CORE', inputs: 'Approved BOM, purchase orders, supplier mill certificates', outputs: 'Received and inspected steel coils, plates, sections, and fasteners', kpis: 'On-time delivery rate ≥ 90%, material rejection rate < 2%, certificate compliance 100%', isoClause: 'ISO 9001 §8.4', status: 'ACTIVE', notes: 'All incoming HR coils, PPGI, plates, and structural sections per ASTM A36, A572, and EN S275/S355.' },
    { processNumber: 'PROC-003', name: 'Steel Fabrication — Primary Members', processOwner: 'Production Manager', processType: 'CORE', inputs: 'Approved drawings, cut lists, material from stores', outputs: 'Welded I-beams, columns, rafters, base plates', kpis: 'First-pass inspection rate ≥ 92%, welding NCR rate < 1.5%, production efficiency ≥ 85%', isoClause: 'ISO 9001 §8.5.1', status: 'ACTIVE', notes: 'CNC plasma/saw cutting, press brake operations, submerged arc and GMAW welding of primary frame members.' },
    { processNumber: 'PROC-004', name: 'Steel Fabrication — Secondary Members', processOwner: 'Production Manager', processType: 'CORE', inputs: 'Cold-formed sections, eave struts, girts, purlins from roll-forming line', outputs: 'Cut-to-length Cee and Zed purlins, eave beams, roof/wall girts', kpis: 'Dimensional tolerance ≤ ±3 mm, throughput ≥ 50 ton/day', isoClause: 'ISO 9001 §8.5.1', status: 'ACTIVE', notes: 'Roll-forming line for secondary framing components used in PEB cladding support.' },
    { processNumber: 'PROC-005', name: 'Shot Blasting & Surface Preparation', processOwner: 'QC Manager', processType: 'CORE', inputs: 'Fabricated structural members', outputs: 'Sa 2.5 blasted surfaces ready for primer application', kpis: 'Surface profile Ra 40–70 µm, cleanliness Sa 2.5 per ISO 8501-1, 100% inspection', isoClause: 'ISO 9001 §8.5.1', status: 'ACTIVE', notes: 'Automated shot blast chamber for Sa 2.5 preparation per SSPC-SP10/NACE 2 requirements.' },
    { processNumber: 'PROC-006', name: 'Coating & Painting', processOwner: 'QC Inspector', processType: 'CORE', inputs: 'Blasted members, approved paint system specification', outputs: 'Coated members with DFT per project spec (typically epoxy primer + alkyd topcoat)', kpis: 'DFT acceptance rate ≥ 95%, adhesion test pass rate ≥ 98%, holiday detection 0%', isoClause: 'ISO 9001 §8.5.1', status: 'ACTIVE', notes: 'Typical system: Jotun Barrier 80 epoxy primer (75 µm DFT) + Hardtop AX alkyd topcoat (50 µm DFT).' },
    { processNumber: 'PROC-007', name: 'Quality Control & Inspection', processOwner: 'QC Manager', processType: 'SUPPORT', inputs: 'Fabricated members, approved ITP, WPS, drawing package', outputs: 'Inspection records (MIR, WIR, DIR, DFT), NCR reports, release notes', kpis: 'ITP compliance 100%, NCR closure within 7 days, first-time release rate ≥ 90%', isoClause: 'ISO 9001 §9.2', status: 'ACTIVE', notes: 'Covers visual, dimensional, weld inspection (VT, PT, UT, RT), and coating inspection per project ITP.' },
    { processNumber: 'PROC-008', name: 'Logistics & Dispatch', processOwner: 'Logistics Supervisor', processType: 'CORE', inputs: 'Released fabricated members, packing list, erection sequence', outputs: 'Dispatched loads with shipping marks, packing list, and load verification', kpis: 'On-time dispatch rate ≥ 93%, load damage rate < 0.5%, documentation accuracy 100%', isoClause: 'ISO 9001 §8.5.4', status: 'ACTIVE', notes: 'All PEB shipments are sequenced per erection sequence to minimize on-site sorting time.' },
    { processNumber: 'PROC-009', name: 'Corrective & Preventive Action (CAPA)', processOwner: 'IMS Manager', processType: 'SUPPORT', inputs: 'NCRs, audit findings, customer complaints, risk assessments', outputs: 'Root cause analysis, corrective actions, effectiveness verification', kpis: 'CAPA closure rate ≥ 90% on time, recurrence rate < 5%', isoClause: 'ISO 9001 §10.2', status: 'ACTIVE', notes: 'Applies to all quality, safety, and environmental non-conformances.' },
    { processNumber: 'PROC-010', name: 'HR & Competence Management', processOwner: 'HR Manager', processType: 'SUPPORT', inputs: 'Organizational chart, job profiles, training needs analysis', outputs: 'Competence matrix, training records, welder qualifications', kpis: 'Training completion rate ≥ 90%, WQT validity 100%', isoClause: 'ISO 9001 §7.2', status: 'ACTIVE', notes: 'Manages welder qualification, inspector certification, and operator competence records.' },
    { processNumber: 'PROC-011', name: 'Outsourced NDT Inspection', processOwner: 'QC Manager', processType: 'OUTSOURCED', inputs: 'Completed welded joints per ITP hold/witness points', outputs: 'UT/RT/PT/MT reports by certified third-party NDT provider', kpis: 'Report turnaround ≤ 2 working days, finding disposition within 5 days', isoClause: 'ISO 9001 §8.4', status: 'ACTIVE', notes: 'UT and RT contracted to Level II/III certified NDT company for heavy weld joints (t > 25 mm).' },
    { processNumber: 'PROC-012', name: 'In-House Roll Forming — Cladding Panels', processOwner: 'Production Manager', processType: 'IN_HOUSE', inputs: 'PPGI coils (Zinc 275 g/m², 0.5–0.7 mm), approved profiles', outputs: 'Standing seam roof panels, trapezoidal wall cladding panels, accessories', kpis: 'Profile dimensional accuracy ±1.5 mm, scratch/dent rate < 0.3%, daily output per line ≥ 2000 lm', isoClause: 'ISO 9001 §8.5.1', status: 'ACTIVE', notes: 'Dedicated roll-forming lines for IBR, trapezoid, and standing-seam panel profiles for PEB cladding.' },
  ];

  for (const p of qmsProcesses) {
    await prisma.imsQmsProcess.upsert({
      where: { processNumber: p.processNumber },
      update: { ...p, updatedAt: new Date() },
      create: { id: randomUUID(), ...p, updatedAt: new Date(), createdById },
    });
  }
  console.log(`  ✅ ${qmsProcesses.length} QMS processes`);

  // ─── 2. Approved Supplier List (FRM-003) ────────────────────────────────────
  console.log('  → Approved Supplier List...');
  const suppliers = [
    { supplierCode: 'SUP-001', name: 'Al-Rajhi Steel Industries', category: 'Hot-Rolled Structural Steel', scopeOfApproval: 'HR plates ASTM A36, HR sections IPE/HEA/HEB, ASTM A572 Gr.50', approvalStatus: 'APPROVED', approvalDate: new Date('2025-01-15'), expiryDate: new Date('2026-01-14'), lastAuditDate: new Date('2025-01-10'), auditFrequencyDays: 365, rating: 'A', notes: 'Main structural steel supplier. ISO 9001 certified mill. EN 10025-2 and ASTM certified.' },
    { supplierCode: 'SUP-002', name: 'Saudi Steel Pipe Company (SSP)', category: 'Hollow Sections / SHS / RHS', scopeOfApproval: 'Square hollow sections SHS, rectangular RHS, circular CHS per AS 1163 and EN 10219', approvalStatus: 'APPROVED', approvalDate: new Date('2025-02-01'), expiryDate: new Date('2026-01-31'), lastAuditDate: new Date('2025-01-28'), auditFrequencyDays: 365, rating: 'A', notes: 'Approved for all hollow section requirements. Yield strength ≥ 355 MPa verified by mill certificate.' },
    { supplierCode: 'SUP-003', name: 'Jotun Saudi Arabia LLC', category: 'Coating & Paint Systems', scopeOfApproval: 'Barrier 80 epoxy primer, Hardtop AX alkyd topcoat, Interzone 954 advanced protective', approvalStatus: 'APPROVED', approvalDate: new Date('2024-11-01'), expiryDate: new Date('2025-10-31'), lastAuditDate: new Date('2024-10-25'), auditFrequencyDays: 365, rating: 'A', notes: 'Preferred coating supplier for all structural and architectural coating systems.' },
    { supplierCode: 'SUP-004', name: 'Hilti Arabia Co. Ltd.', category: 'Fasteners & Anchor Systems', scopeOfApproval: 'HRC anchor bolts, self-drilling fasteners, fire-stopping systems', approvalStatus: 'APPROVED', approvalDate: new Date('2025-03-01'), expiryDate: new Date('2026-02-28'), lastAuditDate: new Date('2025-02-20'), auditFrequencyDays: 365, rating: 'A', notes: 'Approved for structural anchor bolts, Gr.8.8 bolts, and all roofing/cladding fasteners.' },
    { supplierCode: 'SUP-005', name: 'Colorcoat Steel (PPGI Distributor)', category: 'PPGI Coils — Cladding', scopeOfApproval: 'Pre-painted galvanized coils: Zinc 275 g/m², 0.45–0.8 mm, various colors', approvalStatus: 'APPROVED', approvalDate: new Date('2025-01-20'), expiryDate: new Date('2026-01-19'), lastAuditDate: new Date('2025-01-15'), auditFrequencyDays: 365, rating: 'A', notes: 'PPGI coils for roll-forming of roof/wall cladding panels. Color fastness ΔE < 3 per ISO 11341.' },
    { supplierCode: 'SUP-006', name: 'Lincoln Electric (MENA)', category: 'Welding Consumables', scopeOfApproval: 'SMAW electrodes E7018, GMAW wire ER70S-6, SAW flux-wire combinations', approvalStatus: 'APPROVED', approvalDate: new Date('2025-04-01'), expiryDate: new Date('2026-03-31'), lastAuditDate: new Date('2025-03-25'), auditFrequencyDays: 365, rating: 'A', notes: 'AWS A5.1, A5.18 certified consumables. Hydrogen controlled for thick plate joints.' },
    { supplierCode: 'SUP-007', name: 'TÜV Rheinland Middle East', category: 'Third-Party Inspection / NDT', scopeOfApproval: 'UT, RT, PT, MT inspection services; Level II and Level III certified personnel', approvalStatus: 'APPROVED', approvalDate: new Date('2025-02-15'), expiryDate: new Date('2026-02-14'), lastAuditDate: new Date('2025-02-10'), auditFrequencyDays: 365, rating: 'A', notes: 'Approved TPI for client-mandated hold/witness points. ASNT SNT-TC-1A qualified inspectors.' },
    { supplierCode: 'SUP-008', name: 'Al Moammar Information Systems (AMIS)', category: 'IT & ERP Systems', scopeOfApproval: 'ERP support and customization, CAD/CAM software licensing', approvalStatus: 'CONDITIONAL', approvalDate: new Date('2025-05-01'), expiryDate: new Date('2025-10-31'), lastAuditDate: new Date('2025-04-28'), auditFrequencyDays: 180, rating: 'B', notes: 'Approved on conditional basis pending completion of SLA review. Re-audit required at 6 months.' },
    { supplierCode: 'SUP-009', name: 'Gulf Cranes & Hoisting WLL', category: 'Outsourced Lifting & Erection', scopeOfApproval: 'Mobile crane supply, rigging, and steel structure erection services', approvalStatus: 'APPROVED', approvalDate: new Date('2024-12-01'), expiryDate: new Date('2025-11-30'), lastAuditDate: new Date('2024-11-28'), auditFrequencyDays: 365, rating: 'A', notes: 'Approved subcontractor for erection services. LEEA certified riggers, BS 7121 compliant lifts.' },
    { supplierCode: 'SUP-010', name: 'Zahid Tractor — Angle Grinder Supplies', category: 'Abrasives & Consumables', scopeOfApproval: 'Abrasive discs, cutting discs, grinding wheels for fabrication', approvalStatus: 'EXPIRED', approvalDate: new Date('2024-01-01'), expiryDate: new Date('2025-01-01'), lastAuditDate: new Date('2023-12-20'), auditFrequencyDays: 365, rating: 'B', notes: 'Approval expired — renewal in progress. Awaiting updated ISO 9001 certificate from supplier.' },
  ];

  for (const s of suppliers) {
    await prisma.scApprovedSupplier.upsert({
      where: { supplierCode: s.supplierCode },
      update: { ...s, updatedAt: new Date() },
      create: { id: randomUUID(), ...s, updatedAt: new Date(), createdById },
    });
  }
  console.log(`  ✅ ${suppliers.length} approved suppliers`);

  // ─── 3. Training Needs Analysis (FRM-005) ────────────────────────────────────
  console.log('  → Training Needs Analysis...');
  const tnaRecords = [
    { employeeName: 'Ahmed Al-Rashidi', department: 'QC', roleTitle: 'Senior QC Inspector', competencyGap: 'No current RT Level II certification; performing UT only', requiredTraining: 'ASNT RT Level II Certification Course', priority: 'HIGH', targetDate: new Date('2025-09-30'), status: 'OPEN', notes: 'Client projects now require RT Level II on-site sign-off.' },
    { employeeName: 'Mohammed Al-Qahtani', department: 'Production', roleTitle: 'Welder — SAW', competencyGap: 'Qualified for SMAW only; SAW process required for heavy I-beam production', requiredTraining: 'SAW Welder Qualification Test (WQT) — positions 1G/2G, plates ≥ 20 mm', priority: 'HIGH', targetDate: new Date('2025-08-15'), status: 'IN_PROGRESS', notes: 'Enrolled in pre-qualification practice with Production Supervisor.' },
    { employeeName: 'Khalid Al-Dossari', department: 'IMS', roleTitle: 'IMS Coordinator', competencyGap: 'No ISO 14001:2015 auditor training; currently ISO 9001 internal auditor only', requiredTraining: 'ISO 14001:2015 Internal Auditor Training (2 days)', priority: 'MEDIUM', targetDate: new Date('2025-10-31'), status: 'OPEN', notes: 'Prepare for combined IMS surveillance audit scheduled Q4 2025.' },
    { employeeName: 'Faisal Al-Ghamdi', department: 'Production', roleTitle: 'Roll-Forming Operator', competencyGap: 'Unfamiliar with new standing-seam profile tooling introduced in Q1 2025', requiredTraining: 'Manufacturer tooling changeover and parameter setup (1 day on-site)', priority: 'MEDIUM', targetDate: new Date('2025-07-31'), status: 'CLOSED', notes: 'Completed June 2025. Operator signed competency sign-off sheet.' },
    { employeeName: 'Abdullah Al-Harbi', department: 'Safety', roleTitle: 'HSE Officer', competencyGap: 'NEBOSH IGC expired; needs renewal. Current provisional OSH knowledge only', requiredTraining: 'NEBOSH International General Certificate (IGC) Renewal', priority: 'HIGH', targetDate: new Date('2025-09-01'), status: 'IN_PROGRESS', notes: 'Enrolled in NEBOSH online revision course. Examination booked for August 2025.' },
    { employeeName: 'Omar Al-Otaibi', department: 'Design', roleTitle: 'Structural Engineer', competencyGap: 'No experience with MBMA Low Rise Building Systems Manual (latest edition)', requiredTraining: 'MBMA Metal Building Systems Design — 3-day technical workshop', priority: 'LOW', targetDate: new Date('2025-12-31'), status: 'OPEN', notes: 'Scheduled for MBMA workshop in Q4 2025 when AISC hosts regional session.' },
    { employeeName: 'Saleh Al-Mutairi', department: 'Supply Chain', roleTitle: 'Procurement Officer', competencyGap: 'Lacks formal training on supplier auditing per ISO 9001 §8.4 requirements', requiredTraining: 'Supplier Auditing & Evaluation Workshop — 2-day course', priority: 'MEDIUM', targetDate: new Date('2025-11-30'), status: 'OPEN', notes: 'Required to take lead on next supplier audit cycle as per Q4 audit plan.' },
    { employeeName: 'Nasser Al-Shahrani', department: 'Production', roleTitle: 'CNC Operator', competencyGap: 'Proficient on Messer CNC plasma only; not trained on Ficep drilling/sawing line', requiredTraining: 'Ficep steel processing line operator training — 3 days on-site', priority: 'MEDIUM', targetDate: new Date('2025-08-31'), status: 'OPEN', notes: 'New Ficep line commissioned Q2 2025. Training to be arranged with OEM representative.' },
  ];

  for (const t of tnaRecords) {
    const existing = await prisma.hrTrainingNeed.findFirst({ where: { employeeName: t.employeeName, requiredTraining: t.requiredTraining } });
    if (!existing) {
      await prisma.hrTrainingNeed.create({ data: { id: randomUUID(), ...t, updatedAt: new Date(), createdById } });
    }
  }
  console.log(`  ✅ ${tnaRecords.length} TNA records`);

  // ─── 4. Incident / Near-Miss Reports (FRM-024) ──────────────────────────────
  console.log('  → Incidents...');
  const incidents = [
    { incidentNumber: 'INC-2025-0001', title: 'Fall from elevated work platform — fabrication bay', incidentType: 'INCIDENT', incidentDate: new Date('2025-01-12T09:30:00'), location: 'Fabrication Bay 2 — Column Line C', description: 'Welder lost footing on elevated platform (4.2 m) while repositioning. Safety harness arrested the fall. Minor bruising on right hand. No lost time.', immediateAction: 'Work stopped. First aid administered. Platform access restricted pending safety review.', rootCause: 'Platform non-slip tape worn out. Welder not using 100% tie-off rule at all times.', correctiveAction: 'All platforms inspected and anti-slip surfaces renewed. 100% tie-off SOP enforced with supervisor accountability.', preventiveAction: 'Monthly platform inspection checklist introduced. Toolbox talk on fall prevention delivered to all fab bay staff.', severity: 'MEDIUM', status: 'CLOSED', closedAt: new Date('2025-01-26') },
    { incidentNumber: 'INC-2025-0002', title: 'Near-miss: overhead crane hook swings close to worker', incidentType: 'NEAR_MISS', incidentDate: new Date('2025-02-03T13:15:00'), location: 'Bay 1 — Gantry Crane GC-01 travel zone', description: 'Rigger working below crane travel zone was not alerted when crane operator commenced travel. Hook swung within 0.5 m of rigger\'s head. No contact.', immediateAction: 'Crane operations halted. Area evacuated. Incident reported to HSE immediately.', rootCause: 'Rigger not in designated safe standing area. Communication between rigger and crane operator inadequate.', correctiveAction: 'Banksman/Rigger communication protocol reinforced. Yellow safe-standing zones repainted on floor.', preventiveAction: 'LED warning siren fitted to GC-01 travel activation. Crane safety TBT delivered to all riggers and operators.', severity: 'HIGH', status: 'CLOSED', closedAt: new Date('2025-02-17') },
    { incidentNumber: 'INC-2025-0003', title: 'First aid: grinding disc fragment eye injury', incidentType: 'FIRST_AID', incidentDate: new Date('2025-03-18T11:00:00'), location: 'Secondary Fabrication Area — Cutting Station', description: 'Metal fragment from cut-off disc entered operator\'s left eye during steel cutting. Safety glasses worn but side shields absent. Minor corneal scratch treated on-site.', immediateAction: 'Eye wash station used immediately. Occupational nurse treatment provided. Operator released same day.', rootCause: 'Standard safety glasses used instead of full wraparound eye protection specified in the task risk assessment.', correctiveAction: 'Full wraparound goggles issued to all grinding/cutting operators as mandatory PPE. Supervisor spot-checks introduced.', preventiveAction: 'PPE compliance added to weekly HSE inspection checklist.', severity: 'LOW', status: 'CLOSED', closedAt: new Date('2025-03-25') },
    { incidentNumber: 'INC-2025-0004', title: 'Near-miss: hot metal weld spatter ignites cardboard packaging', incidentType: 'NEAR_MISS', incidentDate: new Date('2025-04-07T14:30:00'), location: 'Assembly Bay 3 — near dispatch door', description: 'Weld spatter from MIG welding travelled approx 3 m and ignited cardboard used to protect finished panels nearby. Quickly extinguished with CO2 extinguisher. No structural fire.', immediateAction: 'Fire extinguished. Welding stopped. Area inspected. No damage to panels.', rootCause: 'Combustible material (cardboard) stored within 5 m of hot work area contrary to permit requirements.', correctiveAction: 'Hot work exclusion zone extended to 8 m for MIG/MAG operations. Permit-to-Work signage updated.', preventiveAction: 'Pre-job hot work checklist revised to include combustible material clearance verification.', severity: 'MEDIUM', status: 'CLOSED', closedAt: new Date('2025-04-21') },
    { incidentNumber: 'INC-2025-0005', title: 'Dangerous occurrence: structural jig collapse during assembly', incidentType: 'DANGEROUS_OCCURRENCE', incidentDate: new Date('2025-05-15T08:45:00'), location: 'Fabrication Bay 1 — Primary Frame Jig Station', description: 'Fabrication jig for 50-tonne rafter assembly partially collapsed when a base-plate weld connection failed. No personnel injured — area was cleared for shift change. Significant equipment damage.', immediateAction: 'Area cordoned off. Engineering review of all fabrication jigs initiated immediately. Production halted in Bay 1.', rootCause: 'Jig base-plate weld defect (undercut and lack of fusion) not detected during previous inspection. Jig had not been re-certified after modification.', correctiveAction: 'All fabrication jigs inspected and re-certified. Jig modification procedure updated to require QC sign-off before return to service.', preventiveAction: 'Annual jig inspection program formalized. NDT inspection of all jig welds (t > 10 mm) added to maintenance plan.', severity: 'CRITICAL', status: 'UNDER_INVESTIGATION' },
  ];

  for (const i of incidents) {
    await prisma.imsIncident.upsert({
      where: { incidentNumber: i.incidentNumber },
      update: { ...i, updatedAt: new Date() },
      create: { id: randomUUID(), ...i, updatedAt: new Date(), createdById },
    });
  }
  console.log(`  ✅ ${incidents.length} incidents`);

  // ─── 5. Emergency Drills (FRM-025) ──────────────────────────────────────────
  console.log('  → Emergency Drills...');
  const drills = [
    { drillNumber: 'DRILL-2025-0001', drillType: 'FIRE_EVACUATION', scheduledDate: new Date('2025-01-20'), conductedDate: new Date('2025-01-20'), location: 'Full Facility — all bays + offices', participantCount: 147, objectives: 'Test fire evacuation route efficiency; verify muster point accountability; measure full evacuation time against 5-minute target', findings: 'Evacuation completed in 6:42 min (over target). Two blocked emergency exits identified in Bay 3. 3 employees did not proceed to muster point.', correctiveActions: 'Emergency exits in Bay 3 cleared of obstructions. Floor markings repainted. All employees re-briefed on muster point procedure.', status: 'COMPLETED', notes: 'Client safety representative witnessed the drill as part of project HSE requirements.' },
    { drillNumber: 'DRILL-2025-0002', drillType: 'FIRST_AID', scheduledDate: new Date('2025-02-12'), conductedDate: new Date('2025-02-12'), location: 'Fabrication Bay 2 — First Aid Station', participantCount: 18, objectives: 'Test response time for simulated fall from height scenario; verify first aid kit contents; assess trained first aider competency', findings: 'Response time 3:45 min — within 5-minute target. First aid kit found to have expired burn dressings. First aider performed CPR correctly.', correctiveActions: 'First aid kits audited across all 6 stations. Expired items replaced. Monthly kit inspection schedule introduced.', status: 'COMPLETED', notes: 'Conducted by OSHA-certified first aid trainer engaged for quarterly competence check.' },
    { drillNumber: 'DRILL-2025-0003', drillType: 'FIRE_EVACUATION', scheduledDate: new Date('2025-07-15'), conductedDate: new Date(), location: 'Fabrication Bays 1 & 2 + Offices', participantCount: 120, objectives: 'Evaluate improvements from January drill; verify blocked exit corrective actions; measure evacuation time against revised 5-minute target', findings: '', correctiveActions: '', status: 'PLANNED', notes: 'Mid-year drill as per annual HSE calendar. Night shift drill to be conducted separately in September.' },
    { drillNumber: 'DRILL-2025-0004', drillType: 'CHEMICAL_SPILL', scheduledDate: new Date('2025-03-25'), conductedDate: new Date('2025-03-25'), location: 'Coating & Paint Shop — Hazmat Storage Area', participantCount: 22, objectives: 'Test hazmat spill response procedure for solvent-based paint release; verify PPE availability and donning time; test spill kit effectiveness', findings: 'Spill kit deployed within 2 minutes. All responders used correct PPE. MSDS data sheets not readily accessible — found in office rather than at point of use.', correctiveActions: 'MSDS sheets laminated and posted at each solvent storage location. Spill kit locations reviewed and additional kit added near thinners storage.', status: 'COMPLETED', notes: 'Scenario: 20-litre solvent spill from tipping drum. NFPA 30 Flammable Liquids Code compliance verified.' },
    { drillNumber: 'DRILL-2025-0005', drillType: 'GENERAL', scheduledDate: new Date('2025-09-10'), conductedDate: new Date('2025-09-10'), location: 'Night Shift — all fabrication bays', participantCount: 62, objectives: 'Test night shift emergency response; assess night shift supervisors\' emergency coordinator role; verify lighting adequacy on evacuation routes', findings: 'Evacuation completed in 4:55 min — within target. Emergency lighting in corridor between Bays 1-2 found faulty (2 units failed).', correctiveActions: 'Emergency lighting units replaced. All emergency lighting tested monthly as part of electrical PM program.', status: 'COMPLETED', notes: 'Unannounced drill to test genuine response. HSE Manager and Plant Director observed.' },
  ];

  for (const d of drills) {
    await prisma.imsEmergencyDrill.upsert({
      where: { drillNumber: d.drillNumber },
      update: { ...d, updatedAt: new Date() },
      create: { id: randomUUID(), ...d, updatedAt: new Date(), createdById },
    });
  }
  console.log(`  ✅ ${drills.length} emergency drills`);

  // ─── 6. Toolbox Talks (FRM-026) ─────────────────────────────────────────────
  console.log('  → Toolbox Talks...');
  const talks = [
    { talkNumber: 'TBT-2025-0001', topic: 'Safe Handling of Structural Steel Members — Slinging & Rigging', conductedDate: new Date('2025-01-06'), location: 'Bay 1 Pre-Shift Briefing Area', attendeeCount: 24, durationMinutes: 20, content: 'Rigging angles and sling capacity reduction factors; inspection of slings before use; four-point vs two-point lifts for long columns and rafters; tag-line usage; exclusion zones during lifts. Reference: BS 7121-1, Hexa-ISP-010.', followUpActions: 'All riggers to inspect personal sling sets and report any defects by end of week.', status: 'COMPLETED', notes: '' },
    { talkNumber: 'TBT-2025-0002', topic: 'Welding Fume Control — Ventilation & RPE in Confined Spaces', conductedDate: new Date('2025-01-13'), location: 'Fabrication Bay 2 — Welding Stations', attendeeCount: 18, durationMinutes: 25, content: 'Welding fume hazards (hexavalent chromium, manganese for stainless/alloy steel); LEV effectiveness; correct use of half-mask FFP3 respirators; COSHH assessment review; HSE\'s WEL for welding fume. Demo of correct LEV positioning for MIG butt welds.', followUpActions: 'LEV units inspected for blockages. Welder who reported RPE discomfort to be fitted for alternative respirator.', status: 'COMPLETED', notes: '' },
    { talkNumber: 'TBT-2025-0003', topic: 'Working at Height — 100% Tie-Off Rule & Harness Inspection', conductedDate: new Date('2025-01-27'), location: 'All Bay Muster Points', attendeeCount: 41, durationMinutes: 20, content: 'Reviewed INC-2025-0001 (fall arrest incident). 100% tie-off rule above 1.8 m with no exceptions. Harness pre-use inspection checklist: webbing, stitching, buckles, D-rings, lanyards. Correct anchor point selection for rafter assembly work.', followUpActions: 'All fall-arrest harnesses to be tagged with next inspection date. Supervisor daily sign-off for WAH tasks introduced.', status: 'COMPLETED', notes: 'Delivered in response to INC-2025-0001. Attendance mandatory for all fabrication bay staff.' },
    { talkNumber: 'TBT-2025-0004', topic: 'Hot Work Permit & Fire Watch Responsibilities', conductedDate: new Date('2025-02-10'), location: 'Assembly Bay 3 — Pre-Shift', attendeeCount: 19, durationMinutes: 15, content: 'Hot work permit conditions review; 8 m combustible-free zone for MIG/MAG; fire watch responsibilities during and 30 min post-completion; fire extinguisher type selection (CO2 vs dry powder); NFPA 51B Hot Work Program requirements.', followUpActions: 'Hot work permit forms updated with expanded combustible clearance zone. All supervisors to sign updated form before approving any hot work.', status: 'COMPLETED', notes: 'Delivered in response to INC-2025-0004 (weld spatter fire near-miss).' },
    { talkNumber: 'TBT-2025-0005', topic: 'Manual Handling of Steel Components — RAMS Review', conductedDate: new Date('2025-03-03'), location: 'Secondary Fabrication Area', attendeeCount: 28, durationMinutes: 20, content: 'Risk of musculoskeletal injury from manual handling of steel angles, channels, and purlins. Manual handling assessment: weight limits (25 kg single handler, 50 kg team lift). Safe team lift coordination calls. Mechanical aids (trolleys, roller conveyors) and when they must be used. Review of RIDDOR reportable back injuries industry statistics.', followUpActions: 'Material flow review to identify top 5 manual handling bottlenecks for engineering controls.', status: 'COMPLETED', notes: '' },
    { talkNumber: 'TBT-2025-0006', topic: 'Crane Exclusion Zones & Banksman Communication Signals', conductedDate: new Date('2025-03-17'), location: 'Bay 1 — GC-01 Area', attendeeCount: 22, durationMinutes: 25, content: 'Reviewed INC-2025-0002 (near-miss: overhead crane). Standard hand signals for all crane operations (ASME B30.2). Banksman role, duties, and qualifications. No-go zones during overhead travel. LED siren alert system on GC-01 demonstration. Slinger/signaller communication chain.', followUpActions: 'All crane operators and riggers to sign acknowledgment of updated exclusion zone procedure.', status: 'COMPLETED', notes: 'Delivered in response to INC-2025-0002. Guest presenter: Crane Safety Officer from Gulf Cranes & Hoisting.' },
    { talkNumber: 'TBT-2025-0007', topic: 'Toolbox Talk: Shot Blast & PPE — Hearing & Respiratory Protection', conductedDate: new Date('2025-04-07'), location: 'Shot Blast Bay — Pre-Shift', attendeeCount: 12, durationMinutes: 20, content: 'Noise levels in shot blast bay measured at 98 dB(A) — mandatory hearing protection (33 dB SNR earmuffs). Dust control: pressurised airline suit + powered air-purifying respirator (PAPR). Shot blast media (S330 steel shot) hazards — no silica content; dust COSHH compliant. Emergency stop procedures.', followUpActions: 'PAPR units to be serviced and filter cartridges replaced. Noise survey to be repeated after install of acoustic damping panels.', status: 'COMPLETED', notes: '' },
    { talkNumber: 'TBT-2025-0008', topic: 'Pre-Shift Safety Brief: Rafter Assembly Campaign — Project HSG-277', conductedDate: new Date('2025-05-05'), location: 'Bay 1 — Project 277 Work Zone', attendeeCount: 35, durationMinutes: 15, content: 'Job-specific safety briefing for 48 m clear-span primary rafter assembly. Hazards: heavy lifts (up to 8.5 tonnes per rafter), temporary stability during assembly, weld preheating requirements for 35 mm flanges. Emergency stop authority delegated to all workers. ITP hold points review.', followUpActions: 'Pre-heat temperature monitoring log to be completed every 4 hours during thick plate welding.', status: 'COMPLETED', notes: 'Client HSE representative attended per project HSE plan.' },
    { talkNumber: 'TBT-2025-0009', topic: 'Summer Heat Stress Prevention Program', conductedDate: new Date('2025-06-02'), location: 'All Bays + Yard — Staggered Briefings', attendeeCount: 156, durationMinutes: 20, content: 'Saudi Labour Law summer working hours restrictions (June–September outdoor work ban 12:00–15:00). Heat illness recognition: heat cramps, heat exhaustion, heat stroke and first response. Hydration targets: 500 ml per 20 min of outdoor work. Shade structures and cooling zone locations. Acclimatisation period for new staff.', followUpActions: 'Outdoor work schedule modified to avoid 12:00–15:00 window. Cool water dispensers installed at yard entry points.', status: 'COMPLETED', notes: 'Mandatory annual briefing per SASO and MOL regulations.' },
    { talkNumber: 'TBT-2025-0010', topic: 'Compressed Gas Cylinder Safety — Storage, Handling & Connections', conductedDate: new Date('2025-06-16'), location: 'Gas Store & Welding Area', attendeeCount: 20, durationMinutes: 20, content: 'Correct cylinder storage (upright, chained, segregated flammable/oxidant), colour coding (red = acetylene, green = oxygen, grey = argon/CO2). Regulator inspection and connection procedures. Cylinder valve protection caps. "Flashback arrestor" requirement on all oxy-acetylene sets. Identifying leaking connections with soapy water.', followUpActions: 'Cylinder storage area to be audited by HSE Officer. New flashback arrestors ordered for 3 sets found without.', status: 'COMPLETED', notes: '' },
  ];

  for (const t of talks) {
    await prisma.imsToolboxTalk.upsert({
      where: { talkNumber: t.talkNumber },
      update: { ...t, updatedAt: new Date() },
      create: { id: randomUUID(), ...t, updatedAt: new Date(), createdById },
    });
  }
  console.log(`  ✅ ${talks.length} toolbox talks`);

  // ─── 7. Welder Qualification Records (FRM-017) ─────────────────────────────
  console.log('  → Welder Qualifications...');
  const wqts = [
    { wqtNumber: 'WQT-2024-0001', welderName: 'Mohammed Al-Qahtani', welderCode: 'WLR-041', weldingProcess: 'SMAW', position: '3G', baseMaterial: 'ASTM A36 / S275JR Carbon Steel', fillMaterial: 'Lincoln E7018 (H4R)', thickness: '6–32 mm', diameter: null, testDate: new Date('2024-03-10'), testLocation: 'QC Lab — Hexa Steel', visualResult: 'PASS', bendTestResult: 'PASS', radiographyResult: 'NA', overallResult: 'QUALIFIED', qualificationRange: 'SMAW positions 1G to 4G; t = 3–32 mm; carbon steel groups 1 & 2', certificationNumber: 'WQT-HXS-2024-041-SMAW', validFrom: new Date('2024-03-10'), expiryDate: new Date('2026-03-09'), renewalDate: new Date('2026-01-15'), notes: 'WPS-001 qualified. Heavy plate SMAW specialist for column and base plate welding.' },
    { wqtNumber: 'WQT-2024-0002', welderName: 'Ahmed Al-Zahrani', welderCode: 'WLR-019', weldingProcess: 'GMAW', position: '2G', baseMaterial: 'ASTM A36 Carbon Steel, t = 6–20 mm', fillMaterial: 'Lincoln ER70S-6 wire 1.2 mm', thickness: '6–20 mm', diameter: null, testDate: new Date('2024-04-18'), testLocation: 'QC Lab — Hexa Steel', visualResult: 'PASS', bendTestResult: 'PASS', radiographyResult: 'NA', overallResult: 'QUALIFIED', qualificationRange: 'GMAW positions 1G, 2G; t = 3–20 mm; carbon steel', certificationNumber: 'WQT-HXS-2024-019-GMAW', validFrom: new Date('2024-04-18'), expiryDate: new Date('2026-04-17'), renewalDate: new Date('2026-02-01'), notes: 'Qualified for MIG/MAG welding of secondary framing connections and bracket welding.' },
    { wqtNumber: 'WQT-2024-0003', welderName: 'Sulaiman Al-Dosari', welderCode: 'WLR-055', weldingProcess: 'GTAW', position: '6G', baseMaterial: 'ASTM A53 Gr.B Carbon Steel Pipe, DN80–DN200', fillMaterial: 'Lincoln ER70S-2 wire', thickness: '4–12 mm', diameter: '80–200 mm', testDate: new Date('2024-05-22'), testLocation: 'QC Lab — Hexa Steel', visualResult: 'PASS', bendTestResult: 'PASS', radiographyResult: 'PASS', overallResult: 'QUALIFIED', qualificationRange: 'GTAW pipe all positions (6G covers all); carbon steel; OD 48–508 mm', certificationNumber: 'WQT-HXS-2024-055-GTAW', validFrom: new Date('2024-05-22'), expiryDate: new Date('2026-05-21'), renewalDate: new Date('2026-03-01'), notes: '6G position — highest pipe qualification. Used for utility connections in PEB industrial buildings.' },
    { wqtNumber: 'WQT-2024-0004', welderName: 'Jaber Al-Khaldi', welderCode: 'WLR-007', weldingProcess: 'SAW', position: '1G', baseMaterial: 'ASTM A36 / A572 Gr.50 Plates ≥ 16 mm', fillMaterial: 'Lincoln 761 flux + LA-71 wire', thickness: '16–60 mm', diameter: null, testDate: new Date('2024-06-15'), testLocation: 'QC Lab — Hexa Steel', visualResult: 'PASS', bendTestResult: 'PASS', radiographyResult: 'PASS', overallResult: 'QUALIFIED', qualificationRange: 'SAW position 1G; t = 8 mm to unlimited; carbon steel groups 1 & 2', certificationNumber: 'WQT-HXS-2024-007-SAW', validFrom: new Date('2024-06-15'), expiryDate: new Date('2026-06-14'), renewalDate: new Date('2026-04-01'), notes: 'Primary SAW specialist for I-beam flange-to-web fillet welds on PEB rafters and columns (up to 60 mm flanges).' },
    { wqtNumber: 'WQT-2024-0005', welderName: 'Tariq Al-Asmari', welderCode: 'WLR-033', weldingProcess: 'FCAW', position: '3G', baseMaterial: 'ASTM A36 Carbon Steel Plate', fillMaterial: 'Lincoln Outershield 71M wire 1.6 mm', thickness: '6–25 mm', diameter: null, testDate: new Date('2024-07-08'), testLocation: 'QC Lab — Hexa Steel', visualResult: 'PASS', bendTestResult: 'PASS', radiographyResult: 'NA', overallResult: 'QUALIFIED', qualificationRange: 'FCAW positions 1G to 4G; t = 3–25 mm; carbon steel', certificationNumber: 'WQT-HXS-2024-033-FCAW', validFrom: new Date('2024-07-08'), expiryDate: new Date('2026-07-07'), renewalDate: new Date('2026-05-01'), notes: 'FCAW specialist for high-productivity welding on mezzanine floor connections and bracing.' },
    { wqtNumber: 'WQT-2023-0012', welderName: 'Rakan Al-Shehri', welderCode: 'WLR-062', weldingProcess: 'SMAW', position: '2G', baseMaterial: 'ASTM A36 Carbon Steel', fillMaterial: 'Lincoln E7018', thickness: '6–25 mm', diameter: null, testDate: new Date('2023-09-05'), testLocation: 'QC Lab — Hexa Steel', visualResult: 'PASS', bendTestResult: 'PASS', radiographyResult: 'NA', overallResult: 'QUALIFIED', qualificationRange: 'SMAW positions 1G, 2G; t = 3–25 mm; carbon steel', certificationNumber: 'WQT-HXS-2023-062-SMAW', validFrom: new Date('2023-09-05'), expiryDate: new Date('2025-09-04'), renewalDate: new Date('2025-07-01'), notes: 'Qualification due for renewal September 2025. Welder to be scheduled for continuity test.' },
    { wqtNumber: 'WQT-2025-0001', welderName: 'Hamad Al-Enezi', welderCode: 'WLR-071', weldingProcess: 'GMAW', position: '3G', baseMaterial: 'ASTM A36 Carbon Steel, 6–20 mm', fillMaterial: 'Lincoln ER70S-6 wire 1.2 mm', thickness: '6–20 mm', diameter: null, testDate: new Date('2025-01-28'), testLocation: 'QC Lab — Hexa Steel', visualResult: 'PASS', bendTestResult: 'FAIL', radiographyResult: 'NA', overallResult: 'NOT_QUALIFIED', qualificationRange: null, certificationNumber: null, validFrom: null, expiryDate: null, renewalDate: null, notes: 'Bend test failure — root bend showed lack of fusion at 6 mm land. Welder to re-practice root pass technique and retest within 30 days.' },
  ];

  for (const w of wqts) {
    await prisma.qcWelderQualification.upsert({
      where: { wqtNumber: w.wqtNumber },
      update: { ...w, updatedAt: new Date() },
      create: { id: randomUUID(), ...w, updatedAt: new Date(), createdById },
    });
  }
  console.log(`  ✅ ${wqts.length} welder qualifications`);

  // ─── 8. Coating Inspections (FRM-022) ────────────────────────────────────────
  console.log('  → Coating Inspections...');

  // Try to find a real project to link to
  const project277 = await prisma.project.findFirst({ where: { projectNumber: '277' } });
  const projectId = project277?.id ?? null;

  const coatingRecords = [
    { inspectionNumber: 'COAT-2025-0001', projectId, coatingSystem: 'Jotun Barrier 80 Epoxy Primer', coatLayer: 'PRIMER', surfacePrep: 'Sa 2.5 per ISO 8501-1, profile Rz 50–75 µm', ambientTemp: 28.0, relativeHumidity: 52.0, dewPoint: 18.0, nominalDft: 75, minDft: 60, maxDft: 120, readings: JSON.stringify([{point:'F1',value:78},{point:'F2',value:82},{point:'F3',value:74},{point:'F4',value:79},{point:'F5',value:83}]), averageDft: 79.2, result: 'ACCEPTED', inspectionDate: new Date('2025-02-14'), witnessedBy: 'Client Rep — SABIC Inspection', remarks: 'All 5 readings within specified range. Sa 2.5 confirmed by replica tape. Application temperature and humidity within spec.', attachments: null },
    { inspectionNumber: 'COAT-2025-0002', projectId, coatingSystem: 'Jotun Hardtop AX Alkyd Topcoat (RAL 9002)', coatLayer: 'TOP_COAT', surfacePrep: 'N/A — over cured primer coat', ambientTemp: 30.0, relativeHumidity: 48.0, dewPoint: 17.5, nominalDft: 50, minDft: 40, maxDft: 80, readings: JSON.stringify([{point:'F1',value:52},{point:'F2',value:48},{point:'F3',value:55},{point:'F4',value:46},{point:'F5',value:53}]), averageDft: 50.8, result: 'ACCEPTED', inspectionDate: new Date('2025-02-21'), witnessedBy: 'Client Rep — SABIC Inspection', remarks: 'RAL 9002 (off-white) colour confirmed against standard. DFT readings satisfactory. Overcoat time interval complied.', attachments: null },
    { inspectionNumber: 'COAT-2025-0003', projectId, coatingSystem: 'Jotun Barrier 80 Epoxy Primer', coatLayer: 'PRIMER', surfacePrep: 'Sa 2.5 per ISO 8501-1', ambientTemp: 32.5, relativeHumidity: 61.0, dewPoint: 24.0, nominalDft: 75, minDft: 60, maxDft: 120, readings: JSON.stringify([{point:'C1',value:58},{point:'C2',value:55},{point:'C3',value:62},{point:'C4',value:57},{point:'C5',value:59}]), averageDft: 58.2, result: 'REJECTED', inspectionDate: new Date('2025-03-05'), witnessedBy: 'Internal QC', remarks: 'REJECTED — all 5 DFT readings below 60 µm minimum. Relative humidity at application exceeded 85% limit (61% recorded but applicator reported wet steel from earlier rain). Rework required: re-blast and re-apply primer.', attachments: null },
    { inspectionNumber: 'COAT-2025-0004', projectId, coatingSystem: 'Jotun Barrier 80 Epoxy Primer — Rework (after COAT-2025-0003 rejection)', coatLayer: 'PRIMER', surfacePrep: 'Sa 2.5 re-blast after rejection', ambientTemp: 27.0, relativeHumidity: 44.0, dewPoint: 14.0, nominalDft: 75, minDft: 60, maxDft: 120, readings: JSON.stringify([{point:'C1',value:77},{point:'C2',value:80},{point:'C3',value:74},{point:'C4',value:78},{point:'C5',value:81}]), averageDft: 78.0, result: 'ACCEPTED', inspectionDate: new Date('2025-03-12'), witnessedBy: 'Client Rep — SABIC Inspection', remarks: 'Rework accepted. All readings within range. Sa 2.5 re-confirmed. Steel temperature 3°C above dew point (compliant).', attachments: null },
    { inspectionNumber: 'COAT-2025-0005', projectId, coatingSystem: 'Interzone 954 — Epoxy Intermediate Coat (industrial zone specification)', coatLayer: 'MID_COAT', surfacePrep: 'N/A — applied over cured Barrier 80', ambientTemp: 29.0, relativeHumidity: 50.0, dewPoint: 18.5, nominalDft: 125, minDft: 100, maxDft: 175, readings: JSON.stringify([{point:'P1',value:128},{point:'P2',value:132},{point:'P3',value:119},{point:'P4',value:141},{point:'P5',value:124}]), averageDft: 128.8, result: 'ACCEPTED', inspectionDate: new Date('2025-04-02'), witnessedBy: 'TÜV Rheinland — Third Party', remarks: 'Jotun Interzone 954 high-build epoxy for corrosivity category C3 specification. DFT satisfactory. Wet film thickness also checked during application.', attachments: null },
  ];

  for (const c of coatingRecords) {
    await prisma.qcCoatingInspection.upsert({
      where: { inspectionNumber: c.inspectionNumber },
      update: { ...c, updatedAt: new Date() },
      create: { id: randomUUID(), ...c, updatedAt: new Date(), createdById },
    });
  }
  console.log(`  ✅ ${coatingRecords.length} coating inspection records`);

  // ─── 9. Project Kickoff Checklists (FRM-016) ─────────────────────────────────
  console.log('  → Kickoff Checklists...');

  const projects = await prisma.project.findMany({ take: 3, select: { id: true, projectNumber: true } });

  if (projects.length > 0) {
    const kickoffs = [
      {
        projectId: projects[0].id,
        meetingDate: new Date('2025-01-08T09:00:00'),
        location: 'Hexa Steel HQ — Conference Room A',
        attendees: 'Ahmed Al-Rashidi (QC Manager), Khalid Al-Dossari (IMS Coordinator), Nasser Al-Shahrani (Production Manager), Client: Mr. Saud Al-Ghamdi (Project Director), Client: Ms. Fatima Al-Khaldi (Resident Engineer), Consultant: Mr. James O\'Brien (Project Manager)',
        agendaItems: '1. Project scope and drawing package review\n2. Engineering deliverable schedule\n3. Material procurement status and lead times\n4. Quality plan and ITP review\n5. HSE plan and site safety requirements\n6. Erection sequence and on-site interface\n7. Communication protocols and submittals register\n8. Open items and action register',
        deliverablesDiscussed: 'Structural design drawings Issue for Construction (IFC): 28 sheets — approved\nBOM and material take-off: finalized\nWelding Procedure Specifications (WPS): WPS-001 to WPS-004 submitted for client approval\nInspection and Test Plan (ITP): submitted — client review within 7 days\nHSE Plan: approved by client HSE\nShop drawing submittal register: 52 drawings — 14 approved, 38 pending',
        openItems: 'OPEN-001: Client to confirm final column anchor bolt layout by 15-Jan\nOPEN-002: Engineer to resubmit Drawing HSG-277-S-007 (connection detail revision)\nOPEN-003: Procurement to confirm PPGI coil delivery date for cladding campaign\nOPEN-004: QC to submit Jotun paint system data sheets for client coating spec review',
        nextSteps: 'Weekly progress meetings every Monday 09:00 (Teams + on-site)\nFirst steel delivery scheduled 20-Jan\nProduction kickoff for primary frames: 22-Jan\nQC pre-production meeting: 21-Jan (ITP and WPS review with all welding supervisors)',
        status: 'SIGNED_OFF',
        signedOffAt: new Date('2025-01-09T14:00:00'),
        notes: 'Client expressed satisfaction with preparation. Fast-track schedule confirmed: delivery in 16 weeks from today.',
      },
    ];

    if (projects[1]) {
      kickoffs.push({
        projectId: projects[1].id,
        meetingDate: new Date('2025-02-17T10:00:00'),
        location: 'Hexa Steel HQ — Board Room',
        attendees: 'Nasser Al-Shahrani (Production Manager), Mohammed Al-Qahtani (QC Inspector), Client: Eng. Walid Al-Hamdan (Project Engineer), Consultant: Ms. Sarah Mitchell (Structural Lead)',
        agendaItems: '1. Drawing package status\n2. ITP and quality requirements\n3. Delivery schedule\n4. Safety induction requirements for on-site activities\n5. Open items from pre-contract stage',
        deliverablesDiscussed: 'IFC drawings: 18 sheets — under review\nWPS: WPS-001, WPS-002 submitted\nITP draft: under client review',
        openItems: 'OPEN-001: Confirm hot-dip galvanizing requirement for secondary members\nOPEN-002: Client to provide anchor bolt setting drawings',
        nextSteps: 'ITP approval expected within 5 working days\nProcurement of primary structural steel to commence immediately\nFirst fabrication batch: primary columns — start 24-Feb',
        status: 'DRAFT',
        signedOffAt: null,
        notes: 'Meeting minutes to be signed off by client by 20-Feb.',
      });
    }

    for (const k of kickoffs) {
      const existing = await prisma.projectKickoffChecklist.findFirst({ where: { projectId: k.projectId } });
      if (!existing) {
        await prisma.projectKickoffChecklist.create({ data: { id: randomUUID(), ...k, updatedAt: new Date(), createdById } });
      }
    }
    console.log(`  ✅ ${kickoffs.length} kickoff checklists`);
  } else {
    console.log('  ⚠️  No projects found — skipping kickoff checklists');
  }

  console.log('✅ Sprint 22.7.0 seed complete.');
}
