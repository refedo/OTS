# PDF Report Builder

A reusable, elegant PDF report generation system for creating professional documents with customizable themes.

## Features

- **5 Professional Themes**: Blue, Green, Orange, Purple, Red
- **Modular Components**: Headers, sections, tables, signatures, images
- **Automatic Page Breaks**: Smart pagination management
- **Responsive Layout**: Adapts to content size
- **Company Branding**: Logo and header customization
- **Signature Sections**: Built-in signature blocks
- **Data Grids**: Flexible key-value pair layouts
- **Tables**: Auto-formatted tables with alternating rows

## Installation

The required dependencies are already installed:
```bash
npm install jspdf jspdf-autotable
```

## Quick Start

### Basic Usage

```typescript
import { PDFReportBuilder } from '@/lib/pdf-builder';

const pdf = new PDFReportBuilder('portrait', 'blue');

// Add header
pdf.addHeader('HEXA STEEL', 'THRIVE DIFFERENT');

// Add title
pdf.addTitle('Report Title', 'Subtitle');

// Add metadata box
pdf.addMetadataBox({
  'DATE': '29-11-2025',
  'Ref.Doc': 'DOC-001',
  'SHEET NO.': '1 of 1',
});

// Add section
pdf.addSectionHeader('SECTION 1');

// Add data grid
pdf.addInfoGrid({
  'Field 1': 'Value 1',
  'Field 2': 'Value 2',
}, 2); // 2 columns

// Add table
pdf.addTable(
  ['Header 1', 'Header 2', 'Header 3'],
  [
    ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'],
    ['Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3'],
  ],
  { alternateRows: true }
);

// Add signatures
pdf.addSignatureSection([
  { label: 'Prepared By', name: 'John Doe', date: '29-11-2025' },
  { label: 'Approved By', name: 'Jane Smith', date: '29-11-2025' },
]);

// Add footer
pdf.addFooter('Company Name - Document Type');

// Save
pdf.save('report.pdf');
```

## Available Themes

### Blue (Default)
- Primary: #1e40af
- Secondary: #3b82f6
- Accent: #60a5fa

### Green
- Primary: #15803d
- Secondary: #22c55e
- Accent: #86efac

### Orange
- Primary: #ea580c
- Secondary: #f97316
- Accent: #fb923c

### Purple
- Primary: #7c3aed
- Secondary: #a855f7
- Accent: #c084fc

### Red
- Primary: #dc2626
- Secondary: #ef4444
- Accent: #f87171

## API Reference

### Constructor

```typescript
new PDFReportBuilder(
  orientation: 'portrait' | 'landscape' = 'portrait',
  themeName: 'blue' | 'green' | 'orange' | 'purple' | 'red' = 'blue'
)
```

### Methods

#### `addHeader(companyName: string, companyTagline: string, logoPath?: string)`
Adds a colored header with company branding.

#### `addTitle(title: string, subtitle?: string)`
Adds a centered document title with optional subtitle.

#### `addMetadataBox(metadata: Record<string, string>)`
Adds a metadata box in the top-right corner.

#### `addSectionHeader(title: string)`
Adds a colored section header.

#### `addInfoGrid(data: Record<string, string | number>, columns: number = 2)`
Adds key-value pairs in a grid layout.

#### `addTable(headers: string[], rows: (string | number)[][], options?)`
Adds a formatted table with optional alternating row colors.

Options:
- `headerBg`: Custom header background color
- `headerText`: Custom header text color
- `alternateRows`: Enable alternating row colors

#### `addImage(imageData: string, width: number, height: number, centered: boolean = false)`
Adds an image to the document.

#### `addParagraph(text: string, fontSize: number = 9)`
Adds a text paragraph with automatic line wrapping.

#### `addSignatureSection(signatures: Array<{ label: string; name?: string; date?: string }>)`
Adds signature blocks.

#### `addFooter(text: string)`
Adds a footer to all pages with page numbers.

#### `save(filename: string)`
Saves the PDF with the specified filename.

#### `getBlob(): Blob`
Returns the PDF as a Blob object.

#### `getDataURL(): string`
Returns the PDF as a data URL string.

## WPS Report Example

See `src/lib/wps-pdf-generator.ts` for a complete implementation example.

```typescript
import { generateWPSPDF } from '@/lib/wps-pdf-generator';

const blob = generateWPSPDF(wpsData, 'blue');
// Download or display the PDF
```

## Creating Custom Reports

1. Create a new generator file (e.g., `delivery-note-pdf-generator.ts`)
2. Import `PDFReportBuilder`
3. Define your data type
4. Use the builder methods to construct your report
5. Export a function that returns a Blob

Example structure:
```typescript
import { PDFReportBuilder } from './pdf-builder';

export type DeliveryNoteData = {
  // Your data structure
};

export function generateDeliveryNotePDF(
  data: DeliveryNoteData,
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'red' = 'blue'
): Blob {
  const pdf = new PDFReportBuilder('landscape', theme);
  
  // Build your report
  pdf.addHeader('HEXA STEEL', 'THRIVE DIFFERENT');
  // ... add more sections
  
  return pdf.getBlob();
}
```

## Best Practices

1. **Theme Selection**: Let users choose themes for personalization
2. **Consistent Branding**: Use the same header/footer across all reports
3. **Section Organization**: Group related information with section headers
4. **Data Validation**: Ensure all data exists before adding to PDF
5. **Error Handling**: Wrap PDF generation in try-catch blocks
6. **File Naming**: Use descriptive, unique filenames (include dates, IDs)

## Troubleshooting

### Images Not Displaying
- Ensure images are in base64 format or valid URLs
- Check image format (PNG, JPEG supported)
- Verify image dimensions fit within page margins

### Text Overflow
- Use `addParagraph()` for long text (auto-wraps)
- Reduce font size if needed
- Split content across multiple sections

### Page Breaks
- The builder automatically handles page breaks
- Adjust `checkPageBreak()` threshold if needed
- Use `addSectionHeader()` to force logical breaks

## Future Enhancements

- [ ] Custom fonts support
- [ ] Watermark functionality
- [ ] QR code generation
- [ ] Chart/graph integration
- [ ] Multi-language support
- [ ] Template system
- [ ] PDF encryption
