# Project Migration - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Admin or PMO role access
- Excel software (Microsoft Excel, LibreOffice, Google Sheets)

---

## 📥 Importing Projects

### Step 1: Get the Template
1. Navigate to `/projects/migration`
2. Click **"Download Empty Template"**
3. Open the downloaded `OTS_Project_Import_Template.xlsx`

### Step 2: Fill in Your Data

#### Projects Sheet
Fill in at minimum:
- **Project #**: Unique code (e.g., "PRJ-2024-001")
- **Project Name**: Full project name

Optional but recommended:
- Client Name
- Project Manager
- Status (Draft/Active/On-Hold/Completed)
- Contract Value
- Dates

#### Buildings Sheet
For each building:
- **Project Code**: Must match a Project # from Projects sheet
- **Building Code**: Unique code (e.g., "WH-A", "MAIN")
- **Building Name**: Building name

### Step 3: Upload and Import
1. Save your Excel file
2. Go to `/projects/migration`
3. Drag & drop your file or click "Browse Files"
4. Click **"Import Projects"**
5. Review results

✅ **Success**: Projects are now in the system!  
❌ **Errors**: Fix the issues shown and re-upload

---

## 📤 Exporting Projects

### Export All Projects
1. Navigate to `/projects/migration`
2. Click **"Download All Projects (Excel)"**
3. File downloads automatically

### Export Single Project
1. Go to project details page
2. Click export button (if available)
3. Or use API: `GET /api/projects/export/{projectId}`

---

## 📋 Quick Reference

### Required Fields

**Projects:**
- Project # ✅
- Project Name ✅

**Buildings:**
- Project Code ✅
- Building Code ✅
- Building Name ✅

### Valid Status Values
- Draft
- Active
- On-Hold
- Completed
- Cancelled

### Valid Building Types
- HR (Heavy Rolled)
- PEB (Pre-Engineered Building)
- MEP (Mechanical/Electrical/Plumbing)
- Modular
- Other

### Date Format
Use: `YYYY-MM-DD` (e.g., 2024-01-15)

### Boolean Fields
Use: `Yes` or `No` (or `True`/`False`, `1`/`0`)

---

## ⚠️ Common Mistakes

### ❌ Don't Do This
```
Project Code: PRJ001
Building Code: (empty)
Status: In Progress
Date: 15/01/2024
```

### ✅ Do This Instead
```
Project Code: PRJ-2024-001
Building Code: WH-A
Status: Active
Date: 2024-01-15
```

---

## 🔧 Troubleshooting

### "Missing required column"
- Check sheet names: Must be "Projects" and "Buildings"
- Check column headers match exactly

### "Building references non-existent project"
- Ensure Building's "Project Code" matches a "Project #" in Projects sheet
- Check for typos

### "Rate limit exceeded"
- You can only upload 10 files per hour
- Wait for the reset time shown

### "Unauthorized"
- Only Admin and PMO users can import/export
- Check you're logged in

---

## 💡 Pro Tips

1. **Start Small**: Test with 1-2 projects first
2. **Use Export**: Export existing projects to see the format
3. **Keep Backups**: Always export before large imports
4. **Check Warnings**: Even successful imports may have warnings
5. **Batch Import**: Import in groups of 10-20 projects for easier error tracking

---

## 📞 Need Help?

1. Read the full documentation: `docs/PROJECT_MIGRATION_MODULE.md`
2. Generate sample data: `npx tsx scripts/generate-sample-template.ts`
3. Contact your system administrator

---

## 🎯 Example Import

Here's a minimal valid import:

**Projects Sheet:**
| Project # | Project Name |
|-----------|--------------|
| PRJ-001 | Warehouse Project |
| PRJ-002 | Office Building |

**Buildings Sheet:**
| Project Code | Building Code | Building Name |
|--------------|---------------|---------------|
| PRJ-001 | WH-A | Warehouse A |
| PRJ-001 | WH-B | Warehouse B |
| PRJ-002 | MAIN | Main Building |

Save this as .xlsx and import! ✨
