# Single Project Dashboard — Quick Start Guide

**Quick reference for using and extending the Single Project Dashboard**

---

## 🚀 Quick Start

### Access the Dashboard
1. Navigate to `/projects-dashboard`
2. Select a project from the dropdown
3. View all project data in one unified dashboard

### Direct Link to Project
```
/projects-dashboard?projectId=YOUR_PROJECT_ID
```

---

## 📊 Available Widgets

| Widget | Description | Key Metrics |
|--------|-------------|-------------|
| **Project Header** | Project overview | Number, client, tonnage, dates, PM |
| **WPS Status** | Welding procedures | Total, approved, pending, superseded |
| **ITP Status** | Inspection plans | Total, approved, pending, overdue |
| **Production Progress** | Manufacturing status | Weight produced, weekly trends, by process |
| **QC Progress** | Quality inspections | Total, completed, rejected, timeline |
| **Buildings Status** | Per-building breakdown | Production, QC, dispatch per building |
| **Documentation** | Document tracking | By category, pending approvals |
| **Tasks Overview** | Project tasks | Total, completed, overdue, filters |

---

## 🔧 Quick Widget Addition

### 1. Create Type (1 min)
```typescript
// src/lib/types/project-dashboard.ts
export interface MyWidget {
  field1: string;
  field2: number;
}
```

### 2. Create API (3 min)
```typescript
// src/app/api/projects/[projectId]/my-widget/route.ts
export async function GET(req, { params }) {
  const { projectId } = await params;
  // Fetch data
  return NextResponse.json(data);
}
```

### 3. Create Component (5 min)
```tsx
// src/components/project-dashboard/MyWidget.tsx
export function MyWidget({ data, onRefresh }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Widget</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your content */}
      </CardContent>
    </Card>
  );
}
```

### 4. Add to Dashboard (2 min)
```tsx
// src/components/project-dashboard/SingleProjectDashboard.tsx
// 1. Import
import { MyWidget } from './MyWidget';

// 2. Fetch in fetchDashboardData
const myData = await fetch(`/api/projects/${id}/my-widget`).then(r => r.json());

// 3. Render
<MyWidget data={dashboardData.myData} onRefresh={handleRefresh} />
```

**Total Time: ~11 minutes** ⚡

---

## 🎨 Widget Template

Copy-paste this template for new widgets:

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface MyWidgetProps {
  data: any; // Replace with your type
  onRefresh?: () => void;
}

export function MyWidget({ data, onRefresh }: MyWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Widget Title</CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          {/* Your content here */}
        </CardContent>
      )}
    </Card>
  );
}
```

---

## 📋 API Endpoints Cheat Sheet

| Endpoint | Returns |
|----------|---------|
| `/api/projects/:id/summary` | Project info, client, tonnage, dates |
| `/api/projects/:id/wps` | WPS list with approval status |
| `/api/projects/:id/itp` | ITP list with activity completion |
| `/api/projects/:id/production` | Production metrics and trends |
| `/api/projects/:id/qc` | QC inspection statistics |
| `/api/projects/:id/buildings` | Buildings with production/QC/dispatch |
| `/api/projects/:id/documents` | Documentation by category |
| `/api/projects/:id/tasks` | Tasks with filters |

---

## 🎯 Common Tasks

### Refresh All Data
```tsx
<Button onClick={handleRefresh}>Refresh All</Button>
```

### Refresh Single Widget
```tsx
<Button onClick={() => fetchDashboardData(projectId)}>
  <RefreshCw className="size-4" />
</Button>
```

### Filter Tasks
```typescript
// In API call
fetch(`/api/projects/${id}/tasks?status=non-completed&myTasks=true`)
```

### Color Coding
```typescript
const getProgressColor = (percentage: number) => {
  if (percentage >= 75) return 'text-green-600';
  if (percentage >= 50) return 'text-blue-600';
  if (percentage >= 25) return 'text-yellow-600';
  return 'text-red-600';
};
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Dashboard not loading | Check browser console, verify API endpoints |
| No data showing | Ensure project has data in database |
| Slow performance | Check database queries, add indexes |
| Widget not updating | Verify onRefresh is passed and called |
| TypeScript errors | Check interface matches API response |

---

## 💡 Pro Tips

1. **Use Parallel Fetching** — `Promise.all()` for faster loads
2. **Handle Nulls** — Always check for null/undefined data
3. **Loading States** — Show skeletons during fetches
4. **Error Boundaries** — Wrap widgets in error handlers
5. **Responsive Design** — Test on mobile devices
6. **Consistent Styling** — Follow existing widget patterns
7. **Accessibility** — Add proper ARIA labels
8. **Performance** — Lazy load heavy components

---

## 📚 Related Documentation

- Full Documentation: `docs/SINGLE_PROJECT_DASHBOARD.md`
- Type Definitions: `src/lib/types/project-dashboard.ts`
- Widget Components: `src/components/project-dashboard/`
- API Routes: `src/app/api/projects/[projectId]/`

---

## ✅ Pre-Deployment Checklist

- [ ] All widgets load without errors
- [ ] Data is real (no placeholders)
- [ ] Refresh buttons work
- [ ] Collapsible widgets function
- [ ] Deep linking works
- [ ] Mobile responsive
- [ ] Loading states present
- [ ] Error handling implemented
- [ ] TypeScript types defined
- [ ] Documentation updated

---

**Need Help?** Check the full documentation or contact the development team.

**Version:** 1.0 | **Status:** Production Ready ✅
