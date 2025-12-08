# Reporting & Analytics Module - Requirements

**Project:** Hexa Steel® — Operation Tracking System (OTS)  
**Module:** Reporting & Analytics  
**Version:** Planning Phase  
**Author:** Walid Dami  
**Date:** December 9, 2024

---

## 🎯 Overview

The Reporting & Analytics Module will provide comprehensive reporting capabilities for the OTS system, including Power BI integration, custom report designer, and professional PDF generation.

---

## 📊 Core Requirements

### 1. Power BI Integration

**Purpose:** Advanced analytics and interactive dashboards

**Features:**
- Embed Power BI reports directly in OTS
- Single Sign-On (SSO) integration
- Row-level security based on user roles
- Real-time data refresh from OTS database
- Interactive filters and drill-down capabilities
- Mobile-responsive Power BI reports

**Reports to Create:**
- Executive Dashboard (company-wide KPIs)
- Project Performance Dashboard
- Production Analytics
- Quality Control Metrics
- Financial Overview
- Resource Utilization
- Timeline & Schedule Analysis

**Technical Requirements:**
- Power BI Embedded license
- Azure AD integration for SSO
- Direct Query or Import mode configuration
- Scheduled refresh setup
- API integration for embedding

---

### 2. Custom Report Designer

**Purpose:** Allow users to create custom reports without coding

**Features:**
- Drag-and-drop report builder
- Template library (project summary, production report, QC report, etc.)
- Custom field selection
- Chart and graph builder
- Conditional formatting
- Logo and branding customization
- Save and share report templates

**Report Elements:**
- Tables with sortable columns
- Charts (bar, line, pie, gauge, etc.)
- KPI cards
- Images and logos
- Text blocks
- Page breaks
- Headers and footers

**Data Sources:**
- Projects
- Production logs
- QC inspections
- Tasks
- WPS/ITP
- Documents
- Custom queries

---

### 3. PDF Report Generation

**Purpose:** Professional, formatted PDF reports for sharing and archiving

**Current Issue:**
- Export PDF button currently uses `window.print()` (print screen)
- Need proper PDF generation with custom layouts

**Solution Options:**

#### Option A: Server-Side PDF Generation (Recommended)
**Technology:** Puppeteer or Playwright
- Render HTML template on server
- Convert to PDF with proper formatting
- Include charts, tables, and images
- Add page numbers, headers, footers
- Professional styling

**Pros:**
- Full control over layout
- Consistent output
- Can include complex charts
- Server-side processing

**Cons:**
- Requires headless browser on server
- More server resources

#### Option B: Client-Side PDF Generation
**Technology:** jsPDF + html2canvas
- Generate PDF in browser
- No server processing needed

**Pros:**
- No server load
- Instant generation
- Works offline

**Cons:**
- Limited formatting control
- May have rendering issues
- Larger client bundle

#### Option C: Hybrid Approach
- Use server-side for complex reports
- Use client-side for simple exports
- Best of both worlds

---

### 4. Report Types

#### Project Summary Report
**Includes:**
- Project header (number, name, client, PM)
- Key metrics (tonnage, buildings, dates)
- Production progress charts
- QC statistics
- WPS/ITP status
- Buildings breakdown
- Tasks summary
- Timeline visualization

#### Production Report
**Includes:**
- Production by process type
- Weekly/monthly trends
- Tonnage produced vs required
- Efficiency metrics
- Team performance
- Bottleneck analysis

#### Quality Control Report
**Includes:**
- Inspection statistics by type
- Pass/fail rates
- NCR summary
- Defect analysis
- Inspector performance
- Compliance metrics

#### Financial Report
**Includes:**
- Contract value breakdown
- Payment milestones
- Costs vs budget
- Profit margins
- Cash flow projection

#### Executive Summary
**Includes:**
- Company-wide KPIs
- Active projects overview
- Resource utilization
- Revenue and profitability
- Upcoming deadlines
- Risk indicators

---

## 🏗️ Implementation Plan

### Phase 1: Foundation (Weeks 1-2)
- [ ] Research and select PDF generation library
- [ ] Design report templates
- [ ] Create base report layout components
- [ ] Set up Power BI workspace
- [ ] Configure database connection for Power BI

### Phase 2: Power BI Integration (Weeks 3-4)
- [ ] Create Power BI reports
- [ ] Set up embedding infrastructure
- [ ] Implement SSO authentication
- [ ] Add row-level security
- [ ] Create embedded report viewer component
- [ ] Test with different user roles

### Phase 3: PDF Generation (Weeks 5-6)
- [ ] Implement server-side PDF generation
- [ ] Create HTML templates for each report type
- [ ] Add chart rendering (Chart.js or similar)
- [ ] Implement styling and branding
- [ ] Add page numbering and headers/footers
- [ ] Create API endpoint for PDF generation
- [ ] Test with various data scenarios

### Phase 4: Report Designer (Weeks 7-10)
- [ ] Design UI for report builder
- [ ] Implement drag-and-drop functionality
- [ ] Create template library
- [ ] Add data source connectors
- [ ] Implement preview functionality
- [ ] Add save/load template features
- [ ] Create sharing mechanism

### Phase 5: Scheduled Reports (Weeks 11-12)
- [ ] Create scheduling interface
- [ ] Implement email delivery
- [ ] Add report subscription feature
- [ ] Create report history/archive
- [ ] Add automated report generation

---

## 🔧 Technical Stack

### PDF Generation
**Recommended:** Puppeteer
```bash
npm install puppeteer
```

**Alternative:** Playwright
```bash
npm install playwright
```

### Charting Library
**Recommended:** Chart.js or Recharts
```bash
npm install chart.js react-chartjs-2
# or
npm install recharts
```

### Power BI Embedding
```bash
npm install powerbi-client
npm install powerbi-client-react
```

### Report Designer
**Recommended:** GrapesJS or similar
```bash
npm install grapesjs
```

---

## 📋 API Endpoints

### PDF Generation
```
POST /api/reports/generate
Body: {
  reportType: 'project-summary' | 'production' | 'qc' | 'financial',
  projectId?: string,
  dateRange?: { start: Date, end: Date },
  options?: {
    includeCharts: boolean,
    includeImages: boolean,
    format: 'A4' | 'Letter',
    orientation: 'portrait' | 'landscape'
  }
}
Response: PDF file download
```

### Power BI Reports
```
GET /api/reports/powerbi/embed-token
Response: { token: string, embedUrl: string, reportId: string }
```

### Report Templates
```
GET /api/reports/templates
POST /api/reports/templates
PUT /api/reports/templates/:id
DELETE /api/reports/templates/:id
```

### Scheduled Reports
```
GET /api/reports/schedules
POST /api/reports/schedules
PUT /api/reports/schedules/:id
DELETE /api/reports/schedules/:id
```

---

## 💾 Database Schema

### Report Templates
```sql
CREATE TABLE report_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50),
  template_json JSON,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Report Schedules
```sql
CREATE TABLE report_schedules (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50),
  template_id VARCHAR(36),
  schedule_cron VARCHAR(100),
  recipients JSON,
  filters JSON,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES report_templates(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Report History
```sql
CREATE TABLE report_history (
  id VARCHAR(36) PRIMARY KEY,
  report_type VARCHAR(50),
  template_id VARCHAR(36),
  generated_by VARCHAR(36),
  file_path VARCHAR(500),
  file_size INT,
  parameters JSON,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES report_templates(id),
  FOREIGN KEY (generated_by) REFERENCES users(id)
);
```

---

## 🎨 UI/UX Requirements

### Report Viewer
- Clean, professional layout
- Print-friendly styling
- Zoom controls
- Download button
- Share button
- Bookmark/favorite

### Report Designer
- Intuitive drag-and-drop interface
- Live preview
- Template gallery
- Component library
- Undo/redo functionality
- Save as template

### Power BI Integration
- Seamless embedding
- Consistent navigation
- Responsive design
- Filter synchronization
- Bookmark support

---

## 🔐 Security & Permissions

### Role-Based Access
- **Admin:** Full access to all reports and designer
- **Manager:** Access to department/project reports
- **PMO:** Access to all project reports
- **User:** Access to assigned project reports
- **Viewer:** Read-only access

### Data Security
- Row-level security in Power BI
- Encrypted PDF storage
- Audit trail for report access
- Secure email delivery
- Time-limited share links

---

## 📊 Success Metrics

- Report generation time < 5 seconds
- PDF file size < 5MB
- Power BI load time < 3 seconds
- User adoption rate > 70%
- Report accuracy 100%
- Scheduled report delivery success rate > 95%

---

## 🚀 Future Enhancements

- AI-powered insights in reports
- Natural language report queries
- Mobile app for viewing reports
- Real-time collaborative report editing
- Integration with external BI tools (Tableau, Qlik)
- Custom branding per client
- Multi-language report support
- Voice-activated report generation

---

## 📚 Resources

### Power BI
- [Power BI Embedded Documentation](https://docs.microsoft.com/en-us/power-bi/developer/embedded/)
- [Power BI REST API](https://docs.microsoft.com/en-us/rest/api/power-bi/)

### PDF Generation
- [Puppeteer Documentation](https://pptr.dev/)
- [Playwright Documentation](https://playwright.dev/)

### Report Design
- [GrapesJS Documentation](https://grapesjs.com/docs/)

---

## ✅ Next Steps

1. **Immediate (This Week)**
   - Disable current "Export PDF" button with "Coming Soon" message ✅
   - Update CHANGELOG with Project Dashboard module ✅
   - Create this requirements document ✅

2. **Short Term (Next 2 Weeks)**
   - Get approval for Power BI license
   - Select PDF generation library
   - Design first report template
   - Create proof of concept

3. **Medium Term (Next Month)**
   - Implement basic PDF generation
   - Create 3-5 Power BI reports
   - Build report viewer component

4. **Long Term (Next Quarter)**
   - Full report designer
   - Scheduled reports
   - Template library
   - Advanced analytics

---

**Status:** 📋 Planning Phase  
**Priority:** 🔴 High  
**Estimated Effort:** 12 weeks  
**Dependencies:** Power BI license, Database access, Server resources

---

**Last Updated:** December 9, 2024  
**Next Review:** December 16, 2024
