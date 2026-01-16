# Notification Center Integration Examples

This document provides practical examples of integrating the Notification Center with existing OTS modules.

---

## Task Module Integration

### Update Task Assignment API

**File:** `src/app/api/tasks/route.ts`

```typescript
import NotificationService from '@/lib/services/notification.service';

export async function POST(request: Request) {
  // ... existing task creation logic
  
  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      assignedToId: data.assignedToId,
      createdById: session.sub,
      dueDate: data.dueDate,
      projectId: data.projectId,
      buildingId: data.buildingId,
      priority: data.priority,
    },
    include: {
      assignedTo: true,
      createdBy: true,
      project: { select: { name: true } },
      building: { select: { name: true } },
    },
  });

  // Send notification to assigned user
  if (task.assignedToId) {
    await NotificationService.notifyTaskAssigned({
      taskId: task.id,
      assignedToId: task.assignedToId,
      taskTitle: task.title,
      assignedByName: task.createdBy.name,
      dueDate: task.dueDate,
      projectName: task.project?.name,
      buildingName: task.building?.name,
    });
  }

  return NextResponse.json({ task });
}
```

---

## RFI Module Integration

### Update RFI Assignment

**File:** `src/app/api/qc/rfi/route.ts`

```typescript
import NotificationService from '@/lib/services/notification.service';

export async function POST(request: Request) {
  // ... existing RFI creation logic
  
  const rfi = await prisma.rFIRequest.create({
    data: {
      projectId: data.projectId,
      buildingId: data.buildingId,
      inspectionType: data.inspectionType,
      requestedById: session.sub,
      assignedToId: data.assignedToId,
      inspectionDate: data.inspectionDate,
    },
    include: {
      requestedBy: true,
      assignedTo: true,
      project: { select: { name: true } },
    },
  });

  // Notify assigned inspector
  if (rfi.assignedToId) {
    await NotificationService.notifyApprovalRequired({
      userId: rfi.assignedToId,
      entityType: 'RFI',
      entityId: rfi.id,
      entityName: rfi.rfiNumber || 'RFI Request',
      requesterName: rfi.requestedBy.name,
      deadline: rfi.inspectionDate,
    });
  }

  return NextResponse.json({ rfi });
}

// Update RFI status
export async function PATCH(request: Request) {
  const { id, status, qcComments } = await request.json();
  
  const rfi = await prisma.rFIRequest.update({
    where: { id },
    data: { status, qcComments },
    include: {
      requestedBy: true,
      assignedTo: true,
    },
  });

  // Notify requester of result
  if (status === 'QC Checked') {
    await NotificationService.notifyApproved({
      userId: rfi.requestedById,
      entityType: 'RFI',
      entityId: rfi.id,
      entityName: rfi.rfiNumber || 'RFI Request',
      approverName: rfi.assignedTo?.name || 'QC Inspector',
    });
  } else if (status === 'Rejected') {
    await NotificationService.notifyRejected({
      userId: rfi.requestedById,
      entityType: 'RFI',
      entityId: rfi.id,
      entityName: rfi.rfiNumber || 'RFI Request',
      rejectorName: rfi.assignedTo?.name || 'QC Inspector',
      reason: qcComments,
    });
  }

  return NextResponse.json({ rfi });
}
```

---

## NCR Module Integration

### Update NCR Assignment

**File:** `src/app/api/qc/ncr/route.ts`

```typescript
import NotificationService from '@/lib/services/notification.service';

export async function POST(request: Request) {
  // ... existing NCR creation logic
  
  const ncr = await prisma.nCRReport.create({
    data: {
      projectId: data.projectId,
      buildingId: data.buildingId,
      productionLogId: data.productionLogId,
      description: data.description,
      deadline: data.deadline,
      raisedById: session.sub,
      assignedToId: data.assignedToId,
      severity: data.severity,
    },
    include: {
      raisedBy: true,
      assignedTo: true,
      project: { select: { name: true } },
    },
  });

  // Notify assigned person
  if (ncr.assignedToId) {
    await NotificationService.notifyApprovalRequired({
      userId: ncr.assignedToId,
      entityType: 'NCR',
      entityId: ncr.id,
      entityName: ncr.ncrNumber,
      requesterName: ncr.raisedBy.name,
      deadline: ncr.deadline,
    });
  }

  return NextResponse.json({ ncr });
}

// Close NCR
export async function PATCH(request: Request) {
  const { id, status, closedById } = await request.json();
  
  if (status === 'Closed') {
    const ncr = await prisma.nCRReport.update({
      where: { id },
      data: {
        status: 'Closed',
        closedDate: new Date(),
        closedById,
      },
      include: {
        raisedBy: true,
        closedBy: true,
      },
    });

    // Notify the person who raised the NCR
    await NotificationService.notifyApproved({
      userId: ncr.raisedById,
      entityType: 'NCR',
      entityId: ncr.id,
      entityName: ncr.ncrNumber,
      approverName: ncr.closedBy?.name || 'System',
    });

    return NextResponse.json({ ncr });
  }
}
```

---

## Document Approval Integration

### Update Document Submission

**File:** `src/app/api/documents/route.ts`

```typescript
import NotificationService from '@/lib/services/notification.service';

export async function POST(request: Request) {
  // ... existing document creation logic
  
  const document = await prisma.document.create({
    data: {
      documentNumber: data.documentNumber,
      title: data.title,
      categoryId: data.categoryId,
      uploadedById: session.sub,
      approvedById: data.approvedById,
      status: 'Under Review',
      reviewDate: data.reviewDate,
    },
    include: {
      uploadedBy: true,
      approvedBy: true,
    },
  });

  // Notify approver
  if (document.approvedById) {
    await NotificationService.notifyApprovalRequired({
      userId: document.approvedById,
      entityType: 'document',
      entityId: document.id,
      entityName: document.title,
      requesterName: document.uploadedBy.name,
      deadline: document.reviewDate,
    });
  }

  return NextResponse.json({ document });
}

// Approve/Reject document
export async function PATCH(request: Request) {
  const { id, status, approvedById } = await request.json();
  
  const document = await prisma.document.update({
    where: { id },
    data: {
      status,
      approvedById,
      effectiveDate: status === 'Approved' ? new Date() : null,
    },
    include: {
      uploadedBy: true,
      approvedBy: true,
    },
  });

  // Notify uploader
  if (status === 'Approved') {
    await NotificationService.notifyApproved({
      userId: document.uploadedById,
      entityType: 'document',
      entityId: document.id,
      entityName: document.title,
      approverName: document.approvedBy?.name || 'Approver',
    });
  } else if (status === 'Rejected') {
    await NotificationService.notifyRejected({
      userId: document.uploadedById,
      entityType: 'document',
      entityId: document.id,
      entityName: document.title,
      rejectorName: document.approvedBy?.name || 'Approver',
      reason: 'Document requires revision',
    });
  }

  return NextResponse.json({ document });
}
```

---

## ITP/WPS Approval Integration

### Update ITP Approval

**File:** `src/app/api/itp/route.ts`

```typescript
import NotificationService from '@/lib/services/notification.service';

export async function PATCH(request: Request) {
  const { id, status, approvedById, rejectionReason } = await request.json();
  
  const itp = await prisma.iTP.update({
    where: { id },
    data: {
      status,
      approvedById,
      dateApproved: status === 'Approved' ? new Date() : null,
      rejectionReason,
    },
    include: {
      createdBy: true,
      approvedBy: true,
    },
  });

  // Notify creator
  if (status === 'Approved') {
    await NotificationService.notifyApproved({
      userId: itp.createdById,
      entityType: 'ITP',
      entityId: itp.id,
      entityName: itp.itpNumber,
      approverName: itp.approvedBy?.name || 'Approver',
    });
  } else if (status === 'Rejected') {
    await NotificationService.notifyRejected({
      userId: itp.createdById,
      entityType: 'ITP',
      entityId: itp.id,
      entityName: itp.itpNumber,
      rejectorName: itp.approvedBy?.name || 'Approver',
      reason: rejectionReason,
    });
  }

  return NextResponse.json({ itp });
}
```

---

## Business Planning Integration

### Update Initiative Assignment

**File:** `src/app/api/business-planning/initiatives/route.ts`

```typescript
import NotificationService from '@/lib/services/notification.service';

export async function POST(request: Request) {
  // ... existing initiative creation logic
  
  const initiative = await prisma.initiative.create({
    data: {
      title: data.title,
      description: data.description,
      ownerId: data.ownerId,
      departmentId: data.departmentId,
      targetDate: data.targetDate,
      createdById: session.sub,
    },
    include: {
      owner: true,
      createdBy: true,
    },
  });

  // Notify initiative owner
  if (initiative.ownerId) {
    await NotificationService.notifyTaskAssigned({
      taskId: initiative.id,
      assignedToId: initiative.ownerId,
      taskTitle: initiative.title,
      assignedByName: initiative.createdBy.name,
      dueDate: initiative.targetDate,
    });
  }

  return NextResponse.json({ initiative });
}
```

---

## System Notifications

### Maintenance Notifications

```typescript
import NotificationService from '@/lib/services/notification.service';

// Notify all admins of system maintenance
async function notifySystemMaintenance() {
  const admins = await prisma.user.findMany({
    where: {
      role: { name: 'admin' },
      status: 'active',
    },
  });

  for (const admin of admins) {
    await NotificationService.notifySystem({
      userId: admin.id,
      title: 'Scheduled Maintenance',
      message: 'System maintenance is scheduled for tonight at 10:00 PM. Expected downtime: 2 hours.',
      metadata: {
        maintenanceDate: '2024-12-09T22:00:00Z',
        duration: '2 hours',
      },
    });
  }
}
```

### Data Import Completion

```typescript
// Notify user when data import is complete
async function notifyImportComplete(userId: string, importId: string, recordCount: number) {
  await NotificationService.notifySystem({
    userId,
    title: 'Import Complete',
    message: `Your data import has completed successfully. ${recordCount} records were imported.`,
    metadata: {
      importId,
      recordCount,
      completedAt: new Date().toISOString(),
    },
  });
}
```

---

## Batch Notifications

### Notify Multiple Users

```typescript
import NotificationService from '@/lib/services/notification.service';

// Notify all project team members
async function notifyProjectTeam(projectId: string, message: string) {
  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId },
    include: { user: true },
  });

  for (const assignment of assignments) {
    await NotificationService.notifySystem({
      userId: assignment.userId,
      title: 'Project Update',
      message,
      metadata: {
        projectId,
      },
    });
  }
}

// Usage
await notifyProjectTeam(
  'project-123',
  'The project timeline has been updated. Please review the new schedule.'
);
```

---

## Error Handling

### Graceful Notification Failures

```typescript
async function createTaskWithNotification(taskData: any) {
  // Create task first
  const task = await prisma.task.create({ data: taskData });

  // Try to send notification, but don't fail the task creation
  try {
    if (task.assignedToId) {
      await NotificationService.notifyTaskAssigned({
        taskId: task.id,
        assignedToId: task.assignedToId,
        taskTitle: task.title,
        assignedByName: 'System',
      });
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    // Log error but continue
  }

  return task;
}
```

---

## Testing Integration

### Example Test

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import NotificationService from '@/lib/services/notification.service';

describe('Task Assignment Notifications', () => {
  it('should create notification when task is assigned', async () => {
    const task = await createTask({
      title: 'Test Task',
      assignedToId: 'user-123',
    });

    const notifications = await NotificationService.getNotifications({
      userId: 'user-123',
      isRead: false,
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('TASK_ASSIGNED');
    expect(notifications[0].title).toBe('New Task Assigned');
  });
});
```

---

## Best Practices

1. **Always use try-catch** when sending notifications to prevent blocking main operations
2. **Include relevant metadata** for better context and debugging
3. **Use appropriate notification types** for better filtering
4. **Set deadlines** when applicable for deadline warnings
5. **Provide clear, actionable messages** in notifications
6. **Test notification triggers** in development before deploying
7. **Monitor notification volume** to prevent spam
8. **Clean up old notifications** periodically

---

## Common Patterns

### Pattern 1: Assignment Notification
```typescript
// When assigning work to someone
await NotificationService.notifyTaskAssigned({...});
```

### Pattern 2: Approval Flow
```typescript
// Request approval
await NotificationService.notifyApprovalRequired({...});

// Approval result
if (approved) {
  await NotificationService.notifyApproved({...});
} else {
  await NotificationService.notifyRejected({...});
}
```

### Pattern 3: Deadline Warning
```typescript
// Handled automatically by DeadlineSchedulerService
// Just ensure entities have deadline fields
```

### Pattern 4: System Broadcast
```typescript
// Notify multiple users
for (const user of users) {
  await NotificationService.notifySystem({
    userId: user.id,
    title: 'System Update',
    message: '...',
  });
}
```
