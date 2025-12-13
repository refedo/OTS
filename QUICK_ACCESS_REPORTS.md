# 🚀 Quick Access to Reports Module

## 📍 Three Ways to Access Reports

### 1️⃣ **Reports Page** (Easiest)
Navigate to:
```
http://localhost:3000/reports
```
✅ Shows all available reports  
✅ Includes how-to guide  
✅ API documentation  

---

### 2️⃣ **Add Button to Project Page** (Recommended)

Copy this code to any project page:

```typescript
import { ReportGeneratorDialog } from '@/components/reports/ReportGeneratorDialog';

// Add this button anywhere in your project page:
<ReportGeneratorDialog 
  projectId={project.id}
  projectNumber={project.projectNumber}
  projectName={project.name}
/>
```

**Result:** A "Generate Report" button that opens a dialog

---

### 3️⃣ **Direct API Call** (For Developers)

```typescript
const response = await fetch('/api/reports/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reportType: 'project-summary',  // or 'delivery-note'
    projectId: 'your-project-id',
    language: 'en'  // or 'ar'
  })
});

const result = await response.json();
window.open(result.url, '_blank');  // Opens PDF
```

---

## 📊 Available Reports

| Report Type | Status | Languages |
|------------|--------|-----------|
| **Project Summary** | ✅ Available | EN, AR |
| **Delivery Note** | ✅ Available | EN, AR |
| Production Log | 🚧 Coming Soon | EN, AR |
| QC Report | 🚧 Coming Soon | EN, AR |

---

## 🎯 Quick Test

### Option A: Browser
1. Go to: `http://localhost:3000/reports`
2. Read the guide
3. Navigate to a project
4. Generate a report

### Option B: Command Line
```bash
node test-generate-report.js
node test-delivery-note.js
```

---

## 📁 Files Created

✅ `src/app/reports/page.tsx` - Reports listing page  
✅ `src/components/reports/ReportGeneratorDialog.tsx` - Report button component  
✅ `REPORTS_ACCESS_GUIDE.md` - Full access guide  

---

## 💡 Example Integration

### Add to Project Dashboard

```typescript
// In your project page (e.g., src/app/projects/[id]/page.tsx)
import { ReportGeneratorDialog } from '@/components/reports/ReportGeneratorDialog';

export default function ProjectPage({ params }) {
  return (
    <div>
      <h1>Project Details</h1>
      
      {/* Add this button */}
      <div className="flex gap-2">
        <Button>Edit</Button>
        <ReportGeneratorDialog 
          projectId={params.id}
          projectNumber="247"
          projectName="IGA"
        />
      </div>
    </div>
  );
}
```

---

## ✅ That's It!

**Start here:** `http://localhost:3000/reports`

**Full guide:** `REPORTS_ACCESS_GUIDE.md`

**Questions?** Check the reports page for complete documentation.
