# Operations Timeline Module

## Overview

The Operations Timeline module is a comprehensive system for tracking and visualizing all major operational milestones in the Hexa Steel® OTS. It automatically captures events from various modules (Document Control, Production, QC, Procurement, etc.) and provides a visual timeline showing project progress through all stages.

## Features

### 1. Automatic Event Capture
- **Document Control Integration**: Automatically captures architectural approval, design submission/approval, shop drawing submission/approval
- **Production Integration**: Tracks production start, coating/galvanization, dispatching, erection start/completion
- **Procurement Integration**: Records when procurement starts
- **Manual Override**: Authorized users (Admin/Project Manager) can manually add or edit events

### 2. Visual Timeline
- **Horizontal Timeline**: Interactive timeline with color-coded circles showing stage completion
- **Vertical Timeline**: Alternative view for detailed information
- **Status Indicators**:
  - ✓ Green: Completed
  - 🟡 Yellow: Pending/In Progress
  - ❌ Red: Delayed/Failed
  - ⚪ Gray: Not Started

### 3. Analytics Dashboard
- **Stage Completion Rates**: Percentage of projects reaching each stage
- **Event Status Distribution**: Pie chart showing completed/pending/delayed events
- **Average Stage Durations**: Time taken between stages
- **Project Progress Overview**: Completion status for all projects
- **Delayed Projects Alert**: Highlights projects with delayed milestones

### 4. Permissions
- **Admin**: Full access, can add/edit/delete events
- **Project Manager**: Can add manual events, edit descriptions
- **Engineer**: View only
- **Department Users**: View only their relevant stages

## Database Schema

### OperationEvent
Stores individual operational events/milestones.

```typescript
{
  id: string
  projectId: string
  buildingId?: string
  stage: string // ARCH_APPROVED, DESIGN_SUBMITTED, etc.
  description?: string
  eventSource: string // document_control, production, manual, etc.
  eventDate: DateTime
  status: string // Completed, Pending, Delayed, Failed
  createdBy?: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

### OperationStageConfig
Defines the standard operational stages.

```typescript
{
  id: string
  stageCode: string // Unique identifier
  stageName: string // Display name
  orderIndex: number // Sequence order
  autoSource?: string // Module that triggers it
  description?: string
  color?: string // UI color (#10b981)
  icon?: string // Icon or emoji
  isMandatory: boolean
}
```

### OperationEventAudit
Tracks changes to events for audit purposes.

```typescript
{
  id: string
  eventId: string
  oldStatus?: string
  newStatus?: string
  oldDate?: DateTime
  newDate?: DateTime
  changedBy: string
  changeReason?: string
  changeDate: DateTime
}
```

## Standard Stages

1. **ARCH_APPROVED** - Architectural Drawings Approved
2. **DESIGN_SUBMITTED** - Design Package Submitted
3. **DESIGN_APPROVED** - Design Package Approved
4. **SHOP_SUBMITTED** - Shop Drawings Submitted
5. **SHOP_APPROVED** - Shop Drawings Approved
6. **PROCUREMENT_START** - Procurement Started
7. **PRODUCTION_START** - Production Started
8. **COATING_OR_GALVANIZED** - Coating/Galvanization Completed
9. **DISPATCHING** - Dispatch to Site
10. **ERECTION_START** - Erection Started
11. **ERECTION_COMPLETED** - Erection Completed

## API Endpoints

### GET /api/operations/:projectId/timeline
Get all events for a project.

**Query Parameters:**
- `buildingId` (optional): Filter by building

**Response:**
```json
{
  "timeline": [
    {
      "stage": "ARCH_APPROVED",
      "stageName": "Architectural Drawings Approved",
      "orderIndex": 1,
      "color": "#10b981",
      "icon": "✓",
      "isMandatory": true,
      "event": {
        "id": "...",
        "eventDate": "2025-01-15T00:00:00Z",
        "status": "Completed",
        "eventSource": "document_control"
      }
    }
  ]
}
```

### POST /api/operations/:projectId/event
Manually add an event (Admin/PM only).

**Request Body:**
```json
{
  "stage": "DESIGN_APPROVED",
  "buildingId": "optional-building-id",
  "eventDate": "2025-01-20T00:00:00Z",
  "description": "Design package approved by client",
  "status": "Completed"
}
```

### PATCH /api/operations/event/:id
Edit an event (Admin/PM only).

**Request Body:**
```json
{
  "eventDate": "2025-01-21T00:00:00Z",
  "status": "Delayed",
  "description": "Updated description",
  "changeReason": "Date correction"
}
```

### DELETE /api/operations/event/:id
Delete an event (Admin only).

### GET /api/operations/dashboard
Get analytics dashboard data.

**Response:**
```json
{
  "stageStats": [...],
  "projectStats": [...],
  "stageDurations": [...],
  "delayedProjects": [...],
  "summary": {
    "totalProjects": 10,
    "totalEvents": 45,
    "completedEvents": 30,
    "delayedEvents": 2,
    "pendingEvents": 13
  }
}
```

## Integration Guide

### Integrating with Document Control

In your document submission API route, add:

```typescript
import { captureDocumentEvent } from '@/lib/hooks/useOperationTimeline';

// After updating document status
await captureDocumentEvent(
  documentType, // 'Architectural Drawing', 'Shop Drawing', etc.
  newStatus,    // 'Released', 'Submitted for approval', etc.
  projectId,
  buildingId,
  new Date()
);
```

### Integrating with Production

In your production log API route, add:

```typescript
import { captureProductionEvent } from '@/lib/hooks/useOperationTimeline';

// After creating production log
await captureProductionEvent(
  processType,  // 'Preparation', 'Welding', 'Dispatch', 'Erection'
  projectId,
  buildingId,
  dateProcessed
);
```

### Integrating with Procurement

In your purchase order API route, add:

```typescript
import { captureProcurementEvent } from '@/lib/hooks/useOperationTimeline';

// After creating first purchase order
await captureProcurementEvent(projectId, orderDate);
```

## UI Components

### OperationTimeline
Main timeline visualization component.

```tsx
import { OperationTimeline } from '@/components/operations/OperationTimeline';

<OperationTimeline
  timeline={timelineData}
  mode="horizontal" // or "vertical"
  showDetails={true}
/>
```

### OperationTimelineClient
Full-featured timeline page with filters and add event dialog.

```tsx
import { OperationTimelineClient } from '@/components/operations/OperationTimelineClient';

<OperationTimelineClient
  projectId={projectId}
  project={project}
  buildings={buildings}
  canEdit={canEdit}
  userRole={userRole}
/>
```

### OperationsDashboardClient
Analytics dashboard component.

```tsx
import { OperationsDashboardClient } from '@/components/operations/OperationsDashboardClient';

<OperationsDashboardClient />
```

## Pages

- `/projects/:id/timeline` - Project-specific timeline
- `/operations/dashboard` - Operations analytics dashboard

## Notifications & SLA Monitoring

The system includes built-in SLA monitoring:

```typescript
import { OperationTimelineService } from '@/lib/services/operation-timeline.service';

// Check for missing stages (e.g., in a cron job)
const missingStages = await OperationTimelineService.checkMissingStages(projectId);

// missingStages will contain stages that are overdue (>14 days since previous stage)
```

## KPI Integration

The Operations Timeline feeds into the KPI engine with metrics such as:
- Design-to-Approval Time
- Shop Drawing Approval Time
- Procurement Start Delay
- Production Readiness Lag

These metrics are automatically calculated and can be used in KPI dashboards.

## Seeding Data

To seed the standard operation stages:

```bash
node scripts/seed-operation-stages.js
```

This will create all 11 standard stages with their configurations.

## Future Enhancements

1. **Export Timeline**: Export timeline as image or PDF for reports
2. **Client Portal**: Read-only timeline view for clients
3. **Email Notifications**: Automatic alerts for delayed stages
4. **Custom Stages**: Allow projects to define custom stages
5. **Milestone Dependencies**: Define dependencies between stages
6. **Predictive Analytics**: ML-based prediction of completion dates

## Troubleshooting

### Events Not Appearing
1. Check that the stage code matches exactly (case-sensitive)
2. Verify that the project ID is correct
3. Check database for existing events (may be deduplicated)
4. Review console logs for errors

### Timeline Not Loading
1. Verify API endpoint is accessible
2. Check browser console for errors
3. Ensure user has proper permissions
4. Verify database connection

### Automatic Capture Not Working
1. Ensure integration hooks are called in API routes
2. Check that document types/statuses match expected values
3. Review service logs for errors
4. Verify Prisma client is properly initialized

## Support

For issues or questions, contact the development team or refer to the main OTS documentation.
