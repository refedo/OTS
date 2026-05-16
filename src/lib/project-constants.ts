export const STRUCTURE_TYPES = ['Steel Structure', 'PEB', 'Metal Works'] as const;

export const SAUDI_CITIES = [
  'Riyadh',
  'Jeddah',
  'Mecca',
  'Medina',
  'Dammam',
  'Khobar',
  'Dhahran',
  'Jubail',
  'Qatif',
  'Abha',
  'Khamis Mushait',
  'Najran',
  'Jizan',
  'Taif',
  'Tabuk',
  'Hail',
  'Araar',
  'Sakaka',
  'Yanbu',
  'Buraydah',
  'Hofuf',
  'Mubarraz',
  'Other',
] as const;

export type StructureType = (typeof STRUCTURE_TYPES)[number];
export type SaudiCity = (typeof SAUDI_CITIES)[number];

export type ChecklistAnswer = 'yes' | 'no' | 'na' | null;

export interface ProjectChecklistAnswers {
  // Section 1: Kickoff
  contractReceived: ChecklistAnswer;
  contractReceivedNotify: string;
  // Section 2: Financial
  advancePaymentReceived: ChecklistAnswer;
  advancePaymentNotify: string;
  pendingFinancialApprovals: ChecklistAnswer;
  pendingFinancialApprovalsNotify: string;
  // Section 3: ERP
  soCreated: ChecklistAnswer;
  soCreatedNotify: string;
  // Section 4: Scope
  exclusionsOrLimitations: ChecklistAnswer;
  exclusionsNotify: string;
  materialSubmittalRequired: ChecklistAnswer;
  materialSubmittalNotify: string;
  // Section 5: Client Details
  consultantName: string;
  clientPMContact: string;
  specificClientRequirements: ChecklistAnswer;
  clientRequirementsNotify: string;
  communicationProtocols: string;
  // Section 6: Timeline
  criticalDeadlines: string;
  preliminaryScheduleAvailable: ChecklistAnswer;
  scheduleNotify: string;
  projectPriority: string;
  // Section 7: Design & Technical
  ifcAvailable: ChecklistAnswer;
  ifcNotify: string;
  designStatus: string;
  contractRequirementsForDesign: ChecklistAnswer;
  contractRequirementsNotify: string;
  preliminaryDocsProvided: ChecklistAnswer;
  preliminaryDocsDetails: string;
  preliminaryDocsNotify: string;
  additionalDocsRequested: string;
  pendingApprovalsFromSales: ChecklistAnswer;
  salesApprovalsNotify: string;
  unresolvedClientDiscussions: string;
  pebWeldingType: string;
  // Section 8: Site Responsibilities (conditional on erection scope)
  siteTestTypes: string;
}

export const EMPTY_CHECKLIST: ProjectChecklistAnswers = {
  contractReceived: null,
  contractReceivedNotify: '',
  advancePaymentReceived: null,
  advancePaymentNotify: '',
  pendingFinancialApprovals: null,
  pendingFinancialApprovalsNotify: '',
  soCreated: null,
  soCreatedNotify: '',
  exclusionsOrLimitations: null,
  exclusionsNotify: '',
  materialSubmittalRequired: null,
  materialSubmittalNotify: '',
  consultantName: '',
  clientPMContact: '',
  specificClientRequirements: null,
  clientRequirementsNotify: '',
  communicationProtocols: '',
  criticalDeadlines: '',
  preliminaryScheduleAvailable: null,
  scheduleNotify: '',
  projectPriority: '',
  ifcAvailable: null,
  ifcNotify: '',
  designStatus: '',
  contractRequirementsForDesign: null,
  contractRequirementsNotify: '',
  preliminaryDocsProvided: null,
  preliminaryDocsDetails: '',
  preliminaryDocsNotify: '',
  additionalDocsRequested: '',
  pendingApprovalsFromSales: null,
  salesApprovalsNotify: '',
  unresolvedClientDiscussions: '',
  pebWeldingType: '',
  siteTestTypes: '',
};
