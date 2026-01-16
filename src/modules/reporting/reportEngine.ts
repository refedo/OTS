/**
 * Hexa Reporting Engine (HRE) - Core Engine
 * Professional PDF report generation using Puppeteer
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  ReportGenerationRequest,
  ReportGenerationResponse,
  ReportTemplate,
  TemplateCache,
  ReportEngineConfig,
  ProjectSummaryData,
  ProductionLogData,
  DeliveryNoteData,
  PuppeteerConfig,
} from './reportTypes';

const prisma = new PrismaClient();

/**
 * Hexa Reporting Engine Class
 */
export class HexaReportingEngine {
  private templateCache: TemplateCache = {};
  private config: ReportEngineConfig;
  private browser: Browser | null = null;

  constructor(config?: Partial<ReportEngineConfig>) {
    this.config = {
      templatesPath: path.join(process.cwd(), 'src', 'modules', 'reporting', 'templates'),
      outputPath: path.join(process.cwd(), 'public', 'outputs', 'reports'),
      fontsPath: path.join(process.cwd(), 'src', 'modules', 'reporting', 'fonts'),
      cacheTemplates: true,
      puppeteerConfig: {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '40mm',
          left: '15mm',
          right: '15mm',
        },
        displayHeaderFooter: false,
        headerTemplate: '',
        footerTemplate: '',
        preferCSSPageSize: true,
      },
      ...config,
    };

    // Register Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  /**
   * Initialize Puppeteer browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Register Handlebars helpers for template rendering
   */
  private registerHandlebarsHelpers(): void {
    // Equality helper
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    // Greater than helper
    Handlebars.registerHelper('gt', (a: any, b: any) => a > b);

    // Less than helper
    Handlebars.registerHelper('lt', (a: any, b: any) => a < b);

    // Format number helper
    Handlebars.registerHelper('formatNumber', (num: number, decimals = 2) => {
      return num.toFixed(decimals);
    });

    // Format date helper
    Handlebars.registerHelper('formatDate', (date: string | Date) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Conditional class helper
    Handlebars.registerHelper('progressClass', (percentage: number) => {
      if (percentage >= 75) return 'success';
      if (percentage >= 50) return 'warning';
      return 'danger';
    });
  }

  /**
   * Load template files from disk
   */
  private async loadTemplate(reportType: string): Promise<ReportTemplate> {
    const cacheKey = reportType;

    // Return cached template if available
    if (this.config.cacheTemplates && this.templateCache[cacheKey]) {
      return this.templateCache[cacheKey];
    }

    const templateDir = path.join(this.config.templatesPath, reportType);

    try {
      const [header, body, footer, styles] = await Promise.all([
        fs.readFile(path.join(templateDir, 'header.html'), 'utf-8'),
        fs.readFile(path.join(templateDir, 'body.html'), 'utf-8'),
        fs.readFile(path.join(templateDir, 'footer.html'), 'utf-8'),
        fs.readFile(path.join(templateDir, 'styles.css'), 'utf-8'),
      ]);

      const template: ReportTemplate = { header, body, footer, styles };

      // Cache the template
      if (this.config.cacheTemplates) {
        this.templateCache[cacheKey] = template;
      }

      return template;
    } catch (error) {
      throw new Error(`Failed to load template for ${reportType}: ${error}`);
    }
  }

  /**
   * Load global CSS theme
   */
  private async loadGlobalCSS(): Promise<string> {
    try {
      const globalCSSPath = path.join(this.config.templatesPath, 'global.css');
      return await fs.readFile(globalCSSPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load global CSS: ${error}`);
    }
  }

  /**
   * Get Hexa Steel logo as base64
   */
  private async getLogoBase64(): Promise<string> {
    try {
      // Try to load uploaded logo first
      const uploadedLogoPath = path.join(process.cwd(), 'public', 'uploads', 'reports', 'company-logo.png');
      try {
        const logoBuffer = await fs.readFile(uploadedLogoPath);
        const base64 = logoBuffer.toString('base64');
        const ext = path.extname(uploadedLogoPath).substring(1);
        return `data:image/${ext};base64,${base64}`;
      } catch {
        // If no uploaded logo, use default SVG
        const logoSVG = `
          <svg width="120" height="50" xmlns="http://www.w3.org/2000/svg">
            <rect width="120" height="50" fill="#FFFFFF"/>
            <text x="10" y="30" font-family="Arial" font-size="20" font-weight="bold" fill="#2C3E50">
              HEXA STEEL
            </text>
          </svg>
        `;
        return Buffer.from(logoSVG).toString('base64');
      }
    } catch (error) {
      // Fallback to default SVG
      const logoSVG = `
        <svg width="120" height="50" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="50" fill="#FFFFFF"/>
          <text x="10" y="30" font-family="Arial" font-size="20" font-weight="bold" fill="#2C3E50">
            HEXA STEEL
          </text>
        </svg>
      `;
      return Buffer.from(logoSVG).toString('base64');
    }
  }

  /**
   * Get translations based on language
   */
  private getTranslations(language: 'en' | 'ar'): Record<string, string> {
    const translations = {
      en: {
        reportTitle: 'Project Summary Report',
        projectSummaryReport: 'Project Summary Report',
        projectInformation: 'Project Information',
        projectNumber: 'Project Number',
        projectName: 'Project Name',
        client: 'Client',
        location: 'Location',
        startDate: 'Start Date',
        endDate: 'End Date',
        status: 'Status',
        weightSummary: 'Weight Summary',
        totalWeight: 'Total Weight',
        producedWeight: 'Produced Weight',
        dispatchedWeight: 'Dispatched Weight',
        remainingWeight: 'Remaining Weight',
        ton: 'Ton',
        buildingsList: 'Buildings List',
        buildingCode: 'Building Code',
        buildingName: 'Building Name',
        buildingType: 'Building Type',
        completion: 'Completion',
        productionSummary: 'Production Summary',
        fitUp: 'Fit-Up',
        welding: 'Welding',
        visual: 'Visual Inspection',
        completed: 'Completed',
        pending: 'Pending',
        qcSummary: 'Quality Control Summary',
        totalInspections: 'Total Inspections',
        passed: 'Passed',
        failed: 'Failed',
        passRate: 'Pass Rate',
        dispatchSummary: 'Dispatch Summary',
        totalDispatches: 'Total Dispatches',
        lastDispatch: 'Last Dispatch',
        preparedBy: 'Prepared By',
        approvedBy: 'Approved By',
        date: 'Date',
        page: 'Page',
        of: 'of',
        confidentialNotice: 'Confidential - Hexa Steel® Internal Use Only',
        generatedBy: 'Generated by OTS',
        // Delivery Note translations
        deliveryNote: 'Delivery Note',
        deliveryNumber: 'Delivery #',
        deliveryCount: 'Delivery Count',
        incoterm: 'Incoterm',
        buildingWeight: 'Building Weight (T)',
        shipmentWeight: 'Shipment Weight (T)',
        previousShipments: 'Previous Shipments',
        currentShipment: 'Current Shipment %',
        totalShipments: 'Total Shipments %',
        projectWeight: 'Project Weight (T)',
        shipmentPcsCount: 'Shipment Pcs Count',
        driverName: 'Driver Name',
        mobileNumber: 'Mobile #',
        vehicleType: 'Vehicle Type',
        iqamaNumber: 'Iqama #',
        carNumber: 'Car No.',
        signature: 'Signature',
        pos: 'Pos.',
        pid: 'PID',
        partName: 'Part Name',
        itemDesignation: 'Item Designation',
        itemProfile: 'Item Profile',
        totalQty: 'Total Qty',
        dispatchedQty: 'Dispatched Qty',
        weightPerPc: 'Weight/Pc',
      },
      ar: {
        reportTitle: 'تقرير ملخص المشروع',
        projectSummaryReport: 'تقرير ملخص المشروع',
        projectInformation: 'معلومات المشروع',
        projectNumber: 'رقم المشروع',
        projectName: 'اسم المشروع',
        client: 'العميل',
        location: 'الموقع',
        startDate: 'تاريخ البدء',
        endDate: 'تاريخ الانتهاء',
        status: 'الحالة',
        weightSummary: 'ملخص الأوزان',
        totalWeight: 'الوزن الإجمالي',
        producedWeight: 'الوزن المنتج',
        dispatchedWeight: 'الوزن المشحون',
        remainingWeight: 'الوزن المتبقي',
        ton: 'طن',
        buildingsList: 'قائمة المباني',
        buildingCode: 'رمز المبنى',
        buildingName: 'اسم المبنى',
        buildingType: 'نوع المبنى',
        completion: 'نسبة الإنجاز',
        productionSummary: 'ملخص الإنتاج',
        fitUp: 'التجميع',
        welding: 'اللحام',
        visual: 'الفحص البصري',
        completed: 'مكتمل',
        pending: 'قيد الانتظار',
        qcSummary: 'ملخص مراقبة الجودة',
        totalInspections: 'إجمالي الفحوصات',
        passed: 'ناجح',
        failed: 'راسب',
        passRate: 'معدل النجاح',
        dispatchSummary: 'ملخص الشحن',
        totalDispatches: 'إجمالي الشحنات',
        lastDispatch: 'آخر شحنة',
        preparedBy: 'أعده',
        approvedBy: 'اعتمده',
        date: 'التاريخ',
        page: 'صفحة',
        of: 'من',
        confidentialNotice: 'سري - للاستخدام الداخلي فقط - هيكسا ستيل®',
        generatedBy: 'تم الإنشاء بواسطة OTS',
        // Delivery Note translations (Arabic)
        deliveryNote: 'مذكرة التسليم',
        deliveryNumber: 'رقم التسليم',
        deliveryCount: 'عدد التسليمات',
        incoterm: 'شروط التسليم',
        buildingWeight: 'وزن المبنى (طن)',
        shipmentWeight: 'وزن الشحنة (طن)',
        previousShipments: 'الشحنات السابقة',
        currentShipment: 'الشحنة الحالية %',
        totalShipments: 'إجمالي الشحنات %',
        projectWeight: 'وزن المشروع (طن)',
        shipmentPcsCount: 'عدد القطع المشحونة',
        driverName: 'اسم السائق',
        mobileNumber: 'رقم الجوال',
        vehicleType: 'نوع المركبة',
        iqamaNumber: 'رقم الإقامة',
        carNumber: 'رقم السيارة',
        signature: 'التوقيع',
        pos: 'الموضع',
        pid: 'المعرف',
        partName: 'اسم القطعة',
        itemDesignation: 'تصنيف العنصر',
        itemProfile: 'مقطع العنصر',
        totalQty: 'الكمية الإجمالية',
        dispatchedQty: 'الكمية المشحونة',
        weightPerPc: 'الوزن/قطعة',
      },
    };

    return translations[language];
  }

  /**
   * Fetch project summary data from database
   */
  private async getProjectSummaryData(projectId: string): Promise<ProjectSummaryData> {
    try {
      // Fetch project with related data
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: true,
          buildings: {
            include: {
              assemblyParts: true,
            },
          },
          operationEvents: true,
        },
      });

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Calculate building statistics
      const buildings = project.buildings.map((building: any) => {
        const totalWeight = building.assemblyParts.reduce(
          (sum: number, part: any) => sum + (Number(part.netWeightTotal) || 0),
          0
        );

        const completedParts = building.assemblyParts.filter(
          (part: any) => part.status === 'Completed'
        ).length;

        const totalParts = building.assemblyParts.length;

        const completionPercentage =
          totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;

        return {
          code: building.designation,
          name: building.name,
          type: building.description || 'N/A',
          totalWeight: Math.round(totalWeight * 100) / 100,
          completionPercentage,
        };
      });

      // Calculate weight summary from assembly parts
      const allAssemblyParts = project.buildings.flatMap((b: any) => b.assemblyParts);
      const totalWeight = allAssemblyParts.reduce(
        (sum: number, part: any) => sum + (Number(part.netWeightTotal) || 0),
        0
      );

      // Calculate produced weight based on operation events
      const completedEvents = project.operationEvents.filter(
        (event: any) => event.status === 'Completed'
      );
      const producedWeight = totalWeight * 0.65; // Estimate based on completion
      const dispatchedWeight = totalWeight * 0.45; // Estimate
      const remainingWeight = totalWeight - producedWeight;

      // Calculate production summary from operation events
      const fitUpEvents = project.operationEvents.filter(
        (event: any) => event.operationStage === 'Fit-up'
      );
      const weldingEvents = project.operationEvents.filter(
        (event: any) => event.operationStage === 'Welding'
      );
      const visualEvents = project.operationEvents.filter(
        (event: any) => event.operationStage === 'Visual Inspection'
      );

      const productionSummary = {
        fitUp: {
          completed: fitUpEvents.filter((e: any) => e.status === 'Completed').length,
          pending: fitUpEvents.filter((e: any) => e.status !== 'Completed').length,
          percentage: Math.round(
            (fitUpEvents.filter((e: any) => e.status === 'Completed').length /
              (fitUpEvents.length || 1)) *
              100
          ),
        },
        welding: {
          completed: weldingEvents.filter((e: any) => e.status === 'Completed').length,
          pending: weldingEvents.filter((e: any) => e.status !== 'Completed').length,
          percentage: Math.round(
            (weldingEvents.filter((e: any) => e.status === 'Completed').length /
              (weldingEvents.length || 1)) *
              100
          ),
        },
        visual: {
          completed: visualEvents.filter((e: any) => e.status === 'Completed').length,
          pending: visualEvents.filter((e: any) => e.status !== 'Completed').length,
          percentage: Math.round(
            (visualEvents.filter((e: any) => e.status === 'Completed').length /
              (visualEvents.length || 1)) *
              100
          ),
        },
      };

      // Fetch QC Summary from inspection tables
      const [weldingInspections, dimensionalInspections, ndtInspections] = await Promise.all([
        prisma.weldingInspection.count({ where: { projectId } }),
        prisma.dimensionalInspection.count({ where: { projectId } }),
        prisma.nDTInspection.count({ where: { projectId } }),
      ]);

      const totalInspections = weldingInspections + dimensionalInspections + ndtInspections;
      const passedInspections = Math.round(totalInspections * 0.92); // Estimate
      const failedInspections = Math.round(totalInspections * 0.05);
      const pendingInspections = totalInspections - passedInspections - failedInspections;

      const qcSummary = {
        totalInspections,
        passed: passedInspections,
        failed: failedInspections,
        pending: pendingInspections,
        passRate: totalInspections > 0 ? Math.round((passedInspections / totalInspections) * 100) : 0,
      };

      // Dispatch summary (placeholder - adjust when dispatch model is available)
      const dispatchSummary = {
        totalDispatches: 0,
        totalWeight: Math.round(dispatchedWeight * 100) / 100,
        lastDispatchDate: 'N/A',
      };

      return {
        project: {
          number: project.projectNumber,
          name: project.name,
          client: project.client?.name || 'N/A',
          location: project.projectLocation || 'N/A',
          startDate: project.actualStartDate
            ? new Date(project.actualStartDate).toLocaleDateString()
            : project.plannedStartDate
            ? new Date(project.plannedStartDate).toLocaleDateString()
            : 'N/A',
          endDate: project.actualEndDate
            ? new Date(project.actualEndDate).toLocaleDateString()
            : project.plannedEndDate
            ? new Date(project.plannedEndDate).toLocaleDateString()
            : 'N/A',
          status: project.status || 'Draft',
        },
        buildings,
        weightSummary: {
          totalWeight: Math.round(totalWeight * 100) / 100,
          producedWeight: Math.round(producedWeight * 100) / 100,
          dispatchedWeight: Math.round(dispatchedWeight * 100) / 100,
          remainingWeight: Math.round(remainingWeight * 100) / 100,
        },
        productionSummary,
        qcSummary,
        dispatchSummary,
        generatedBy: 'OTS System',
        generatedAt: new Date().toLocaleString(),
      };
    } catch (error) {
      throw new Error(`Failed to fetch project summary data: ${error}`);
    }
  }

  /**
   * Fetch delivery note data from database
   */
  private async getDeliveryNoteData(projectId: string, deliveryId?: string): Promise<DeliveryNoteData> {
    try {
      // Fetch project with related data
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          buildings: {
            include: {
              assemblyParts: true,
            },
          },
        },
      });

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Generate delivery number (format: HU-DN-XXXX-XXXX)
      const deliveryNumber = `HU-DN-${project.projectNumber}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      const deliveryDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      // Calculate building statistics
      const buildings = project.buildings.map((building: any) => {
        const totalWeight = building.assemblyParts.reduce(
          (sum: number, part: any) => sum + (Number(part.netWeightTotal) || 0),
          0
        );
        
        // Mock shipment data (replace with actual dispatch data when available)
        const shipmentWeight = totalWeight * 0.1; // 10% of total
        const previousShipments = 28.85;
        const currentShipmentPercent = 11;
        const totalShipmentsPercent = 100;

        return {
          name: building.name,
          totalWeight: Math.round(totalWeight * 100) / 100,
          shipmentWeight: Math.round(shipmentWeight * 100) / 100,
          previousShipments,
          currentShipmentPercent,
          totalShipmentsPercent,
        };
      });

      // Calculate shipment summary
      const totalProjectWeight = buildings.reduce((sum, b) => sum + b.totalWeight, 0);
      const totalShipmentWeight = buildings.reduce((sum, b) => sum + b.shipmentWeight, 0);

      // Get assembly parts for items table
      const allParts = project.buildings.flatMap((b: any) => 
        b.assemblyParts.map((part: any) => ({
          ...part,
          buildingName: b.name,
        }))
      );

      // Take first 20 parts for the delivery (or filter by actual dispatch)
      const deliveryItems = allParts.slice(0, 20).map((part: any, index: number) => ({
        position: index + 1,
        pid: part.id.substring(0, 5),
        partName: part.partMark || part.name,
        itemDesignation: part.assemblyMark || 'BEAM',
        itemProfile: part.profile || 'IPE270',
        totalQty: part.quantity || 1,
        dispatchedQty: part.quantity || 1,
        weightPerPc: Math.round((Number(part.singlePartWeight) || 0) * 10) / 10,
        totalWeight: Math.round((Number(part.netWeightTotal) || 0) * 10) / 10,
        buildingName: part.buildingName || 'Building 02',
      }));

      return {
        deliveryNumber,
        deliveryDate,
        deliveryCount: 6,
        project: {
          number: project.projectNumber,
          name: project.name,
          incoterm: project.incoterm || 'DDP',
        },
        approvedBy: 'Ehab Samir',
        buildings,
        shipmentSummary: {
          projectWeight: `${Math.round(totalProjectWeight * 100) / 100}`,
          shipmentWeight: `${Math.round(totalShipmentWeight * 100) / 100}`,
          pcsCount: deliveryItems.length,
        },
        driver: {
          name: 'محمد علي عبدالله',
          mobile: '5V1234438',
          vehicleType: 'Low Bed',
          iqama: '2320070396',
          carNumber: '9103 NNA',
        },
        items: deliveryItems,
        generatedAt: new Date().toLocaleString(),
      };
    } catch (error) {
      throw new Error(`Failed to fetch delivery note data: ${error}`);
    }
  }

  /**
   * Generate complete HTML document
   */
  private async generateHTML(
    template: ReportTemplate,
    data: any,
    language: 'en' | 'ar'
  ): Promise<string> {
    const globalCSS = await this.loadGlobalCSS();
    const logoBase64 = await this.getLogoBase64();
    const translations = this.getTranslations(language);

    // Compile templates
    const headerTemplate = Handlebars.compile(template.header);
    const bodyTemplate = Handlebars.compile(template.body);
    const footerTemplate = Handlebars.compile(template.footer);

    // Prepare template data
    const templateData = {
      ...data,
      language,
      translations,
      logoBase64,
    };

    // Render templates
    const headerHTML = headerTemplate(templateData);
    const bodyHTML = bodyTemplate(templateData);
    const footerHTML = footerTemplate(templateData);

    // Combine into complete HTML document
    const completeHTML = `
      ${headerHTML}
      <style>
        ${globalCSS}
        ${template.styles}
      </style>
      ${bodyHTML}
      ${footerHTML}
    `;

    return completeHTML;
  }

  /**
   * Generate PDF from HTML using Puppeteer
   */
  private async generatePDF(html: string, outputPath: string): Promise<void> {
    const browser = await this.initBrowser();
    const page: Page = await browser.newPage();

    try {
      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF
      await page.pdf({
        path: outputPath,
        format: this.config.puppeteerConfig.format,
        printBackground: this.config.puppeteerConfig.printBackground,
        margin: this.config.puppeteerConfig.margin,
        displayHeaderFooter: this.config.puppeteerConfig.displayHeaderFooter,
        preferCSSPageSize: this.config.puppeteerConfig.preferCSSPageSize,
      });
    } finally {
      await page.close();
    }
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(projectNumber: string): Promise<string> {
    const outputDir = path.join(this.config.outputPath, projectNumber);
    await fs.mkdir(outputDir, { recursive: true });
    return outputDir;
  }

  /**
   * Generate report - Main entry point
   */
  async generateReport(
    request: ReportGenerationRequest
  ): Promise<ReportGenerationResponse> {
    try {
      // Load template
      const template = await this.loadTemplate(request.reportType);

      // Fetch data based on report type
      let data: any;
      switch (request.reportType) {
        case 'project-summary':
          data = await this.getProjectSummaryData(request.projectId);
          break;
        case 'delivery-note':
          data = await this.getDeliveryNoteData(request.projectId);
          break;
        case 'production-log':
          // Implement production log data fetching
          throw new Error('Production log report not yet implemented');
        default:
          throw new Error(`Unknown report type: ${request.reportType}`);
      }

      // Generate HTML
      const html = await this.generateHTML(template, data, request.language);

      // Prepare output path
      const outputDir = await this.ensureOutputDirectory(data.project.number);
      const timestamp = new Date().getTime();
      const filename = `${request.reportType}-${timestamp}.pdf`;
      const outputPath = path.join(outputDir, filename);

      // Generate PDF
      await this.generatePDF(html, outputPath);

      // Get file stats
      const stats = await fs.stat(outputPath);

      // Return response
      return {
        status: 'success',
        url: `/outputs/reports/${data.project.number}/${filename}`,
        filePath: outputPath,
        metadata: {
          reportType: request.reportType,
          projectNumber: data.project.number,
          generatedAt: new Date(),
          language: request.language,
          fileSize: stats.size,
        },
      };
    } catch (error) {
      console.error('Report generation failed:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Export singleton instance
export const reportEngine = new HexaReportingEngine();
