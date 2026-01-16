# Single Project Dashboard Module

**Project:** Hexa Steel® — Operation Tracking System (OTS)  
**Module:** Single Project Dashboard  
**Version:** v1.0  
**Author:** Walid Dami  
**Date:** December 2024

---

## Overview

The Single Project Dashboard provides a comprehensive, unified view of all project data in one place. It displays detailed information for **one project at a time**, including production progress, QC status, WPS/ITP tracking, buildings status, documentation, and tasks.

### Key Features

- ✅ **Unified View** — All project data in one dashboard
- ✅ **Dynamic Project Selection** — Switch between projects via dropdown
- ✅ **Real-time Data** — Live updates from database
- ✅ **Collapsible Widgets** — Minimize/expand sections as needed
- ✅ **Deep Linking** — Share direct links with `?projectId=xxx`
- ✅ **RBAC Compliant** — Respects user permissions
- ✅ **Responsive Design** — Works on all screen sizes

---

## Architecture

### File Structure

```
src/
├── app/
│   ├── api/
│   │   └── projects/
│   │       └── [projectId]/
│   │           ├── summary/route.ts
│   │           ├── wps/route.ts
│   │           ├── itp/route.ts
│   │           ├── production/route.ts
│   │           ├── qc/route.ts
│   │           ├── buildings/route.ts
│   │           ├── documents/route.ts
│   │           └── tasks/route.ts
│   └── projects-dashboard/
│       ├── layout.tsx
│       └── page.tsx
├── components/
│   └── project-dashboard/
│       ├── ProjectHeader.tsx
│       ├── WPSStatusWidget.tsx
│       ├── ITPStatusWidget.tsx
│       ├── ProductionProgressWidget.tsx
│       ├── QCProgressWidget.tsx
│       ├── BuildingsStatusWidget.tsx
│       ├── DocumentationStatusWidget.tsx
│       ├── TasksOverviewWidget.tsx
│       ├── SingleProjectDashboard.tsx
│       └── index.ts
└── lib/
    └── types/
        └── project-dashboard.ts
```

---

## API Endpoints

All endpoints follow the pattern: `/api/projects/:projectId/{endpoint}`

### 1. Project Summary
**GET** `/api/projects/:projectId/summary`

Returns basic project information including client, tonnage, dates, and project manager.

**Response:**
```typescript
{
  id: string;
  projectNumber: string;
  name: string;
  clientName: string;
  totalBuildings: number;
  totalTonnage: number;
  startDate: Date | null;
  expectedCompletion: Date | null;
  contractDate: Date | null;
  status: string;
  projectManager: { id: string; name: string };
  salesEngineer?: { id: string; name: string } | null;
}
```

### 2. WPS Status
**GET** `/api/projects/:projectId/wps`

Returns all Welding Procedure Specifications with approval status.

**Response:**
```typescript
{
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  wps: WPSStatus[];
}
```

### 3. ITP Status
**GET** `/api/projects/:projectId/itp`

Returns all Inspection & Test Plans with activity completion.

**Response:**
```typescript
{
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  overdue: number;
  itps: ITPStatus[];
}
```

### 4. Production Progress
**GET** `/api/projects/:projectId/production`

Returns production metrics including weight produced vs required and weekly trends.

**Response:**
```typescript
{
  requiredWeight: number;
  producedWeight: number;
  progressPercentage: number;
  weeklyTrend: { week: string; produced: number }[];
  byProcess: { processType: string; weight: number; percentage: number }[];
}
```

### 5. QC Progress
**GET** `/api/projects/:projectId/qc`

Returns QC inspection statistics and timeline.

**Response:**
```typescript
{
  totalInspections: number;
  completedInspections: number;
  rejectedInspections: number;
  pendingInspections: number;
  progressPercentage: number;
  timeline: { date: string; inspections: number }[];
  byType: { type: string; total: number; completed: number; rejected: number }[];
}
```

### 6. Buildings Status
**GET** `/api/projects/:projectId/buildings`

Returns all buildings with production, QC, and dispatch status.

**Response:**
```typescript
BuildingStatus[] = [
  {
    id: string;
    designation: string;
    name: string;
    requiredWeight: number;
    producedWeight: number;
    productionProgress: number;
    qcStatus: { total: number; completed: number; rejected: number };
    dispatchStatus: { total: number; dispatched: number; percentage: number };
  }
]
```

### 7. Documentation Status
**GET** `/api/projects/:projectId/documents`

Returns documentation by category with upload status.

**Response:**
```typescript
{
  categories: DocumentationCategory[];
  totalDocuments: number;
  pendingApprovals: number;
}
```

### 8. Tasks Overview
**GET** `/api/projects/:projectId/tasks`

Returns all tasks for the project with filtering support.

**Query Parameters:**
- `status` — Filter by status: `completed`, `non-completed`, `all`
- `myTasks` — Filter to current user's tasks: `true`, `false`

**Response:**
```typescript
{
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  tasks: TaskOverview[];
}
```

---

## Widget Components

### ProjectHeader
Displays project summary information at the top of the dashboard.

**Features:**
- Project number and name
- Client name
- Total buildings and tonnage
- Project manager
- Contract, start, and end dates
- Status badge
- Actions: "Open in Projects" and "Export PDF"

### WPSStatusWidget
Shows all WPS with approval status.

**Features:**
- Summary stats (total, approved, pending, superseded)
- Collapsible table view
- Status badges
- Refresh button
- Click to view WPS details

### ITPStatusWidget
Shows all ITP with activity completion.

**Features:**
- Summary stats (total, approved, pending, rejected, overdue)
- Activity progress bars
- Collapsible table view
- Refresh button

### ProductionProgressWidget
Displays production progress with charts.

**Features:**
- Overall progress percentage
- Progress by process type (Fit-up, Welding, Painting, etc.)
- Weekly production trend chart
- Weight produced vs required
- Link to production module

### QCProgressWidget
Shows QC inspection statistics.

**Features:**
- Summary stats (total, completed, rejected, pending)
- Completion rate
- Inspections by type
- Timeline chart (last 30 days)
- Link to QC module

### BuildingsStatusWidget
Lists all buildings with their status.

**Features:**
- Production progress per building
- QC status per building
- Dispatch status per building
- Tonnage tracking
- Click to view building details

### DocumentationStatusWidget
Shows documentation by category.

**Features:**
- Total documents count
- Pending approvals
- Documents by category
- Missing items alerts
- Last update dates
- Link to documents module

### TasksOverviewWidget
Displays all project tasks.

**Features:**
- Summary stats (total, completed, in progress, pending, overdue)
- Filter options (all, my tasks, non-completed, completed)
- Task table with status and priority badges
- Overdue highlighting
- Add new task button
- Link to task details

---

## Usage

### Basic Usage

Navigate to `/projects-dashboard` and select a project from the dropdown.

### Deep Linking

Share direct links to specific projects:
```
/projects-dashboard?projectId=abc-123-def-456
```

### Refreshing Data

Each widget has a refresh button, or use the "Refresh All" button to reload all data.

---

## How to Add New Widgets

### Step 1: Create TypeScript Interface

Add your data type to `src/lib/types/project-dashboard.ts`:

```typescript
export interface MyNewWidget {
  // Define your data structure
  someField: string;
  someNumber: number;
}
```

### Step 2: Create API Endpoint

Create `src/app/api/projects/[projectId]/my-endpoint/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch your data from database
    const data = await prisma.yourModel.findMany({
      where: { projectId },
      // ... your query
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
```

### Step 3: Create Widget Component

Create `src/components/project-dashboard/MyNewWidget.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { MyNewWidget as MyNewWidgetType } from '@/lib/types/project-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface MyNewWidgetProps {
  data: MyNewWidgetType;
  onRefresh?: () => void;
}

export function MyNewWidget({ data, onRefresh }: MyNewWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">My New Widget</CardTitle>
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
          {/* Your widget content here */}
        </CardContent>
      )}
    </Card>
  );
}
```

### Step 4: Add to Dashboard

Update `src/components/project-dashboard/SingleProjectDashboard.tsx`:

1. Import your widget:
```typescript
import { MyNewWidget } from './MyNewWidget';
```

2. Add to interface:
```typescript
interface ProjectDashboardData {
  // ... existing fields
  myNewData: MyNewWidgetType;
}
```

3. Fetch data in `fetchDashboardData`:
```typescript
const [summary, wps, itp, production, qc, buildings, documentation, tasks, myNewData] = await Promise.all([
  // ... existing fetches
  fetch(`/api/projects/${id}/my-endpoint`).then(r => r.json()),
]);
```

4. Add widget to render:
```tsx
<MyNewWidget 
  data={dashboardData.myNewData} 
  onRefresh={() => fetchDashboardData(projectId)}
/>
```

### Step 5: Export Component

Add to `src/components/project-dashboard/index.ts`:

```typescript
export { MyNewWidget } from './MyNewWidget';
```

---

## Best Practices

### Performance
- Use `Promise.all()` to fetch data in parallel
- Implement loading skeletons for better UX
- Cache data when appropriate
- Use `dynamic = 'force-dynamic'` for real-time data

### Error Handling
- Always wrap API calls in try-catch
- Show user-friendly error messages
- Provide retry mechanisms
- Log errors for debugging

### UI/UX
- Keep widgets collapsible to reduce clutter
- Use consistent color coding (green = good, yellow = warning, red = critical)
- Show loading states during data fetches
- Provide refresh buttons for manual updates
- Use tooltips for additional context

### Data Integrity
- Never use placeholder data
- Always validate data from API
- Handle null/undefined values gracefully
- Use TypeScript for type safety

---

## Testing

### Manual Testing Checklist

- [ ] Project selector loads all projects
- [ ] Selecting a project loads all widgets
- [ ] Deep linking works with `?projectId=xxx`
- [ ] All widgets display real data
- [ ] Refresh buttons update data
- [ ] Collapsible widgets work correctly
- [ ] External links navigate correctly
- [ ] Loading states appear during fetches
- [ ] Error states display properly
- [ ] Responsive design works on mobile

### API Testing

Test each endpoint individually:

```bash
# Summary
curl http://localhost:3000/api/projects/{projectId}/summary

# WPS
curl http://localhost:3000/api/projects/{projectId}/wps

# ITP
curl http://localhost:3000/api/projects/{projectId}/itp

# Production
curl http://localhost:3000/api/projects/{projectId}/production

# QC
curl http://localhost:3000/api/projects/{projectId}/qc

# Buildings
curl http://localhost:3000/api/projects/{projectId}/buildings

# Documents
curl http://localhost:3000/api/projects/{projectId}/documents

# Tasks
curl http://localhost:3000/api/projects/{projectId}/tasks
```

---

## Troubleshooting

### Dashboard Not Loading
1. Check browser console for errors
2. Verify API endpoints are responding
3. Check database connection
4. Verify user has permissions

### Missing Data
1. Ensure project has related data in database
2. Check Prisma relations are correct
3. Verify API queries are fetching correctly
4. Check for null/undefined handling

### Performance Issues
1. Check database query performance
2. Reduce data fetched per widget
3. Implement pagination for large datasets
4. Add database indexes if needed

---

## Future Enhancements

### Planned Features
- [ ] Export dashboard to PDF
- [ ] Email dashboard reports
- [ ] Custom widget layouts
- [ ] Dashboard templates
- [ ] Real-time WebSocket updates
- [ ] Advanced filtering options
- [ ] Comparison mode (multiple projects)
- [ ] Historical data trends
- [ ] Predictive analytics

### Widget Ideas
- Financial overview (costs, payments)
- Risk assessment widget
- Resource allocation
- Timeline/Gantt chart
- Weather impact tracker
- Supplier performance
- Team productivity metrics

---

## Support

For questions or issues:
- Check this documentation first
- Review the code comments
- Contact: Walid Dami
- Project: Hexa Steel® OTS

---

**Last Updated:** December 2024  
**Version:** 1.0  
**Status:** Production Ready ✅
