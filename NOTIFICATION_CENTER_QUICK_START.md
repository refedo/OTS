# Notification Center - Quick Start Guide

Get the Notification Center up and running in 5 minutes.

---

## Step 1: Run Database Migration

```bash
# Generate Prisma client with new schema
npx prisma generate

# Create and run migration
npx prisma migrate dev --name add_notification_center
```

This will:
- Create the `notifications` table
- Add `NotificationType` enum
- Set up all indexes
- Update Prisma client

---

## Step 2: Add Notification Bell to Header

Find your main header/navigation component and add the NotificationBell:

```tsx
// Example: src/components/Header.tsx or src/app/layout.tsx
import NotificationBell from '@/components/NotificationBell';

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <div>Logo / Navigation</div>
      
      <div className="flex items-center gap-4">
        {/* Other header items */}
        <NotificationBell />
      </div>
    </header>
  );
}
```

---

## Step 3: Start Deadline Scheduler (Optional)

If you want automatic deadline warnings, add this to your server startup:

**Option A: Next.js API Route (Recommended)**

Create `src/app/api/cron/deadline-check/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import DeadlineSchedulerService from '@/lib/services/deadline-scheduler.service';

export async function GET() {
  await DeadlineSchedulerService.checkDeadlines();
  return NextResponse.json({ success: true });
}
```

Then set up a cron job (external service like Vercel Cron, cron-job.org, etc.) to call:
```
GET https://your-domain.com/api/cron/deadline-check
```

**Option B: Server-side Scheduler**

If using a custom server, add to your server file:

```typescript
import DeadlineSchedulerService from '@/lib/services/deadline-scheduler.service';

// Start scheduler when server starts
DeadlineSchedulerService.start();
```

---

## Step 4: Test the System

### Create a Test Notification

```typescript
// In any API route or server component
import NotificationService from '@/lib/services/notification.service';

// Get current user ID (from your auth system)
const userId = 'your-user-id';

// Create a test notification
await NotificationService.notifySystem({
  userId,
  title: 'Welcome to Notification Center!',
  message: 'Your notification system is now active.',
});
```

### Verify It Works

1. Refresh your app
2. Check the notification bell - you should see a red badge with "1"
3. Click the bell to see your notification
4. Click "Mark all read" to clear it

---

## Step 5: Integrate with Existing Modules

Add notifications to your existing features:

### Example: Task Assignment

```typescript
// In your task creation API
import NotificationService from '@/lib/services/notification.service';

const task = await prisma.task.create({
  data: { /* task data */ },
  include: { createdBy: true, project: true },
});

// Send notification
if (task.assignedToId) {
  await NotificationService.notifyTaskAssigned({
    taskId: task.id,
    assignedToId: task.assignedToId,
    taskTitle: task.title,
    assignedByName: task.createdBy.name,
    dueDate: task.dueDate,
    projectName: task.project?.name,
  });
}
```

See `docs/NOTIFICATION_INTEGRATION_EXAMPLES.md` for more examples.

---

## Step 6: Configure AI Summary (Optional)

To enable AI-powered notification summaries:

1. Add OpenAI API key to `.env`:
```env
OPENAI_API_KEY=sk-your-api-key-here
```

2. Test the summary:
   - Go to `/notifications`
   - Click "Generate Summary"
   - View AI-generated overview

---

## Common Use Cases

### 1. Task Assignment
```typescript
await NotificationService.notifyTaskAssigned({
  taskId: task.id,
  assignedToId: userId,
  taskTitle: 'Review design drawings',
  assignedByName: 'John Doe',
  dueDate: new Date('2024-12-15'),
});
```

### 2. Approval Request
```typescript
await NotificationService.notifyApprovalRequired({
  userId: approverId,
  entityType: 'RFI',
  entityId: rfi.id,
  entityName: 'RFI-2024-001',
  requesterName: 'Jane Smith',
  deadline: new Date('2024-12-10'),
});
```

### 3. Approval Result
```typescript
// Approved
await NotificationService.notifyApproved({
  userId: requesterId,
  entityType: 'document',
  entityId: doc.id,
  entityName: 'Quality Manual v2.0',
  approverName: 'QA Manager',
});

// Rejected
await NotificationService.notifyRejected({
  userId: requesterId,
  entityType: 'NCR',
  entityId: ncr.id,
  entityName: 'NCR-2024-005',
  rejectorName: 'QC Inspector',
  reason: 'Incomplete corrective action',
});
```

---

## Troubleshooting

### Notifications not appearing?

1. **Check database:**
   ```sql
   SELECT * FROM notifications WHERE userId = 'your-user-id' ORDER BY createdAt DESC;
   ```

2. **Check Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Check browser console** for errors

4. **Verify authentication** - user must be logged in

### Deadline scheduler not running?

1. Check if scheduler is started
2. Review server logs
3. Verify cron expression is correct
4. Test manually: `DeadlineSchedulerService.checkDeadlines()`

### AI summary not working?

1. Verify `OPENAI_API_KEY` is set
2. Check API quota/limits
3. Review browser console for errors

---

## Next Steps

1. ✅ **Read full documentation:** `docs/NOTIFICATION_CENTER_MODULE.md`
2. ✅ **Review integration examples:** `docs/NOTIFICATION_INTEGRATION_EXAMPLES.md`
3. ✅ **Add notifications to your modules** (tasks, RFI, NCR, etc.)
4. ✅ **Set up deadline scheduler** for automatic warnings
5. ✅ **Configure AI summaries** for better insights
6. ✅ **Test thoroughly** before production deployment

---

## Support

For issues or questions:
- Check documentation in `docs/` folder
- Review example integrations
- Test API endpoints with Postman/curl
- Check server logs for errors

---

## Quick Reference

### API Endpoints
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/:id/archive` - Archive
- `POST /api/notifications/bulk-read` - Mark all read
- `GET /api/notifications/summary` - AI summary

### Components
- `<NotificationBell />` - Bell icon with badge
- `<NotificationPanel />` - Dropdown panel
- `/notifications` - Full page view

### Service Methods
- `NotificationService.notifyTaskAssigned()`
- `NotificationService.notifyApprovalRequired()`
- `NotificationService.notifyDeadlineWarning()`
- `NotificationService.notifyApproved()`
- `NotificationService.notifyRejected()`
- `NotificationService.notifySystem()`

---

**You're all set! 🎉**

The Notification Center is now ready to keep your team informed and productive.
