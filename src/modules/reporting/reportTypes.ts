/**
 * Hexa Reporting Engine (HRE) - Type Definitions
 * Professional PDF report generation for OTS
 */

export type ReportLanguage = 'en' | 'ar';

export type ReportType = 
  | 'project-summary'
  | 'production-log'
  | 'qc-report'
  | 'dispatch-report'
  | 'delivery-note';

export interface ReportGenerationRequest {
  reportType: ReportType;
  projectId: string;
  language: ReportLanguage;
  options?: ReportOptions;
}

export interface ReportOptions {
  includeCharts?: boolean;
  includeImages?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  customTitle?: string;
  watermark?: string;
}

export interface ReportGenerationResponse {
  status: 'success' | 'error';
  url?: string;
  filePath?: string;
  error?: string;
  metadata?: ReportMetadata;
}

export interface ReportMetadata {
  reportType: ReportType;
  projectNumber: string;
  generatedAt: Date;
  language: ReportLanguage;
  pageCount?: number;
  fileSize?: number;
}

export interface ReportTemplate {
  header: string;
  body: string;
  footer: string;
  styles: string;
}

export interface ProjectSummaryData {
  project: {
    number: string;
    name: string;
    client: string;
    location: string;
    startDate: string;
    endDate?: string;
    status: string;
  };
  buildings: Array<{
    code: string;
    name: string;
    type: string;
    totalWeight: number;
    completionPercentage: number;
  }>;
  weightSummary: {
    totalWeight: number;
    producedWeight: number;
    dispatchedWeight: number;
    remainingWeight: number;
  };
  productionSummary: {
    fitUp: {
      completed: number;
      pending: number;
      percentage: number;
    };
    welding: {
      completed: number;
      pending: number;
      percentage: number;
    };
    visual: {
      completed: number;
      pending: number;
      percentage: number;
    };
  };
  qcSummary: {
    totalInspections: number;
    passed: number;
    failed: number;
    pending: number;
    passRate: number;
  };
  dispatchSummary: {
    totalDispatches: number;
    totalWeight: number;
    lastDispatchDate?: string;
  };
  generatedBy: string;
  generatedAt: string;
}

export interface ProductionLogData {
  project: {
    number: string;
    name: string;
  };
  dateRange: {
    from: string;
    to: string;
  };
  entries: Array<{
    date: string;
    assemblyMark: string;
    operation: string;
    operator: string;
    status: string;
    weight: number;
    notes?: string;
  }>;
  summary: {
    totalEntries: number;
    totalWeight: number;
    operationBreakdown: Record<string, number>;
  };
}

export interface DeliveryNoteData {
  deliveryNumber: string;
  deliveryDate: string;
  deliveryCount: number;
  project: {
    number: string;
    name: string;
    incoterm: string;
  };
  approvedBy: string;
  buildings: Array<{
    name: string;
    totalWeight: number;
    shipmentWeight: number;
    previousShipments: number;
    currentShipmentPercent: number;
    totalShipmentsPercent: number;
  }>;
  shipmentSummary: {
    projectWeight: string;
    shipmentWeight: string;
    pcsCount: number;
  };
  driver: {
    name: string;
    mobile: string;
    vehicleType: string;
    iqama: string;
    carNumber: string;
  };
  items: Array<{
    position: number;
    pid: string;
    partName: string;
    itemDesignation: string;
    itemProfile: string;
    totalQty: number;
    dispatchedQty: number;
    weightPerPc: number;
    totalWeight: number;
    buildingName: string;
  }>;
  generatedAt: string;
}

export interface PuppeteerConfig {
  format: 'A4';
  printBackground: boolean;
  margin: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  displayHeaderFooter: boolean;
  headerTemplate: string;
  footerTemplate: string;
  preferCSSPageSize: boolean;
}

export interface TemplateCache {
  [key: string]: ReportTemplate;
}

export interface ReportEngineConfig {
  templatesPath: string;
  outputPath: string;
  fontsPath: string;
  cacheTemplates: boolean;
  puppeteerConfig: Partial<PuppeteerConfig>;
}
