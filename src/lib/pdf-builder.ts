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

export type PDFFontFamily = 'helvetica' | 'courier' | 'times';

export const PDF_FONT_LABELS: Record<PDFFontFamily, string> = {
  helvetica: 'Helvetica',
  courier: 'Courier',
  times: 'Times New Roman',
};

export class PDFReportBuilder {
  private doc: jsPDF;
  private theme: ReportTheme;
  private font: PDFFontFamily;
  private currentY: number = 20;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 15;

  constructor(
    orientation: 'portrait' | 'landscape' = 'portrait',
    themeName: keyof typeof themes = 'blue',
    fontFamily: PDFFontFamily = 'helvetica'
  ) {
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });
    this.font = fontFamily;
    this.doc.setFont(this.font, 'normal');
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
    this.doc.setFont(this.font, 'bold');
    this.doc.text(companyName, textOffsetX, 13);

    this.doc.setFontSize(7.5);
    this.doc.setFont(this.font, 'normal');
    this.doc.text(companyTagline, textOffsetX, 20);

    this.currentY = headerHeight + 5;
    this.doc.setTextColor(this.theme.textColor);
    this.doc.setFont(this.font, 'normal');
  }

  addTitle(title: string, subtitle?: string): void {
    this.doc.setFontSize(17);
    this.doc.setFont(this.font, 'bold');
    this.doc.setTextColor(this.theme.primaryColor);
    this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;

    if (subtitle) {
      this.doc.setFontSize(9.5);
      this.doc.setFont(this.font, 'italic');
      this.doc.setTextColor(80, 80, 80);
      this.doc.text(subtitle, this.pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 6;
    }

    this.currentY += 4;
    this.doc.setTextColor(this.theme.textColor);
    this.doc.setFont(this.font, 'normal');
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
      this.doc.setFont(this.font, 'bold');
      this.doc.setTextColor(60, 60, 60);
      this.doc.text(`${key}:`, boxX + 2, metaY);
      this.doc.setFont(this.font, 'normal');
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
    this.doc.setFont(this.font, 'bold');
    this.doc.text(title, this.margin + 3, this.currentY + 5);

    this.currentY += 10;
    this.doc.setTextColor(this.theme.textColor);
    this.doc.setFont(this.font, 'normal');
  }

  addInfoGrid(data: Record<string, string | number>, columns: number = 2): void {
    this.checkPageBreak(20);

    const entries = Object.entries(data);
    const columnWidth = (this.pageWidth - 2 * this.margin) / columns;
    const labelWidth = 32;
    const valueMaxWidth = columnWidth - labelWidth - 3;
    const lineHeight = 6;
    let col = 0;
    let row = 0;

    entries.forEach(([key, value]) => {
      const x = this.margin + col * columnWidth;
      const y = this.currentY + row * lineHeight;

      this.doc.setFontSize(8);
      this.doc.setFont(this.font, 'bold');
      this.doc.setTextColor(80, 80, 80);
      this.doc.text(`${key}:`, x, y);

      this.doc.setFont(this.font, 'normal');
      this.doc.setTextColor(this.theme.textColor);
      const lines = this.doc.splitTextToSize(String(value), valueMaxWidth);
      this.doc.text(lines[0] as string, x + labelWidth, y);

      col++;
      if (col >= columns) {
        col = 0;
        row++;
      }
    });

    this.currentY += Math.ceil(entries.length / columns) * lineHeight + 5;
  }

  addItemInspectionTable(
    itemName: string,
    result: string,
    rows: string[][],
  ): void {
    this.checkPageBreak(45);

    const resultColors: Record<string, [number, number, number]> = {
      Accepted: [22, 163, 74],
      Rejected: [220, 38, 38],
      Pending:  [107, 114, 128],
    };
    const resultColor = resultColors[result] ?? [107, 114, 128];

    // Item header bar
    this.doc.setFillColor(240, 242, 245);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.2);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8);

    // Left accent bar
    this.doc.setFillColor(...resultColor);
    this.doc.rect(this.margin, this.currentY, 2, 8, 'F');

    this.doc.setFontSize(8.5);
    this.doc.setFont(this.font, 'bold');
    this.doc.setTextColor(this.theme.textColor);
    const truncated = itemName.length > 90 ? itemName.slice(0, 88) + '…' : itemName;
    this.doc.text(truncated, this.margin + 5, this.currentY + 5.5);

    // Result badge on right
    this.doc.setFontSize(8);
    this.doc.setFont(this.font, 'bold');
    this.doc.setTextColor(...resultColor);
    this.doc.text(result, this.pageWidth - this.margin - 2, this.currentY + 5.5, { align: 'right' });

    this.currentY += 9;

    autoTable(this.doc, {
      body: rows,
      startY: this.currentY,
      margin: { left: this.margin + 2, right: this.margin },
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold', textColor: [80, 80, 80], fontSize: 7.5 },
        1: { cellWidth: 'auto', fontSize: 7.5 },
        2: { cellWidth: 28, fontStyle: 'bold', textColor: [80, 80, 80], fontSize: 7.5 },
        3: { cellWidth: 'auto', fontSize: 7.5 },
      },
      bodyStyles: { cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
      alternateRowStyles: { fillColor: [250, 251, 252] },
    });

    this.currentY = (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  }

  addWorkflowStatusBadge(label: string, r: number, g: number, b: number): void {
    this.checkPageBreak(10);

    const badgeW = 40;
    const badgeH = 6;
    const x = this.pageWidth - this.margin - badgeW;
    const y = this.currentY - 3;

    this.doc.setFillColor(r, g, b);
    this.doc.roundedRect(x, y, badgeW, badgeH, 1, 1, 'F');
    this.doc.setFont(this.font, 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(label, x + badgeW / 2, y + 4.2, { align: 'center' });
    this.doc.setTextColor(this.theme.textColor);
    this.currentY += 4;
  }

  addTableWithColumnWidths(
    headers: string[],
    rows: (string | number)[][],
    columnWidths: (number | 'auto')[],
    options?: {
      headerBg?: string;
      headerText?: string;
      alternateRows?: boolean;
    }
  ): void {
    this.checkPageBreak(30);

    const columnStyles: Record<number, { cellWidth: number | 'auto' }> = {};
    columnWidths.forEach((w, i) => { columnStyles[i] = { cellWidth: w }; });

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
        font: this.font,
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: this.theme.textColor,
        font: this.font,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      columnStyles,
      alternateRowStyles: options?.alternateRows ? { fillColor: [248, 249, 250] } : undefined,
    });

    this.currentY = (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
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
        font: this.font,
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: this.theme.textColor,
        font: this.font,
      },
      alternateRowStyles: options?.alternateRows ? { fillColor: [248, 249, 250] } : undefined,
    });

    this.currentY = (this.doc as Record<string, unknown> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  addParagraph(text: string, fontSize: number = 9): void {
    this.checkPageBreak(20);

    this.doc.setFontSize(fontSize);
    this.doc.setFont(this.font, 'normal');
    this.doc.setTextColor(this.theme.textColor);

    const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * (fontSize * 0.42) + 4;
  }

  addDivider(): void {
    this.checkPageBreak(8);
    this.doc.setDrawColor(220, 220, 220);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 5;
  }

  addLabelValue(label: string, value: string, fontSize: number = 9): void {
    this.checkPageBreak(8);
    this.doc.setFontSize(fontSize);
    this.doc.setFont(this.font, 'bold');
    this.doc.setTextColor(80, 80, 80);
    this.doc.text(`${label}:`, this.margin, this.currentY);
    this.doc.setFont(this.font, 'normal');
    this.doc.setTextColor(this.theme.textColor);
    const lines = this.doc.splitTextToSize(value || '—', this.pageWidth - this.margin - 40);
    this.doc.text(lines, this.margin + 38, this.currentY);
    this.currentY += Math.max(lines.length * (fontSize * 0.42), 5) + 3;
  }

  addSignatureSection(
    signatures: { label: string; name?: string; userId?: string; date?: string; timestamp?: string }[]
  ): void {
    this.checkPageBreak(42);

    const sigWidth = (this.pageWidth - 2 * this.margin) / signatures.length;

    signatures.forEach((sig, index) => {
      const x = this.margin + index * sigWidth;

      // Label
      this.doc.setFontSize(8);
      this.doc.setFont(this.font, 'bold');
      this.doc.setTextColor(this.theme.textColor);
      this.doc.text(sig.label, x, this.currentY);

      // Signature line
      this.doc.setLineWidth(0.3);
      this.doc.setDrawColor(150, 150, 150);
      this.doc.line(x, this.currentY + 18, x + sigWidth - 8, this.currentY + 18);

      if (sig.name) {
        this.doc.setFont(this.font, 'bold');
        this.doc.setFontSize(8);
        this.doc.setTextColor(60, 60, 60);
        this.doc.text(sig.name, x, this.currentY + 22);
      }

      if (sig.userId) {
        this.doc.setFont(this.font, 'normal');
        this.doc.setFontSize(7);
        this.doc.setTextColor(120, 120, 120);
        this.doc.text(`ID: ${sig.userId}`, x, this.currentY + 27);
      }

      if (sig.timestamp || sig.date) {
        this.doc.setFont(this.font, 'normal');
        this.doc.setFontSize(7);
        this.doc.setTextColor(140, 140, 140);
        this.doc.text(sig.timestamp ?? sig.date ?? '', x, sig.userId ? this.currentY + 31 : this.currentY + 27);
      }
    });

    this.currentY += 40;
  }

  // formRef: e.g. "HEXA-FRM-004 · Procedure: Hexa-ISP-004"
  addFooter(text: string, formRef?: string): void {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);

      // Thin separator line
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.3);
      this.doc.line(this.margin, this.pageHeight - 16, this.pageWidth - this.margin, this.pageHeight - 16);

      this.doc.setFont(this.font, 'normal');
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
