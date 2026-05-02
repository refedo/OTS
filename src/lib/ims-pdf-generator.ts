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
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory');
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
  if (data.inputObjectiveStatus) inputs['Objective Status'] = JSON.stringify(data.inputObjectiveStatus);

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
      const text = typeof val === 'string' ? val : JSON.stringify(val);
      pdf.addParagraph(`${label}: ${text}`);
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
