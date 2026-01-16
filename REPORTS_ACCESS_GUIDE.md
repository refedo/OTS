# Reports Module - Access Guide

## 🎯 How to Access Reports

### Method 1: Reports Page (Standalone)
Navigate to the dedicated reports page:

```
http://localhost:3000/reports
```

This page shows:
- All available report types
- Report descriptions
- Language support
- Status (Available/Coming Soon)
- How-to guide
- API documentation

### Method 2: From Project Pages (Recommended)

Add the `ReportGeneratorDialog` component to any project page:

```typescript
import { ReportGeneratorDialog } from '@/components/reports/ReportGeneratorDialog';

// In your project page component:
<ReportGeneratorDialog 
  projectId={project.id}
  projectNumber={project.projectNumber}
  projectName={project.name}
/>
```

This will add a "Generate Report" button that opens a dialog where users can:
1. Select report type
2. Choose language (EN/AR)
3. Generate and download PDF

---

## 📍 Integration Examples

### Example 1: Add to Project Details Page

```typescript
// src/app/projects/[id]/page.tsx
import { ReportGeneratorDialog } from '@/components/reports/ReportGeneratorDialog';

export default function ProjectPage({ params }: { params: { id: string } }) {
  // ... your existing code ...

  return (
    <div>
      {/* Your existing project UI */}
      <div className="flex gap-2">
        <Button>Edit Project</Button>
        <ReportGeneratorDialog 
          projectId={params.id}
          projectNumber={project.projectNumber}
          projectName={project.name}
        />
      </div>
    </div>
  );
}
```

### Example 2: Add to Projects List

```typescript
// In your projects table/list
{projects.map((project) => (
  <div key={project.id} className="flex items-center justify-between">
    <div>{project.name}</div>
    <ReportGeneratorDialog 
      projectId={project.id}
      projectNumber={project.projectNumber}
      projectName={project.name}
    />
  </div>
))}
```

### Example 3: Add to Navigation Menu

```typescript
// src/components/layout/Sidebar.tsx or Navigation.tsx
import { FileText } from 'lucide-react';
import Link from 'next/link';

const menuItems = [
  // ... your existing menu items ...
  {
    title: 'Reports',
    href: '/reports',
    icon: FileText,
  },
];
```

---

## 🔗 Direct API Access

### Generate Report Programmatically

```typescript
async function generateReport(projectId: string, reportType: string, language: string) {
  const response = await fetch('/api/reports/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportType,
      projectId,
      language,
    }),
  });

  const result = await response.json();
  
  if (result.status === 'success') {
    // Open PDF in new tab
    window.open(result.url, '_blank');
    
    // Or download directly
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `${reportType}-${Date.now()}.pdf`;
    link.click();
  }
}

// Usage
generateReport('project-id', 'project-summary', 'en');
```

### List Available Report Types

```typescript
async function getReportTypes() {
  const response = await fetch('/api/reports/types');
  const data = await response.json();
  return data.reportTypes;
}
```

---

## 📱 Available Report Types

### 1. **Project Summary Report** ✅
- **Type:** `project-summary`
- **Status:** Available
- **Languages:** English, Arabic
- **Includes:**
  - Project information
  - Weight summary
  - Buildings list
  - Production summary
  - QC summary
  - Dispatch summary

### 2. **Delivery Note** ✅
- **Type:** `delivery-note`
- **Status:** Available
- **Languages:** English, Arabic
- **Includes:**
  - Building summary with shipment weights
  - Driver information
  - Items list with quantities
  - Shipment breakdown

### 3. **Production Log** 🚧
- **Type:** `production-log`
- **Status:** Coming Soon

### 4. **QC Report** 🚧
- **Type:** `qc-report`
- **Status:** Coming Soon

---

## 🎨 UI Components Created

### 1. `ReportGeneratorDialog.tsx`
**Location:** `src/components/reports/ReportGeneratorDialog.tsx`

**Props:**
- `projectId` (required): Project UUID
- `projectNumber` (optional): Display project number
- `projectName` (optional): Display project name

**Features:**
- Select report type
- Choose language
- Loading state
- Success/error toasts
- Auto-open PDF in new tab

### 2. Reports Page
**Location:** `src/app/reports/page.tsx`

**Features:**
- List all report types
- Show status badges
- Display descriptions
- How-to guide
- API documentation

---

## 🚀 Quick Start

### Step 1: Access Reports Page
```
http://localhost:3000/reports
```

### Step 2: Or Add Button to Your Project Page

```typescript
import { ReportGeneratorDialog } from '@/components/reports/ReportGeneratorDialog';

<ReportGeneratorDialog 
  projectId="your-project-id"
  projectNumber="247"
  projectName="IGA"
/>
```

### Step 3: Generate Report
1. Click "Generate Report" button
2. Select report type (Project Summary or Delivery Note)
3. Choose language (English or Arabic)
4. Click "Generate PDF"
5. PDF opens automatically in new tab

---

## 📊 Testing

### Test from Browser
1. Navigate to: `http://localhost:3000/reports`
2. View available reports
3. Go to a project page
4. Click "Generate Report"

### Test via API
```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "project-summary",
    "projectId": "your-project-id",
    "language": "en"
  }'
```

### Test Script
```bash
node test-generate-report.js
node test-delivery-note.js
```

---

## 🔧 Customization

### Change Button Style

```typescript
<ReportGeneratorDialog 
  projectId={projectId}
  projectNumber={projectNumber}
  projectName={projectName}
  // The button is customizable via the Dialog trigger
/>
```

### Add to Dropdown Menu

```typescript
<DropdownMenu>
  <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Delete</DropdownMenuItem>
    <DropdownMenuItem asChild>
      <ReportGeneratorDialog projectId={projectId} />
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 📁 File Structure

```
src/
├── app/
│   └── reports/
│       └── page.tsx                    # Reports listing page
├── components/
│   └── reports/
│       └── ReportGeneratorDialog.tsx   # Report generator component
└── modules/
    └── reporting/
        ├── templates/                  # Report templates
        ├── reportEngine.ts             # PDF generation engine
        ├── reportController.ts         # API handlers
        └── reportTypes.ts              # TypeScript types
```

---

## 🎯 Next Steps

1. ✅ **Access reports page:** `http://localhost:3000/reports`
2. ✅ **Add button to project pages** using `ReportGeneratorDialog`
3. ⬜ **Add to navigation menu** (optional)
4. ⬜ **Customize button styling** (optional)
5. ⬜ **Add to project dashboard** (recommended)

---

## 💡 Tips

- **Bookmark the reports page:** `http://localhost:3000/reports`
- **Use the dialog component** for easy integration
- **Test with different projects** to see data variations
- **Try both languages** to see RTL support
- **Check generated PDFs** in `public/outputs/reports/`

---

## 🆘 Troubleshooting

**Issue:** Can't find reports page  
**Solution:** Navigate to `http://localhost:3000/reports`

**Issue:** Button not showing  
**Solution:** Make sure you imported `ReportGeneratorDialog` correctly

**Issue:** PDF not generating  
**Solution:** Check dev server is running and project ID is valid

**Issue:** 404 on reports page  
**Solution:** Make sure `src/app/reports/page.tsx` exists

---

## 📚 Documentation

- **Full Documentation:** `docs/HEXA_REPORTING_ENGINE.md`
- **Setup Guide:** `HEXA_REPORTING_ENGINE_SETUP.md`
- **Implementation Summary:** `HRE_IMPLEMENTATION_SUMMARY.md`
- **This Guide:** `REPORTS_ACCESS_GUIDE.md`

---

**Hexa Reporting Engine v1.0**  
Built for OTS (Operations Tracking System)  
© 2024 Hexa Steel®
