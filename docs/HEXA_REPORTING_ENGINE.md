# Hexa Reporting Engine (HRE) Documentation

## Overview

The **Hexa Reporting Engine (HRE)** is a professional PDF report generation subsystem built into the OTS (Operations Tracking System). It generates pixel-perfect, branded PDF reports using HTML templates, Puppeteer (Headless Chrome), and supports bilingual output (English & Arabic).

## Architecture

```
/src/modules/reporting/
├── templates/
│   ├── global.css                    # Hexa Steel® global theme
│   ├── project-summary/
│   │   ├── header.html              # Report header template
│   │   ├── body.html                # Report body template
│   │   ├── footer.html              # Report footer template
│   │   └── styles.css               # Report-specific styles
│   └── production-log/              # Future report type
├── fonts/                            # Embedded fonts (Cairo, Inter)
├── reportTypes.ts                    # TypeScript type definitions
├── reportEngine.ts                   # Core PDF generation engine
└── reportController.ts               # API request handlers
```

## Features

### ✅ Implemented
- **Project Summary Report** - Comprehensive project overview
- **Bilingual Support** - English and Arabic with RTL support
- **Professional Branding** - Hexa Steel® colors and typography
- **Template System** - Handlebars-based HTML templates
- **Puppeteer PDF Generation** - High-quality PDF output
- **Database Integration** - Fetches data from Prisma models
- **API Endpoints** - RESTful API for report generation

### 🚧 Coming Soon
- Production Log Report
- QC Report
- Dispatch Report
- Chart/Graph embedding
- QR Code generation
- Custom watermarks

## API Endpoints

### 1. Generate Report
**POST** `/api/reports/generate`

**Request Body:**
```json
{
  "reportType": "project-summary",
  "projectId": "uuid-string",
  "language": "en",
  "options": {
    "includeCharts": true,
    "includeImages": true
  }
}
```

**Response:**
```json
{
  "status": "success",
  "url": "/outputs/reports/PRJ-001/project-summary-1234567890.pdf",
  "filePath": "C:/path/to/file.pdf",
  "metadata": {
    "reportType": "project-summary",
    "projectNumber": "PRJ-001",
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "language": "en",
    "fileSize": 245678
  }
}
```

### 2. List Report Types
**GET** `/api/reports/types`

**Response:**
```json
{
  "status": "success",
  "reportTypes": [
    {
      "type": "project-summary",
      "name": "Project Summary Report",
      "description": "Comprehensive overview of project status",
      "supportedLanguages": ["en", "ar"]
    }
  ]
}
```

## Installation

### 1. Install Dependencies

```bash
npm install puppeteer handlebars @types/puppeteer @types/handlebars
```

### 2. Create Output Directory

```bash
mkdir -p public/outputs/reports
```

### 3. Add Fonts (Optional)

Download and place fonts in `/src/modules/reporting/fonts/`:
- `Cairo-Regular.ttf` (Arabic)
- `Inter-Regular.ttf` (English)

## Usage Examples

### Generate a Report from Frontend

```typescript
async function generateReport(projectId: string) {
  const response = await fetch('/api/reports/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportType: 'project-summary',
      projectId: projectId,
      language: 'en',
    }),
  });

  const result = await response.json();
  
  if (result.status === 'success') {
    // Open PDF in new tab
    window.open(result.url, '_blank');
  }
}
```

### Generate Report Programmatically

```typescript
import { reportEngine } from '@/modules/reporting/reportEngine';

const result = await reportEngine.generateReport({
  reportType: 'project-summary',
  projectId: 'project-uuid',
  language: 'ar',
});

console.log('PDF generated:', result.url);
```

## Report Types

### Project Summary Report

**Sections:**
1. **Project Information** - Number, name, client, location, dates
2. **Weight Summary** - Total, produced, dispatched, remaining weights
3. **Buildings List** - All buildings with completion percentages
4. **Production Summary** - Fit-up, welding, visual inspection stats
5. **QC Summary** - Inspection results and pass rates
6. **Dispatch Summary** - Shipment statistics
7. **Signatures** - Prepared by / Approved by sections

**Data Sources:**
- `Project` model
- `Building` model
- `AssemblyPart` model
- `OperationEvent` model
- `WeldingInspection`, `DimensionalInspection`, `NDTInspection` models

## Customization

### Adding a New Report Type

1. **Create Template Directory:**
```bash
mkdir src/modules/reporting/templates/my-report
```

2. **Create Template Files:**
- `header.html`
- `body.html`
- `footer.html`
- `styles.css`

3. **Add Data Fetching Function:**
```typescript
private async getMyReportData(projectId: string): Promise<MyReportData> {
  // Fetch data from database
  // Transform and return
}
```

4. **Update Report Engine:**
```typescript
case 'my-report':
  data = await this.getMyReportData(request.projectId);
  break;
```

5. **Add Type Definition:**
```typescript
export type ReportType = 
  | 'project-summary'
  | 'my-report'; // Add here
```

### Customizing Styles

Edit `/src/modules/reporting/templates/global.css` to change:
- Brand colors
- Fonts
- Layout
- Typography

## Branding

### Hexa Steel® Theme

**Primary Color:** `#2C3E50`  
**Secondary Color:** `#0071BC`  
**Success Color:** `#27AE60`  
**Warning Color:** `#F39C12`  
**Danger Color:** `#E74C3C`

**Fonts:**
- English: Inter
- Arabic: Cairo

### Logo

The logo is embedded as base64 SVG in the `getLogoBase64()` method. Replace with your actual logo:

```typescript
private async getLogoBase64(): Promise<string> {
  const logoPath = path.join(process.cwd(), 'public', 'logo.svg');
  const logoBuffer = await fs.readFile(logoPath);
  return logoBuffer.toString('base64');
}
```

## Troubleshooting

### Puppeteer Installation Issues

**Windows:**
```bash
npm install puppeteer --ignore-scripts=false
```

**Linux:**
```bash
sudo apt-get install -y chromium-browser
npm install puppeteer
```

### Font Not Loading

Ensure fonts are placed in the correct directory and paths in CSS are correct:
```css
@font-face {
  font-family: 'Cairo';
  src: url('../fonts/Cairo-Regular.ttf') format('truetype');
}
```

### PDF Generation Timeout

Increase Puppeteer timeout:
```typescript
await page.setContent(html, {
  waitUntil: 'networkidle0',
  timeout: 60000, // 60 seconds
});
```

### Memory Issues

Close browser after generation:
```typescript
await reportEngine.closeBrowser();
```

## Performance

### Template Caching

Templates are cached by default. Disable for development:
```typescript
const engine = new HexaReportingEngine({
  cacheTemplates: false,
});
```

### Browser Reuse

The engine reuses a single Puppeteer browser instance across multiple reports for better performance.

### Large Datasets

For reports with 100+ rows, use CSS page break rules:
```css
tr {
  page-break-inside: avoid;
}
```

## Security

### Authentication

All report endpoints require authentication via NextAuth session.

### File Access

Generated PDFs are stored in `/public/outputs/reports/{projectNumber}/` and are publicly accessible via URL. Consider:
- Adding authentication middleware
- Using signed URLs
- Implementing file expiration

## Future Enhancements

- [ ] Chart generation (Chart.js or Recharts)
- [ ] QR code embedding
- [ ] Email delivery
- [ ] Scheduled report generation
- [ ] Report templates management UI
- [ ] Custom watermarks
- [ ] Digital signatures
- [ ] Report versioning
- [ ] Batch report generation

## Support

For issues or questions:
- Check TypeScript errors in IDE
- Review Prisma schema for correct relations
- Check Puppeteer logs for PDF generation issues
- Verify template syntax with Handlebars validator

## License

Internal use only - Hexa Steel® Operations Tracking System
