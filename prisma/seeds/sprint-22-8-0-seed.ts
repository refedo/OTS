import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export async function seedSprint2280() {
  console.log('🌱 Seeding Sprint 22.8.0 — IMS Audit Plans, Management Reviews, Objectives...');

  const adminUser = await prisma.user.findFirst({ select: { id: true, name: true } });
  const createdById = adminUser?.id ?? null;

  // ─── 1. Audit Plans FRM-006 / FRM-007 / FRM-009 ────────────────────────────
  console.log('  → Audit Plans (FRM-006, FRM-007, FRM-009)...');

  const auditPlans = [
    {
      planNumber: 'AP-25-001',
      year: 2025,
      auditType: 'Internal',
      status: 'COMPLETED',
      audits: [
        {
          auditNumber: 'AUD-25-001',
          scope: 'Production & Fabrication (§8.5)',
          scheduledDate: new Date('2025-03-10'),
          actualDate: new Date('2025-03-12'),
          status: 'COMPLETED',
          clausesCovered: ['8.5.1', '8.5.2', '8.5.6'],
          summary: 'Annual internal audit of fabrication processes. Overall conformance satisfactory.',
          findings: [
            {
              findingNumber: 'NCR-25-001',
              type: 'NC',
              clause: '8.5.1',
              description: 'Weld inspection records for I-beam WB-215 were not updated after final VT inspection. ITP sign-off sheet missing for 3 members.',
              evidence: 'Review of ITP records for project 277, items WB-213 through WB-215.',
              correctiveAction: 'Update all ITP inspection sheets for the identified members. Implement mandatory checklist review before release sign-off.',
              status: 'CLOSED',
              targetDate: new Date('2025-04-10'),
              closedAt: new Date('2025-03-29'),
              closureEvidence: 'Updated ITP sheets provided and reviewed. Sign-off procedure updated.',
            },
            {
              findingNumber: 'OFI-25-001',
              type: 'OFI',
              clause: '8.5.1',
              description: 'Opportunity to reduce fabrication re-work by implementing visual control boards on the production floor to track ITP hold points.',
              status: 'CLOSED',
              targetDate: new Date('2025-05-01'),
              closedAt: new Date('2025-04-20'),
            },
          ],
        },
        {
          auditNumber: 'AUD-25-002',
          scope: 'Quality Control & Inspection (§9.2)',
          scheduledDate: new Date('2025-04-15'),
          actualDate: new Date('2025-04-16'),
          status: 'COMPLETED',
          clausesCovered: ['9.2', '9.1.1', '8.6'],
          summary: 'QC processes audit. NCR closure process adequate. Minor gap in dimensional inspection documentation.',
          findings: [
            {
              findingNumber: 'NCR-25-002',
              type: 'NC',
              clause: '9.1.1',
              description: 'DFT coating inspection records for Project 257 show readings taken but average calculation not documented per SSPC-PA-2 requirements.',
              evidence: 'Coating inspection forms COAT-2025-014 through COAT-2025-019 reviewed.',
              correctiveAction: 'Update coating inspection form template to include automatic average DFT calculation field. Train coating inspectors on revised form.',
              status: 'CLOSED',
              targetDate: new Date('2025-05-15'),
              closedAt: new Date('2025-05-02'),
              closureEvidence: 'Revised form deployed in OTS. Inspector training records provided.',
            },
            {
              findingNumber: 'OBS-25-001',
              type: 'Observation',
              clause: '8.6',
              description: 'Release note process is effective. Recommend adding digital signature capability to streamline approval workflow.',
              status: 'OPEN',
              targetDate: new Date('2025-08-01'),
            },
          ],
        },
      ],
    },
    {
      planNumber: 'AP-25-002',
      year: 2025,
      auditType: 'Surveillance',
      status: 'COMPLETED',
      audits: [
        {
          auditNumber: 'AUD-25-003',
          scope: 'IMS System — ISO 9001/14001/45001 Combined Surveillance',
          scheduledDate: new Date('2025-09-22'),
          actualDate: new Date('2025-09-23'),
          status: 'COMPLETED',
          clausesCovered: ['4.1', '4.2', '5.1', '6.1', '6.2', '9.3'],
          summary: 'Third-party surveillance audit by TÜV Rheinland. Certification maintained. Two NCRs raised.',
          findings: [
            {
              findingNumber: 'NCR-25-003',
              type: 'NC',
              clause: '6.2.1',
              description: 'Quality objectives for Q3 2025 have not been formally communicated to all relevant departments. Production team unable to confirm awareness of current objectives.',
              evidence: 'Interviews with Production Supervisor and three line operators.',
              correctiveAction: 'Issue formal objectives awareness communication to all departments. Confirm receipt and understanding via signed acknowledgement.',
              status: 'CLOSED',
              targetDate: new Date('2025-10-22'),
              closedAt: new Date('2025-10-15'),
              closureEvidence: 'Communication records and signed acknowledgements provided to TÜV Rheinland.',
            },
            {
              findingNumber: 'NCR-25-004',
              type: 'NC',
              clause: '9.3',
              description: 'Management review for H1 2025 was conducted but minutes were not formally distributed to all top management attendees within the required 7-day window.',
              evidence: 'MOM distribution records reviewed; gap of 14 days identified.',
              correctiveAction: 'Update management review procedure to enforce 7-day distribution requirement. Set system reminder in OTS.',
              status: 'CLOSED',
              targetDate: new Date('2025-10-30'),
              closedAt: new Date('2025-10-22'),
              closureEvidence: 'Updated procedure ISP-003 Rev.3 and OTS reminder configuration confirmed.',
            },
          ],
        },
      ],
    },
    {
      planNumber: 'AP-26-001',
      year: 2026,
      auditType: 'Internal',
      status: 'IN_PROGRESS',
      audits: [
        {
          auditNumber: 'AUD-26-001',
          scope: 'Supply Chain & Procurement (§8.4)',
          scheduledDate: new Date('2026-02-17'),
          actualDate: new Date('2026-02-18'),
          status: 'COMPLETED',
          clausesCovered: ['8.4', '8.4.1', '8.4.2'],
          summary: 'Supplier evaluation and procurement controls audit. Approved supplier register up to date.',
          findings: [
            {
              findingNumber: 'NCR-26-001',
              type: 'NC',
              clause: '8.4.1',
              description: 'SUP-010 (Zahid Tractor) approval has expired since 01-Jan-2025 but continues to be used for abrasive consumable supply without documented conditional approval.',
              evidence: 'Approved supplier register reviewed. Purchase records for abrasives Jan–Feb 2026.',
              correctiveAction: 'Immediately obtain updated ISO 9001 certificate from SUP-010 or suspend use. Update approved supplier register with expiry date alert.',
              status: 'IN_PROGRESS',
              targetDate: new Date('2026-03-17'),
            },
          ],
        },
        {
          auditNumber: 'AUD-26-002',
          scope: 'HR & Competence Management (§7.2, §7.3)',
          scheduledDate: new Date('2026-04-10'),
          status: 'SCHEDULED',
          clausesCovered: ['7.2', '7.3'],
          findings: [],
        },
        {
          auditNumber: 'AUD-26-003',
          scope: 'Design & Engineering (§8.3)',
          scheduledDate: new Date('2026-05-20'),
          status: 'SCHEDULED',
          clausesCovered: ['8.3', '8.3.3', '8.3.4', '8.3.6'],
          findings: [],
        },
      ],
    },
  ];

  for (const plan of auditPlans) {
    const { audits, ...planData } = plan;

    const createdPlan = await prisma.imsAuditPlan.upsert({
      where: { planNumber: planData.planNumber },
      update: { ...planData, updatedAt: new Date() },
      create: { id: randomUUID(), ...planData, createdById },
    });

    for (const audit of audits) {
      const { findings, ...auditData } = audit;

      const createdAudit = await prisma.imsAudit.upsert({
        where: { auditNumber: auditData.auditNumber },
        update: { ...auditData, updatedAt: new Date() },
        create: { id: randomUUID(), planId: createdPlan.id, ...auditData, createdById },
      });

      for (const finding of findings) {
        const existing = await prisma.imsAuditFinding.findFirst({
          where: { findingNumber: finding.findingNumber },
        });
        if (!existing) {
          await prisma.imsAuditFinding.create({
            data: { id: randomUUID(), auditId: createdAudit.id, ...finding },
          });
        }
      }
    }
  }
  console.log(`  ✅ ${auditPlans.length} audit plans + audits + findings`);

  // ─── 2. Management Reviews FRM-011 / FRM-012 ───────────────────────────────
  console.log('  → Management Reviews (FRM-011 MOM / FRM-012 Report)...');

  const reviews = [
    {
      reviewNumber: 'MR-25-001',
      reviewDate: new Date('2025-07-10'),
      chairperson: 'CEO',
      period: 'H1 2025 (Jan–Jun 2025)',
      status: 'APPROVED',
      approvedAt: new Date('2025-07-10'),
      approvedById: createdById,
      createdById,
      attendees: [
        { name: 'Abdullah Al-Harbi', role: 'CEO (Chairperson)', present: true },
        { name: 'Khalid Al-Dossari', role: 'IMS Manager / QMR', present: true },
        { name: 'Ahmed Al-Rashidi', role: 'QC Manager', present: true },
        { name: 'Faisal Al-Ghamdi', role: 'Production Manager', present: true },
        { name: 'Saleh Al-Mutairi', role: 'Supply Chain Manager', present: true },
        { name: 'Omar Al-Otaibi', role: 'Chief Engineer', present: true },
        { name: 'Nasser Al-Shahrani', role: 'HR Manager', present: false },
      ],
      inputAuditResults: {
        openFindings: 2,
        closedFindings: 8,
        note: 'Internal audit AUD-25-001 and AUD-25-002 completed. All major NCRs closed within target dates.',
      },
      inputNcrSummary: {
        total: 4,
        open: 1,
        closed: 3,
        overdue: 0,
        note: 'NCR closure rate 75%. One NCR (NCR-25-002) closed after 2-day delay due to form template update.',
      },
      inputKpiStatus: {
        onTrack: 8,
        atRisk: 2,
        behind: 1,
        note: 'Drawing accuracy rate at 96.8% (target ≥98%). Corrective action in progress with engineering team.',
      },
      inputRiskSummary: {
        highRisks: 2,
        mediumRisks: 5,
        lowRisks: 9,
        note: 'Steel price volatility remains High risk. New mitigation: approved supplier dual-sourcing.',
      },
      inputObjectiveStatus: {
        total: 7,
        completed: 2,
        onTrack: 4,
        atRisk: 1,
        note: 'Quality objective OBJ-2025-003 (first-pass inspection rate) at risk. Root cause: new inspector onboarding.',
      },
      inputSupplierPerf: 'All Tier-1 suppliers (SUP-001 through SUP-007) maintained A rating. SUP-008 (AMIS) remains on Conditional approval pending SLA review. SUP-010 approval expired — renewal in progress.',
      inputResourceStatus: 'Workshop capacity at 85%. Additional CNC operator hired Q2. SAW welding line at full capacity. New Ficep line commissioned May 2025.',
      inputCustomerFeedback: 'Client satisfaction score: 4.2/5.0 (target ≥4.0). Two formal complaints received and resolved. Delivery on-time rate: 91% (target ≥93%).',
      inputContextChanges: 'New Saudi municipal contracts require SASO certification for structural members. Process initiated with SASO in June 2025.',
      outputDecisions: [
        { decision: 'Increase ITP training for inspectors to address first-pass inspection rate gap', responsible: 'QC Manager', targetDate: '2025-09-30', status: 'IN_PROGRESS' },
        { decision: 'Complete SUP-010 re-approval or identify alternative abrasive supplier', responsible: 'Supply Chain Manager', targetDate: '2025-08-31', status: 'CLOSED' },
        { decision: 'Initiate SASO certification process for structural members', responsible: 'Chief Engineer', targetDate: '2025-12-31', status: 'IN_PROGRESS' },
        { decision: 'Review and update engineering drawing release KPI target for Q3 2025', responsible: 'Chief Engineer', targetDate: '2025-07-31', status: 'CLOSED' },
      ],
      outputObjectives: 'Maintain ISO 9001/14001/45001 certification through H2 2025 surveillance audit. Achieve delivery on-time rate ≥93% by Q3 2025. Complete SASO certification application by December 2025.',
      outputResourceNeeds: 'Additional QC inspector hire approved for Q3 2025. Coating thickness gauge calibration budget approved (SAR 8,500).',
      notes: 'Next management review scheduled for January 2026 to cover H2 2025 performance. IMS Manager to distribute MOM within 7 days per ISP-003.',
    },
    {
      reviewNumber: 'MR-26-001',
      reviewDate: new Date('2026-01-15'),
      chairperson: 'CEO',
      period: 'H2 2025 (Jul–Dec 2025)',
      status: 'APPROVED',
      approvedAt: new Date('2026-01-15'),
      approvedById: createdById,
      createdById,
      attendees: [
        { name: 'Abdullah Al-Harbi', role: 'CEO (Chairperson)', present: true },
        { name: 'Khalid Al-Dossari', role: 'IMS Manager / QMR', present: true },
        { name: 'Ahmed Al-Rashidi', role: 'QC Manager', present: true },
        { name: 'Faisal Al-Ghamdi', role: 'Production Manager', present: true },
        { name: 'Saleh Al-Mutairi', role: 'Supply Chain Manager', present: true },
        { name: 'Omar Al-Otaibi', role: 'Chief Engineer', present: true },
        { name: 'Nasser Al-Shahrani', role: 'HR Manager', present: true },
      ],
      inputAuditResults: {
        openFindings: 4,
        closedFindings: 12,
        note: 'Surveillance audit by TÜV Rheinland completed September 2025. Two NCRs (NCR-25-003, NCR-25-004) raised and closed within 30 days. Certification maintained.',
      },
      inputNcrSummary: {
        total: 6,
        open: 2,
        closed: 4,
        overdue: 0,
        note: 'Excellent NCR closure performance in H2. Average closure time: 18 days (target ≤30 days).',
      },
      inputKpiStatus: {
        onTrack: 9,
        atRisk: 1,
        behind: 0,
        note: 'All KPIs within target except delivery on-time rate (92% vs 93% target) — marginal gap, trend improving.',
      },
      inputRiskSummary: {
        highRisks: 1,
        mediumRisks: 4,
        lowRisks: 11,
        note: 'Steel price risk downgraded from High to Medium after dual-sourcing arrangement with Al-Rajhi Steel and new backup supplier activated.',
      },
      inputObjectiveStatus: {
        total: 7,
        completed: 5,
        onTrack: 2,
        note: 'Strong objective performance in H2. First-pass inspection rate recovered to 94% by December.',
      },
      inputSupplierPerf: 'All Tier-1 suppliers maintaining A rating. SUP-010 re-approval completed November 2025 with new ISO 9001 certificate. SUP-008 SLA review completed — upgraded to full Approved status.',
      inputResourceStatus: 'Workshop capacity stable at 87%. New QC inspector (Ref. EMP-2025-112) onboarded September 2025. Equipment calibration cycle completed on schedule.',
      inputCustomerFeedback: 'Client satisfaction improved to 4.4/5.0. Zero formal complaints in H2 2025. Positive feedback from Project 277 client on delivery performance.',
      inputContextChanges: 'SASO certification application submitted December 2025. Awaiting site inspection scheduling.',
      outputDecisions: [
        { decision: 'Finalize SASO certification process and prepare for site inspection', responsible: 'Chief Engineer', targetDate: '2026-06-30', status: 'IN_PROGRESS' },
        { decision: 'Launch 2026 internal audit programme — schedule AUD-26-001 through AUD-26-006', responsible: 'IMS Manager', targetDate: '2026-02-01', status: 'CLOSED' },
        { decision: 'Introduce digital ITP sign-off to eliminate paper-based inspection records', responsible: 'QC Manager', targetDate: '2026-04-30', status: 'IN_PROGRESS' },
        { decision: 'Review and set 2026 quality objectives aligned to strategic plan', responsible: 'IMS Manager', targetDate: '2026-02-28', status: 'CLOSED' },
      ],
      outputObjectives: 'Achieve ISO 9001/14001/45001 full re-certification in 2027 cycle. Target delivery on-time rate ≥95% by Q4 2026. Complete SASO certification by June 2026.',
      outputResourceNeeds: 'Digital ITP system implementation budget approved: SAR 45,000. Additional IT infrastructure for OTS IMS module: SAR 12,000.',
      notes: 'Exceptional performance improvement H2 2025 vs H1 2025. IMS Manager commended for surveillance audit preparation. Next review: July 2026 for H1 2026.',
    },
  ];

  for (const review of reviews) {
    const existing = await prisma.imsManagementReview.findFirst({
      where: { reviewNumber: review.reviewNumber },
    });
    if (!existing) {
      await prisma.imsManagementReview.create({
        data: { id: randomUUID(), ...review },
      });
    }
  }
  console.log(`  ✅ ${reviews.length} management reviews`);

  // ─── 3. Company Objectives FRM-013 ─────────────────────────────────────────
  console.log('  → Company Objectives (FRM-013)...');

  const ownerUser = await prisma.user.findFirst({ select: { id: true } });
  const ownerId = ownerUser?.id ?? null;

  if (ownerId) {
    const objectives = [
      {
        year: 2026,
        title: 'Achieve ≥95% On-Time Delivery Rate',
        description: 'Improve logistics and dispatch scheduling to reach 95% on-time delivery for all projects.',
        category: 'Customer',
        priority: 'High',
        status: 'On Track',
        progress: 68,
        ownerId,
        quarterlyActions: {
          Q1: ['Audit dispatch scheduling process', 'Implement load sequence optimization'],
          Q2: ['Deploy digital delivery tracking', 'Review transport partner KPIs'],
          Q3: ['Mid-year delivery performance review', 'Address root causes of delays'],
          Q4: ['Final performance audit', 'Update delivery procedure ISP-008'],
        },
        keyResults: [
          { title: 'On-time delivery rate (all projects)', targetValue: 95, currentValue: 92, unit: '%', measurementType: 'Numeric', status: 'On Track' },
          { title: 'Average days late per shipment', targetValue: 0, currentValue: 0.4, unit: 'days', measurementType: 'Numeric', status: 'On Track' },
        ],
      },
      {
        year: 2026,
        title: 'Reduce NCR Rate to < 1% of Fabricated Tonnage',
        description: 'Drive down non-conformances through improved ITP compliance and first-pass inspection rates.',
        category: 'Internal Process',
        priority: 'High',
        status: 'On Track',
        progress: 72,
        ownerId,
        quarterlyActions: {
          Q1: ['Deploy digital ITP sign-off in OTS', 'Inspector competence re-assessment'],
          Q2: ['Analyse top NCR root causes Q1', 'Preventive action implementation'],
          Q3: ['Mid-year NCR rate analysis', 'Welding process improvement review'],
          Q4: ['Annual NCR closure audit', 'Update corrective action procedure'],
        },
        keyResults: [
          { title: 'NCR rate (% of fabricated tonnage)', targetValue: 1, currentValue: 1.3, unit: '%', measurementType: 'Numeric', status: 'At Risk' },
          { title: 'First-pass inspection rate', targetValue: 95, currentValue: 94, unit: '%', measurementType: 'Numeric', status: 'On Track' },
          { title: 'Average NCR closure time', targetValue: 14, currentValue: 18, unit: 'days', measurementType: 'Numeric', status: 'At Risk' },
        ],
      },
      {
        year: 2026,
        title: 'Maintain 100% ISO Certification Compliance',
        description: 'Sustain ISO 9001, 14001, and 45001 certification with zero major NCRs in external audits.',
        category: 'Internal Process',
        priority: 'Critical',
        status: 'On Track',
        progress: 85,
        ownerId,
        quarterlyActions: {
          Q1: ['Complete 2026 internal audit programme schedule', 'Review and update IMS documentation'],
          Q2: ['Conduct H1 internal audits (AUD-26-001 to AUD-26-003)', 'Address any findings within 30 days'],
          Q3: ['H1 management review completion', 'Prepare for 2026 external surveillance audit'],
          Q4: ['Conduct H2 internal audits', 'Annual IMS effectiveness review'],
        },
        keyResults: [
          { title: 'External audit major NCRs', targetValue: 0, currentValue: 0, unit: 'count', measurementType: 'Numeric', status: 'On Track' },
          { title: 'Internal audit completion rate', targetValue: 100, currentValue: 83, unit: '%', measurementType: 'Numeric', status: 'On Track' },
          { title: 'CAPA closure rate (within target date)', targetValue: 95, currentValue: 91, unit: '%', measurementType: 'Numeric', status: 'On Track' },
        ],
      },
      {
        year: 2026,
        title: 'Complete SASO Structural Steel Certification',
        description: 'Obtain SASO product certification for structural steel members to enable new municipal project bids.',
        category: 'Customer',
        priority: 'High',
        status: 'On Track',
        progress: 35,
        ownerId,
        quarterlyActions: {
          Q1: ['Finalize SASO application documentation', 'Pre-audit gap analysis'],
          Q2: ['SASO site inspection readiness review', 'Complete any corrective actions from gap analysis'],
          Q3: ['SASO site inspection (target: Aug 2026)', 'Address inspection findings'],
          Q4: ['Certificate receipt and integration into commercial offers', 'Update approved product list'],
        },
        keyResults: [
          { title: 'SASO application submitted', targetValue: 1, currentValue: 1, unit: 'milestone', measurementType: 'Boolean', status: 'Completed' },
          { title: 'SASO site inspection passed', targetValue: 1, currentValue: 0, unit: 'milestone', measurementType: 'Boolean', status: 'Not Started' },
          { title: 'Certificate received', targetValue: 1, currentValue: 0, unit: 'milestone', measurementType: 'Boolean', status: 'Not Started' },
        ],
      },
      {
        year: 2026,
        title: 'Achieve Zero Lost-Time Injuries (LTI)',
        description: 'Maintain a safe working environment with zero lost-time injuries across all production areas.',
        category: 'Internal Process',
        priority: 'Critical',
        status: 'On Track',
        progress: 90,
        ownerId,
        quarterlyActions: {
          Q1: ['Update risk assessment for new Ficep line', 'Quarterly toolbox talk programme'],
          Q2: ['HSE inspection of all production areas', 'Emergency drill (fire evacuation)'],
          Q3: ['NEBOSH compliance review', 'Near-miss reporting culture campaign'],
          Q4: ['Annual HSE performance review', 'Update OHS objectives for 2027'],
        },
        keyResults: [
          { title: 'Lost-Time Injuries (LTI)', targetValue: 0, currentValue: 0, unit: 'incidents', measurementType: 'Numeric', status: 'On Track' },
          { title: 'Near-miss reports submitted', targetValue: 12, currentValue: 7, unit: 'count', measurementType: 'Numeric', status: 'On Track' },
          { title: 'Toolbox talks conducted', targetValue: 4, currentValue: 2, unit: 'sessions', measurementType: 'Numeric', status: 'On Track' },
        ],
      },
    ];

    for (const obj of objectives) {
      const { keyResults, ...objData } = obj;
      const existing = await prisma.companyObjective.findFirst({
        where: { title: obj.title, year: obj.year },
      });
      if (!existing) {
        const created = await prisma.companyObjective.create({
          data: { id: randomUUID(), ...objData },
        });
        for (const kr of keyResults) {
          await prisma.keyResult.create({
            data: { id: randomUUID(), objectiveId: created.id, ...kr },
          });
        }
      }
    }
    console.log(`  ✅ ${objectives.length} company objectives with key results`);
  }

  console.log('✅ Sprint 22.8.0 seed completed.');
}
