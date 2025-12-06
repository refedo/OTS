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
    this.theme = themes[themeName];
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  // Add company header with logo
  addHeader(
    companyName: string,
    companyTagline: string,
    logoBase64?: string
  ): void {
    const headerHeight = 25;
    
    // Header background
    this.doc.setFillColor(this.theme.headerBg);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');

    // Logo (if provided)
    if (logoBase64) {
      try {
        // Determine image format from base64 string
        const format = logoBase64.includes('data:image/png') ? 'PNG' : 
                      logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg') ? 'JPEG' : 'PNG';
        this.doc.addImage(logoBase64, format, this.margin, 5, 20, 15);
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }

    // Company name
    this.doc.setTextColor(this.theme.headerText);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(companyName, logoBase64 ? this.margin + 25 : this.margin, 12);

    // Tagline
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(companyTagline, logoBase64 ? this.margin + 25 : this.margin, 17);

    this.currentY = headerHeight + 5;
    this.doc.setTextColor(this.theme.textColor);
  }

  // Add document title
  addTitle(title: string, subtitle?: string): void {
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(this.theme.primaryColor);
    this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 8;

    if (subtitle) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(this.theme.textColor);
      this.doc.text(subtitle, this.pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 6;
    }

    this.currentY += 5;
  }

  // Add metadata box (date, reference, etc.)
  addMetadataBox(metadata: Record<string, string>): void {
    const boxWidth = 60;
    const boxX = this.pageWidth - this.margin - boxWidth;
    const lineHeight = 5;
    const boxHeight = Object.keys(metadata).length * lineHeight + 4;

    // Box background
    this.doc.setFillColor(245, 245, 245);
    this.doc.rect(boxX, this.currentY, boxWidth, boxHeight, 'F');

    // Box border
    this.doc.setDrawColor(this.theme.primaryColor);
    this.doc.setLineWidth(0.5);
    this.doc.rect(boxX, this.currentY, boxWidth, boxHeight);

    // Metadata content
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    let metaY = this.currentY + 4;

    Object.entries(metadata).forEach(([key, value]) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${key}:`, boxX + 2, metaY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(value, boxX + 20, metaY);
      metaY += lineHeight;
    });

    this.currentY += boxHeight + 5;
  }

  // Add section header
  addSectionHeader(title: string): void {
    this.checkPageBreak(10);
    
    this.doc.setFillColor(this.theme.primaryColor);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 7, 'F');

    this.doc.setTextColor(this.theme.headerText);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin + 2, this.currentY + 5);

    this.currentY += 10;
    this.doc.setTextColor(this.theme.textColor);
  }

  // Add key-value pairs in a grid
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
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(`${key}:`, x, y);

      this.doc.setFont('helvetica', 'normal');
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

  // Add table
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
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: this.theme.textColor,
      },
      alternateRowStyles: options?.alternateRows
        ? {
            fillColor: [245, 245, 245],
          }
        : undefined,
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 5;
  }

  // Add image
  addImage(
    imageData: string,
    width: number,
    height: number,
    centered: boolean = false
  ): void {
    this.checkPageBreak(height + 5);

    const x = centered ? (this.pageWidth - width) / 2 : this.margin;
    
    try {
      this.doc.addImage(imageData, 'PNG', x, this.currentY, width, height);
      this.currentY += height + 5;
    } catch (error) {
      console.error('Error adding image:', error);
    }
  }

  // Add text paragraph
  addParagraph(text: string, fontSize: number = 9): void {
    this.checkPageBreak(20);

    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'normal');
    
    const lines = this.doc.splitTextToSize(
      text,
      this.pageWidth - 2 * this.margin
    );
    
    this.doc.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * (fontSize * 0.4) + 5;
  }

  // Add signature section
  addSignatureSection(
    signatures: { label: string; name?: string; date?: string }[]
  ): void {
    this.checkPageBreak(30);

    const sigWidth = (this.pageWidth - 2 * this.margin) / signatures.length;

    signatures.forEach((sig, index) => {
      const x = this.margin + index * sigWidth;

      // Label
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(sig.label, x, this.currentY);

      // Signature line
      this.doc.setLineWidth(0.3);
      this.doc.line(x, this.currentY + 15, x + sigWidth - 10, this.currentY + 15);

      // Name
      if (sig.name) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7);
        this.doc.text(sig.name, x, this.currentY + 19);
      }

      // Date
      if (sig.date) {
        this.doc.text(sig.date, x, this.currentY + 23);
      }
    });

    this.currentY += 30;
  }

  // Add footer
  addFooter(text: string): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(7);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text(
        text,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  // Check if we need a page break
  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 20) {
      this.doc.addPage();
      this.currentY = 20;
    }
  }

  // Save the PDF
  save(filename: string): void {
    this.doc.save(filename);
  }

  // Get PDF as blob
  getBlob(): Blob {
    return this.doc.output('blob');
  }

  // Get PDF as data URL
  getDataURL(): string {
    return this.doc.output('dataurlstring');
  }
}
