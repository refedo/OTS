# Dashboard Module v2.0 — Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Run Migration (Required)
```bash
# Windows
./migrate-dashboard-widgets.bat

# Or manually
npx prisma migrate dev --name add_dashboard_widgets
npx prisma generate
```

### Step 2: Restart Server
```bash
npm run dev
```

### Step 3: Access Dashboard
Navigate to: `http://localhost:3000/dashboard`

---

## 📊 What You Get

### 5 Pre-Built Widgets

1. **Project Summary** - Total, active, completed, delayed projects
2. **Task Summary** - My tasks, overdue, due today, completed
3. **KPI Dashboard** - Company score, critical/warning/ok KPIs
4. **Company Objectives** - Progress tracking, status breakdown
5. **Weekly Production** - Production trends, process breakdown, QC status

### Features

- ✅ **Real-time data** from database
- ✅ **Auto-refresh** every 60 seconds
- ✅ **Click widgets** to navigate to details
- ✅ **Add/remove widgets** as needed
- ✅ **RBAC aware** - respects permissions
- ✅ **Responsive design** - works on all devices

---

## 🎯 How to Use

### Adding Widgets
1. Click **"Add Widget"** button (top right)
2. Select widget from list
3. Widget appears instantly

### Viewing Details
- Click any widget to go to its detailed page
- Each widget links to its module

### Auto-Refresh
- Widgets update automatically every 60 seconds
- No manual refresh needed

---

## 🔧 API Endpoints

All widgets pull from these endpoints:

- `/api/dashboard/projects/summary` - Project metrics
- `/api/dashboard/tasks/summary` - Task metrics
- `/api/dashboard/kpis/summary` - KPI metrics
- `/api/dashboard/objectives/summary` - Objectives metrics
- `/api/dashboard/production/weekly` - Production metrics
- `/api/dashboard/widgets` - Widget management

---

## 🐛 Troubleshooting

### Widgets not loading?
1. Check browser console for errors
2. Verify you ran the migration
3. Restart development server
4. Clear browser cache

### Data not showing?
1. Check if you have data in database
2. Verify your user permissions
3. Check API endpoint responses in Network tab

### TypeScript errors?
1. Run `npx prisma generate`
2. Restart TypeScript server in VS Code
3. Restart development server

---

## 📝 Widget Data Sources

### Project Summary
- **Tables:** `projects`, `buildings`, `production_logs`
- **Permissions:** Based on project assignments

### Task Summary
- **Tables:** `tasks`
- **Permissions:** Assigned or created tasks

### KPI Summary
- **Tables:** `kpi_scores`, `kpi_definitions`
- **Permissions:** Company or department level

### Objectives Summary
- **Tables:** `company_objectives`, `key_results`
- **Permissions:** Owned objectives or all (admin)

### Weekly Production
- **Tables:** `production_logs`, `assembly_parts`
- **Permissions:** Based on project access

---

## 🎨 Customization

### Change Refresh Interval
Edit in widget component:
```tsx
const interval = setInterval(fetchData, 60000); // milliseconds
```

### Change Default Widgets
Edit in `/api/dashboard/widgets/route.ts`:
```ts
const defaultWidgets = [
  { widgetType: 'PROJECT_SUMMARY', widgetSize: 'medium', position: 0 },
  // Add/remove/reorder
];
```

---

## ✅ Verification

After setup, verify:
- [ ] Dashboard page loads
- [ ] All 5 widgets display
- [ ] Data shows correctly
- [ ] Clicking widgets navigates
- [ ] Add widget button works
- [ ] Auto-refresh updates data

---

## 📞 Need Help?

1. Check `DASHBOARD_MODULE_V2_COMPLETE.md` for full documentation
2. Review code comments in components
3. Check browser console for errors
4. Contact: Walid Dami

---

**Ready to use!** 🎉
