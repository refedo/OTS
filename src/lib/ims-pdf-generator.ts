'use client';

import { PDFReportBuilder } from './pdf-builder';

const COMPANY = 'Hexa Steel®';
const TAGLINE = 'Integrated Management System — ISO 9001:2015 / ISO 14001:2015 / ISO 45001:2018';
const FOOTER = 'Hexa Steel® OTS · Confidential IMS Document · hexasteel.sa/ots';

async function loadLogoBase64(): Promise<string | undefined> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return undefined;
    const data = await res.json();
    const logoPath: string | undefined = data.companyLogo;
    if (!logoPath) return undefined;

    const imgRes = await fetch(logoPath);
    if (!imgRes.ok) return undefined;
    const blob = await imgRes.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export type AuditPlanPDFData = {
  planNumber: string;
  year: number;
  auditType: string;
  status: string;
  audits: {
    auditNumber: string;
    scope: string;
    scheduledDate: string;
    actualDate?: string | null;
    status: string;
    auditor?: string | null;
    auditee?: string | null;
    findings: {
      findingNumber: string;
      type: string;
      clause: string;
      description: string;
      status: string;
      targetDate?: string | null;
      correctiveAction?: string | null;
    }[];
  }[];
};

export type ManagementReviewPDFData = {
  reviewNumber: string;
  reviewDate: string;
  chairperson: string;
  period: string;
  status: string;
  attendees?: { name: string; role: string; present: boolean }[] | null;
  inputAuditResults?: unknown;
  inputNcrSummary?: unknown;
  inputKpiStatus?: unknown;
  inputRiskSummary?: unknown;
  inputObjectiveStatus?: unknown;
  inputSupplierPerf?: string | null;
  inputResourceStatus?: string | null;
  inputCustomerFeedback?: string | null;
  inputContextChanges?: string | null;
  outputDecisions?: { decision: string; responsible: string; targetDate: string; status: string }[] | null;
  outputObjectives?: string | null;
  outputResourceNeeds?: string | null;
  notes?: string | null;
};

export type ProcessPDFData = {
  processNumber: string;
  name: string;
  processOwner?: string | null;
  processType: string;
  inputs?: string | null;
  outputs?: string | null;
  kpis?: string | null;
  isoClause?: string | null;
  status: string;
};

export type ObjectivePDFData = {
  title: string;
  category: string;
  status: string;
  priority: string;
  progress: number;
  owner?: string;
  keyResults: {
    title: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    status: string;
  }[];
};

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatInputSection(val: unknown): string {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    if (val.length === 0) return 'None';
    return val.map((item: unknown) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if ('status' in obj && 'count' in obj) return `${obj.status}: ${obj.count}`;
        if ('type' in obj && 'status' in obj && 'clause' in obj) {
          return `[${String(obj.type)}] Clause ${String(obj.clause)} — ${String(obj.description ?? '')} (${String(obj.status)})`;
        }
        if ('findingNumber' in obj) {
          return `${String(obj.findingNumber)}: ${String(obj.description ?? '')} [${String(obj.status)}]`;
        }
        return Object.entries(obj).map(([k, v]) => `${k}: ${String(v)}`).join(', ');
      }
      return String(item);
    }).join('\n');
  }
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if ('error' in obj) return `Data unavailable: ${String(obj.error)}`;
    if ('note' in obj && 'openFindings' in obj) {
      const findings = obj.openFindings as unknown[];
      const dcrCount = obj.openDCRs as number | null;
      const lines: string[] = [`${String(obj.note)}`];
      if (dcrCount !== null && dcrCount !== undefined) lines.push(`Open DCRs: ${dcrCount}`);
      if (Array.isArray(findings) && findings.length > 0) {
        lines.push(`Open Findings (${findings.length}):`);
        findings.slice(0, 10).forEach((f: unknown) => {
          if (typeof f === 'object' && f !== null) {
            const fo = f as Record<string, unknown>;
            lines.push(`  • [${String(fo.type ?? '')}] Cl.${String(fo.clause ?? '')} — ${String(fo.description ?? '').slice(0, 80)} (${String(fo.status ?? '')})`);
          }
        });
        if (findings.length > 10) lines.push(`  … and ${findings.length - 10} more`);
      } else {
        lines.push('No open findings.');
      }
      return lines.join('\n');
    }
    if ('note' in obj && 'kpis' in obj) {
      const kpis = obj.kpis as unknown[];
      const lines: string[] = [String(obj.note)];
      if (Array.isArray(kpis) && kpis.length > 0) {
        kpis.slice(0, 10).forEach((k: unknown) => {
          if (typeof k === 'object' && k !== null) {
            const ko = k as Record<string, unknown>;
            lines.push(`  • ${String(ko.name ?? '')} — Target: ${String(ko.target ?? '—')} ${String(ko.unit ?? '')}`);
          }
        });
      }
      return lines.join('\n');
    }
    if ('totalHighCritical' in obj && 'risks' in obj) {
      const risks = obj.risks as unknown[];
      const lines: string[] = [`High/Critical risks: ${String(obj.totalHighCritical)}`];
      if (Array.isArray(risks) && risks.length > 0) {
        risks.slice(0, 8).forEach((r: unknown) => {
          if (typeof r === 'object' && r !== null) {
            const ro = r as Record<string, unknown>;
            lines.push(`  • [${String(ro.currentRiskRating ?? '')}] ${String(ro.riskNumber ?? '')} — ${String(ro.title ?? '')} (${String(ro.status ?? '')})`);
          }
        });
        if (risks.length > 8) lines.push(`  … and ${risks.length - 8} more`);
      }
      return lines.join('\n');
    }
    if ('reviewNumber' in obj) {
      const lines: string[] = [`Prior Review: ${String(obj.reviewNumber)} (${fmt(String(obj.reviewDate ?? ''))})`];
      if (Array.isArray(obj.decisions)) {
        const decisions = obj.decisions as unknown[];
        lines.push(`Decisions: ${decisions.length}`);
      }
      return lines.join('\n');
    }
    if ('byStatus' in obj) {
      const byStatus = obj.byStatus as unknown[];
      const lines: string[] = [String(obj.note ?? '')];
      if (Array.isArray(byStatus)) {
        byStatus.forEach((s: unknown) => {
          if (typeof s === 'object' && s !== null) {
            const so = s as Record<string, unknown>;
            lines.push(`  • ${String(so.status ?? '')}: ${String(so.count ?? 0)}`);
          }
        });
      }
      return lines.join('\n');
    }
    return Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && String(v).trim())
      .map(([k, v]) => `${k}: ${String(v)}`).join('\n');
  }
  return String(val);
}

function statusDot(s: string): string {
  const map: Record<string, string> = {
    OPEN: 'Open', CLOSED: 'Closed', IN_PROGRESS: 'In Progress',
    PLANNED: 'Planned', COMPLETED: 'Completed', SCHEDULED: 'Scheduled',
    DRAFT: 'Draft', APPROVED: 'Approved', LOCKED: 'Locked',
    ACTIVE: 'Active', UNDER_REVIEW: 'Under Review', OBSOLETE: 'Obsolete',
    NC: 'Non-Conformance', OFI: 'OFI', Observation: 'Observation',
  };
  return map[s] ?? s.replace(/_/g, ' ');
}

export async function generateAuditPlanPDF(data: AuditPlanPDFData): Promise<void> {
  const logo = await loadLogoBase64();
  const pdf = new PDFReportBuilder('portrait', 'steel');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  pdf.addTitle(
    `HEXA-FRM-006/007 — Internal Audit Plan`,
    `${data.planNumber} · ${data.auditType} · ${data.year}`
  );
  pdf.addMetadataBox({
    'Plan No.': data.planNumber,
    Year: String(data.year),
    Type: data.auditType,
    Status: statusDot(data.status),
    'ISO Ref.': '§9.2',
    Generated: fmt(new Date().toISOString()),
  });

  pdf.addSectionHeader('Scheduled Audits');
  if (data.audits.length === 0) {
    pdf.addParagraph('No audits scheduled for this plan.');
  } else {
    pdf.addTable(
      ['Audit No.', 'Scope', 'Scheduled Date', 'Actual Date', 'Auditor', 'Auditee', 'Status', 'Findings'],
      data.audits.map((a) => [
        a.auditNumber,
        a.scope,
        fmt(a.scheduledDate),
        fmt(a.actualDate),
        a.auditor ?? '—',
        a.auditee ?? '—',
        statusDot(a.status),
        String(a.findings.length),
      ]),
      { alternateRows: true }
    );
  }

  const allFindings = data.audits.flatMap((a) =>
    a.findings.map((f) => ({ ...f, auditNumber: a.auditNumber }))
  );

  if (allFindings.length > 0) {
    pdf.addSectionHeader('HEXA-FRM-008 — Audit Findings / NCR Register');
    pdf.addTable(
      ['Finding No.', 'Audit', 'Type', 'Clause', 'Description', 'Status', 'Target Date'],
      allFindings.map((f) => [
        f.findingNumber,
        f.auditNumber,
        f.type,
        f.clause,
        f.description.length > 60 ? f.description.slice(0, 57) + '…' : f.description,
        statusDot(f.status),
        fmt(f.targetDate),
      ]),
      { alternateRows: true }
    );

    const ncrs = allFindings.filter((f) => f.type === 'NC');
    if (ncrs.length > 0) {
      pdf.addSectionHeader('Non-Conformance Details (HEXA-FRM-008)');
      for (const f of ncrs) {
        pdf.addInfoGrid({
          'Finding No.': f.findingNumber,
          Audit: f.auditNumber,
          Clause: f.clause,
          Status: statusDot(f.status),
          'Target Date': fmt(f.targetDate),
        });
        pdf.addParagraph(`Non-Conformance: ${f.description}`);
        if (f.correctiveAction) {
          pdf.addParagraph(`Corrective Action: ${f.correctiveAction}`);
        }
      }
    }
  }

  pdf.addSignatureSection([
    { label: 'Lead Auditor', date: fmt(new Date().toISOString()) },
    { label: 'IMS Manager', date: '' },
    { label: 'Top Management', date: '' },
  ]);

  pdf.addFooter(FOOTER);
  pdf.save(`${data.planNumber}-Audit-Plan.pdf`);
}

export async function generateManagementReviewMOMPDF(data: ManagementReviewPDFData): Promise<void> {
  const logo = await loadLogoBase64();
  const pdf = new PDFReportBuilder('portrait', 'steel');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  pdf.addTitle(
    'HEXA-FRM-011 — Management Review MOM',
    `${data.reviewNumber} · ${data.period}`
  );
  pdf.addMetadataBox({
    'Review No.': data.reviewNumber,
    Date: fmt(data.reviewDate),
    Chairperson: data.chairperson,
    Period: data.period,
    Status: statusDot(data.status),
    'ISO Ref.': '§9.3',
  });

  if (data.attendees && data.attendees.length > 0) {
    pdf.addSectionHeader('Attendees');
    pdf.addTable(
      ['Name', 'Role / Title', 'Present'],
      data.attendees.map((a) => [a.name, a.role, a.present ? 'Yes' : 'No']),
      { alternateRows: true }
    );
  }

  pdf.addSectionHeader('Agenda & Review Inputs (§9.3.2)');
  const inputs: Record<string, string> = {};
  if (data.inputSupplierPerf) inputs['Supplier Performance'] = data.inputSupplierPerf;
  if (data.inputResourceStatus) inputs['Resource Status'] = data.inputResourceStatus;
  if (data.inputCustomerFeedback) inputs['Customer Feedback'] = data.inputCustomerFeedback;
  if (data.inputContextChanges) inputs['Context Changes'] = data.inputContextChanges;
  if (data.inputObjectiveStatus) inputs['Objective Status'] = formatInputSection(data.inputObjectiveStatus);

  for (const [key, val] of Object.entries(inputs)) {
    pdf.addParagraph(`${key}: ${val}`);
  }

  if (data.outputDecisions && data.outputDecisions.length > 0) {
    pdf.addSectionHeader('Decisions & Action Items (§9.3.3)');
    pdf.addTable(
      ['Decision', 'Responsible', 'Target Date', 'Status'],
      data.outputDecisions.map((d) => [
        d.decision,
        d.responsible,
        fmt(d.targetDate),
        statusDot(d.status),
      ]),
      { alternateRows: true }
    );
  }

  if (data.outputObjectives) {
    pdf.addSectionHeader('Objectives Output');
    pdf.addParagraph(data.outputObjectives);
  }

  if (data.outputResourceNeeds) {
    pdf.addSectionHeader('Resource Needs');
    pdf.addParagraph(data.outputResourceNeeds);
  }

  if (data.notes) {
    pdf.addSectionHeader('Notes');
    pdf.addParagraph(data.notes);
  }

  pdf.addSignatureSection([
    { label: 'Chairperson', name: data.chairperson, date: fmt(data.reviewDate) },
    { label: 'QMR / IMS Manager', date: '' },
    { label: 'Note-Taker', date: '' },
  ]);

  pdf.addFooter(FOOTER);
  pdf.save(`${data.reviewNumber}-MOM.pdf`);
}

export async function generateManagementReviewReportPDF(data: ManagementReviewPDFData): Promise<void> {
  const logo = await loadLogoBase64();
  const pdf = new PDFReportBuilder('portrait', 'steel');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  pdf.addTitle(
    'HEXA-FRM-012 — Management Review Report',
    `${data.reviewNumber} · ${data.period}`
  );
  pdf.addMetadataBox({
    'Review No.': data.reviewNumber,
    Date: fmt(data.reviewDate),
    Chairperson: data.chairperson,
    Period: data.period,
    Status: statusDot(data.status),
    'ISO Ref.': '§9.3',
  });

  pdf.addSectionHeader('Review Summary');
  pdf.addInfoGrid({
    Period: data.period,
    'Review Date': fmt(data.reviewDate),
    Chairperson: data.chairperson,
    Status: statusDot(data.status),
  });

  pdf.addSectionHeader('§9.3.2 — Review Inputs');
  const inputSections: [string, unknown][] = [
    ['Audit Results', data.inputAuditResults],
    ['NCR Summary', data.inputNcrSummary],
    ['KPI Status', data.inputKpiStatus],
    ['Risk Summary', data.inputRiskSummary],
    ['Objective Status', data.inputObjectiveStatus],
    ['Supplier Performance', data.inputSupplierPerf],
    ['Resource Status', data.inputResourceStatus],
    ['Customer Feedback', data.inputCustomerFeedback],
    ['Context Changes', data.inputContextChanges],
  ];

  for (const [label, val] of inputSections) {
    if (val) {
      const text = formatInputSection(val);
      if (text && text !== '—') {
        pdf.addSectionHeader(label);
        pdf.addParagraph(text);
      }
    }
  }

  if (data.outputDecisions && data.outputDecisions.length > 0) {
    pdf.addSectionHeader('§9.3.3 — Review Outputs & Decisions');
    pdf.addTable(
      ['Decision / Action', 'Responsible', 'Target Date', 'Status'],
      data.outputDecisions.map((d) => [d.decision, d.responsible, fmt(d.targetDate), statusDot(d.status)]),
      { alternateRows: true }
    );
  }

  if (data.outputObjectives) {
    pdf.addSectionHeader('Continual Improvement Objectives');
    pdf.addParagraph(data.outputObjectives);
  }

  if (data.outputResourceNeeds) {
    pdf.addSectionHeader('Resource Decisions');
    pdf.addParagraph(data.outputResourceNeeds);
  }

  if (data.notes) {
    pdf.addSectionHeader('Additional Notes');
    pdf.addParagraph(data.notes);
  }

  pdf.addSignatureSection([
    { label: 'Chairperson', name: data.chairperson, date: fmt(data.reviewDate) },
    { label: 'QMR / IMS Manager', date: '' },
    { label: 'Top Management Approval', date: '' },
  ]);

  pdf.addFooter(FOOTER);
  pdf.save(`${data.reviewNumber}-Management-Review-Report.pdf`);
}

export async function generateProcessesPDF(processes: ProcessPDFData[]): Promise<void> {
  const logo = await loadLogoBase64();
  const pdf = new PDFReportBuilder('landscape', 'steel');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  pdf.addTitle(
    'HEXA-FRM-002 / FRM-004 — QMS Process List',
    `Total: ${processes.length} processes · ISO 9001:2015 §4.4`
  );
  pdf.addMetadataBox({
    'Total Processes': String(processes.length),
    Active: String(processes.filter((p) => p.status === 'ACTIVE').length),
    'Under Review': String(processes.filter((p) => p.status === 'UNDER_REVIEW').length),
    Generated: fmt(new Date().toISOString()),
    'ISO Ref.': '§4.4',
  });

  const byType: Record<string, ProcessPDFData[]> = {};
  for (const p of processes) {
    (byType[p.processType] ??= []).push(p);
  }

  for (const [type, procs] of Object.entries(byType)) {
    pdf.addSectionHeader(`${type.replace('_', '-')} Processes`);
    pdf.addTable(
      ['No.', 'Process Name', 'Owner', 'Inputs', 'Outputs', 'KPIs', 'ISO Clause', 'Status'],
      procs.map((p) => [
        p.processNumber,
        p.name,
        p.processOwner ?? '—',
        (p.inputs ?? '').slice(0, 40),
        (p.outputs ?? '').slice(0, 40),
        (p.kpis ?? '').slice(0, 40),
        p.isoClause ?? '—',
        statusDot(p.status),
      ]),
      { alternateRows: true }
    );
  }

  pdf.addSignatureSection([
    { label: 'IMS Manager', date: fmt(new Date().toISOString()) },
    { label: 'QMR', date: '' },
    { label: 'Management Representative', date: '' },
  ]);

  pdf.addFooter(FOOTER);
  pdf.save('QMS-Process-List.pdf');
}

export async function generateObjectivesPDF(objectives: ObjectivePDFData[], year: number): Promise<void> {
  const logo = await loadLogoBase64();
  const pdf = new PDFReportBuilder('portrait', 'steel');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  pdf.addTitle(
    `HEXA-FRM-013 — Quality Objectives Register`,
    `Year: ${year} · Total: ${objectives.length} objectives · ISO 9001:2015 §6.2`
  );
  pdf.addMetadataBox({
    Year: String(year),
    Total: String(objectives.length),
    'On Track': String(objectives.filter((o) => o.status === 'On Track').length),
    'At Risk': String(objectives.filter((o) => o.status === 'At Risk').length),
    Completed: String(objectives.filter((o) => o.status === 'Completed').length),
    Generated: fmt(new Date().toISOString()),
  });

  const byCategory: Record<string, ObjectivePDFData[]> = {};
  for (const o of objectives) {
    (byCategory[o.category] ??= []).push(o);
  }

  for (const [cat, objs] of Object.entries(byCategory)) {
    pdf.addSectionHeader(`${cat} Objectives`);
    pdf.addTable(
      ['Title', 'Owner', 'Priority', 'Progress', 'Status', 'Key Results'],
      objs.map((o) => [
        o.title.length > 40 ? o.title.slice(0, 37) + '…' : o.title,
        o.owner ?? '—',
        o.priority,
        `${Math.round(o.progress)}%`,
        o.status,
        String(o.keyResults.length),
      ]),
      { alternateRows: true }
    );

    for (const o of objs) {
      if (o.keyResults.length > 0) {
        pdf.addParagraph(`Key Results — ${o.title}:`);
        pdf.addTable(
          ['Key Result', 'Target', 'Current', 'Unit', 'Status'],
          o.keyResults.map((kr) => [
            kr.title.length > 50 ? kr.title.slice(0, 47) + '…' : kr.title,
            String(kr.targetValue),
            String(kr.currentValue),
            kr.unit,
            kr.status,
          ]),
          { alternateRows: true }
        );
      }
    }
  }

  pdf.addSignatureSection([
    { label: 'Quality Manager', date: fmt(new Date().toISOString()) },
    { label: 'Department Head', date: '' },
    { label: 'Management Approval', date: '' },
  ]);

  pdf.addFooter(FOOTER);
  pdf.save(`FRM-013-Objectives-${year}.pdf`);
}

export type RiskRegisterPDFRisk = {
  riskNumber: string;
  title: string;
  type: string;
  category: string;
  status: string;
  currentRiskRating: string;
  currentLikelihood: number;
  currentSeverity: number;
  owner?: { name: string } | null;
  nextReviewDate?: string | null;
};

export async function generateRiskRegisterPDF(risks: RiskRegisterPDFRisk[]): Promise<void> {
  const logo = await loadLogoBase64();
  const pdf = new PDFReportBuilder('landscape', 'red');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  pdf.addTitle(
    'HEXA-FRM-011 — Risk & Compliance Register',
    `Hexa-ISP-002 · ISO 9001/14001/45001 §6.1 — Generated ${new Date().toLocaleDateString('en-SA-u-ca-gregory')}`
  );
  pdf.addMetadataBox({
    'Total Risks': String(risks.length),
    Critical: String(risks.filter(r => r.currentRiskRating === 'CRITICAL').length),
    High: String(risks.filter(r => r.currentRiskRating === 'HIGH').length),
    Medium: String(risks.filter(r => r.currentRiskRating === 'MEDIUM').length),
    Low: String(risks.filter(r => r.currentRiskRating === 'LOW').length),
    'Date': fmt(new Date().toISOString()),
  });

  pdf.addSectionHeader('Risk Register');
  pdf.addTable(
    ['Risk No.', 'Title', 'Type', 'Category', 'L', 'S', 'Rating', 'Status', 'Owner', 'Next Review'],
    risks.map(r => [
      r.riskNumber,
      r.title.length > 40 ? r.title.slice(0, 37) + '…' : r.title,
      r.type,
      r.category.replace('_', ' '),
      String(r.currentLikelihood),
      String(r.currentSeverity),
      r.currentRiskRating,
      r.status.replace('_', ' '),
      r.owner?.name ?? '—',
      r.nextReviewDate ? fmt(r.nextReviewDate) : '—',
    ]),
    { alternateRows: true }
  );

  const byCat = risks.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});
  if (Object.keys(byCat).length > 0) {
    pdf.addSectionHeader('Summary by Category');
    pdf.addTable(
      ['Category', 'Count'],
      Object.entries(byCat).map(([k, v]) => [k.replace(/_/g, ' '), String(v)]),
      { alternateRows: true }
    );
  }

  pdf.addSignatureSection([
    { label: 'Quality Manager', date: fmt(new Date().toISOString()) },
    { label: 'Management Approval', date: '' },
  ]);

  pdf.addFooter(FOOTER);
  pdf.save(`Risk-Register-${new Date().toISOString().slice(0, 10)}.pdf`);
}
