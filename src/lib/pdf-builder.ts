import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ReportTheme = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  headerBg: string;
  headerText: string;
};

export const themes: Record<string, ReportTheme> = {
  steel: {
    primaryColor: '#2c3e50',
    secondaryColor: '#34495e',
    accentColor: '#7f8c8d',
    textColor: '#1f2937',
    headerBg: '#2c3e50',
    headerText: '#ffffff',
  },
  blue: {
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    accentColor: '#60a5fa',
    textColor: '#1f2937',
    headerBg: '#1e40af',
    headerText: '#ffffff',
  },
  green: {
    primaryColor: '#15803d',
    secondaryColor: '#22c55e',
    accentColor: '#86efac',
    textColor: '#1f2937',
    headerBg: '#15803d',
    headerText: '#ffffff',
  },
  orange: {
    primaryColor: '#ea580c',
    secondaryColor: '#f97316',
    accentColor: '#fb923c',
    textColor: '#1f2937',
    headerBg: '#ea580c',
    headerText: '#ffffff',
  },
  purple: {
    primaryColor: '#7c3aed',
    secondaryColor: '#a855f7',
    accentColor: '#c084fc',
    textColor: '#1f2937',
    headerBg: '#7c3aed',
    headerText: '#ffffff',
  },
  red: {
    primaryColor: '#dc2626',
    secondaryColor: '#ef4444',
    accentColor: '#f87171',
    textColor: '#1f2937',
    headerBg: '#dc2626',
    headerText: '#ffffff',
  },
};

export type LogoData = {
  base64: string;
  aspectRatio: number;
  isWhite: boolean;
};

export class PDFReportBuilder {
  private doc: jsPDF;
  private theme: ReportTheme;
  private currentY: number = 20;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 15;

  constructor(
    orientation: 'portrait' | 'landscape' = 'portrait',
    themeName: keyof typeof themes = 'blue'
  ) {
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });
    this.doc.setFont('times', 'normal');
    this.theme = themes[themeName];
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  addHeader(
    companyName: string,
    companyTagline: string,
    logo?: LogoData
  ): void {
    const headerHeight = 28;

    this.doc.setFillColor(this.theme.headerBg);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');

    let textOffsetX = this.margin;

    if (logo) {
      try {
        const maxH = 18;
        const maxW = 28;
        const h = Math.min(maxH, maxW / logo.aspectRatio);
        const w = Math.min(maxW, h * logo.aspectRatio);
        const format = logo.base64.includes('data:image/png') ? 'PNG' : 'JPEG';
        if (!logo.isWhite) {
          this.doc.setFillColor(255, 255, 255);
          this.doc.roundedRect(this.margin - 1, (headerHeight - h) / 2 - 1, w + 2, h + 2, 2, 2, 'F');
        }
        this.doc.addImage(logo.base64, format, this.margin, (headerHeight - h) / 2, w, h);
        textOffsetX = this.margin + w + 4;
      } catch {
        // logo load failed — skip silently
      }
    }

    this.doc.setTextColor(this.theme.headerText);
    this.doc.setFontSize(15);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(companyName, textOffsetX, 13);

    this.doc.setFontSize(7.5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(companyTagline, textOffsetX, 20);

    this.currentY = headerHeight + 5;
    this.doc.setTextColor(this.theme.textColor);
    this.doc.setFont('times', 'normal');
  }

  addTitle(title: string, subtitle?: string): void {
    this.doc.setFontSize(17);
    this.doc.setFont('times', 'bold');
    this.doc.setTextColor(this.theme.primaryColor);
    this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;

    if (subtitle) {
      this.doc.setFontSize(9.5);
      this.doc.setFont('times', 'italic');
      this.doc.setTextColor(80, 80, 80);
      this.doc.text(subtitle, this.pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 6;
    }

    this.currentY += 4;
    this.doc.setTextColor(this.theme.textColor);
    this.doc.setFont('times', 'normal');
  }

  addMetadataBox(metadata: Record<string, string>): void {
    const boxWidth = 65;
    const boxX = this.pageWidth - this.margin - boxWidth;
    const lineHeight = 5.5;
    const boxHeight = Object.keys(metadata).length * lineHeight + 5;

    this.doc.setFillColor(248, 249, 250);
    this.doc.rect(boxX, this.currentY, boxWidth, boxHeight, 'F');
    this.doc.setDrawColor(this.theme.primaryColor);
    this.doc.setLineWidth(0.4);
    this.doc.rect(boxX, this.currentY, boxWidth, boxHeight);

    this.doc.setFontSize(8);
    let metaY = this.currentY + 5;

    Object.entries(metadata).forEach(([key, value]) => {
      this.doc.setFont('times', 'bold');
      this.doc.setTextColor(60, 60, 60);
      this.doc.text(`${key}:`, boxX + 2, metaY);
      this.doc.setFont('times', 'normal');
      this.doc.setTextColor(this.theme.textColor);
      this.doc.text(value, boxX + 22, metaY);
      metaY += lineHeight;
    });

    this.currentY += boxHeight + 5;
  }

  addSectionHeader(title: string): void {
    this.checkPageBreak(12);

    this.doc.setFillColor(this.theme.primaryColor);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 7, 'F');

    this.doc.setTextColor(this.theme.headerText);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin + 3, this.currentY + 5);

    this.currentY += 10;
    this.doc.setTextColor(this.theme.textColor);
    this.doc.setFont('times', 'normal');
  }

  addInfoGrid(data: Record<string, string | number>, columns: number = 2): void {
    this.checkPageBreak(20);

    const entries = Object.entries(data);
    const columnWidth = (this.pageWidth - 2 * this.margin) / columns;
    const lineHeight = 6;
    let col = 0;
    let row = 0;

    entries.forEach(([key, value]) => {
      const x = this.margin + col * columnWidth;
      const y = this.currentY + row * lineHeight;

      this.doc.setFontSize(8);
      this.doc.setFont('times', 'bold');
      this.doc.setTextColor(80, 80, 80);
      this.doc.text(`${key}:`, x, y);

      this.doc.setFont('times', 'normal');
      this.doc.setTextColor(this.theme.textColor);
      this.doc.text(String(value), x + 35, y);

      col++;
      if (col >= columns) {
        col = 0;
        row++;
      }
    });

    this.currentY += Math.ceil(entries.length / columns) * lineHeight + 5;
  }

  addTable(
    headers: string[],
    rows: (string | number)[][],
    options?: {
      headerBg?: string;
      headerText?: string;
      alternateRows?: boolean;
    }
  ): void {
    this.checkPageBreak(30);

    autoTable(this.doc, {
      head: [headers],
      body: rows,
      startY: this.currentY,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid',
      headStyles: {
        fillColor: options?.headerBg || this.theme.primaryColor,
        textColor: options?.headerText || this.theme.headerText,
        fontStyle: 'bold',
        font: 'helvetica',
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: this.theme.textColor,
        font: 'times',
      },
      alternateRowStyles: options?.alternateRows ? { fillColor: [248, 249, 250] } : undefined,
    });

    this.currentY = (this.doc as Record<string, unknown> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  addParagraph(text: string, fontSize: number = 9): void {
    this.checkPageBreak(20);

    this.doc.setFontSize(fontSize);
    this.doc.setFont('times', 'normal');
    this.doc.setTextColor(this.theme.textColor);

    const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * (fontSize * 0.42) + 4;
  }

  addSignatureSection(
    signatures: { label: string; name?: string; date?: string }[]
  ): void {
    this.checkPageBreak(35);

    const sigWidth = (this.pageWidth - 2 * this.margin) / signatures.length;

    signatures.forEach((sig, index) => {
      const x = this.margin + index * sigWidth;

      this.doc.setFontSize(8);
      this.doc.setFont('times', 'bold');
      this.doc.setTextColor(this.theme.textColor);
      this.doc.text(sig.label, x, this.currentY);

      this.doc.setLineWidth(0.3);
      this.doc.setDrawColor(150, 150, 150);
      this.doc.line(x, this.currentY + 16, x + sigWidth - 8, this.currentY + 16);

      if (sig.name) {
        this.doc.setFont('times', 'normal');
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(80, 80, 80);
        this.doc.text(sig.name, x, this.currentY + 20);
      }

      if (sig.date) {
        this.doc.setFont('times', 'normal');
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(120, 120, 120);
        this.doc.text(sig.date, x, this.currentY + 24);
      }
    });

    this.currentY += 32;
  }

  // formRef: e.g. "HEXA-FRM-011 · HEXA-FRM-012 · Procedure: Hexa-ISP-003"
  addFooter(text: string, formRef?: string): void {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);

      // Thin separator line
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.3);
      this.doc.line(this.margin, this.pageHeight - 16, this.pageWidth - this.margin, this.pageHeight - 16);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(140, 140, 140);

      if (formRef) {
        this.doc.text(formRef, this.pageWidth / 2, this.pageHeight - 13, { align: 'center' });
        this.doc.text(text, this.pageWidth / 2, this.pageHeight - 9.5, { align: 'center' });
      } else {
        this.doc.text(text, this.pageWidth / 2, this.pageHeight - 11, { align: 'center' });
      }

      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 11,
        { align: 'right' }
      );
    }
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 22) {
      this.doc.addPage();
      this.currentY = 20;
    }
  }

  save(filename: string): void {
    this.doc.save(filename);
  }

  getBlob(): Blob {
    return this.doc.output('blob');
  }

  getDataURL(): string {
    return this.doc.output('dataurlstring');
  }
}
