# Notification Center Module

**Project:** Hexa Steel® — Operation Tracking System (OTS)  
**Module:** Notification Center  
**Version:** v1.0  
**Author:** Walid Dami  
**Date:** December 8, 2024

---

## Overview

The Notification Center is a comprehensive notification system for the OTS platform that keeps users informed about:
- Task assignments
- Approval requests
- Approaching deadlines
- Approval results (approved/rejected)
- System notifications

The module integrates with the AI Assistant for smart summarization and includes real-time updates.

---

## Architecture

### Database Schema

#### Notification Model
```prisma
enum NotificationType {
  TASK_ASSIGNED
  APPROVAL_REQUIRED
  DEADLINE_WARNING
  APPROVED
  REJECTED
  SYSTEM
}

model Notification {
  id                String           @id @default(uuid())
  userId            String
  type              NotificationType
  title             String
  message           String
  relatedEntityType String?          // 'project' | 'building' | 'task' | 'rfi' | 'ncr' | etc.
  relatedEntityId   String?
  isRead            Boolean          @default(false)
  readAt            DateTime?
  isArchived        Boolean          @default(false)
  archivedAt        DateTime?
  deadlineAt        DateTime?
  metadata          Json?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
}
```

---

## Backend Components

### 1. Notification Service
**Location:** `src/lib/services/notification.service.ts`

**Key Methods:**
- `createNotification()` - Create a new notification
- `getNotifications()` - Fetch notifications with filters
- `getUnreadCount()` - Get count of unread notifications
- `markAsRead()` - Mark notification as read
- `markAllAsRead()` - Mark all notifications as read
- `archiveNotification()` - Archive a notification
- `getDeadlineNotifications()` - Get notifications grouped by urgency

**Trigger Methods:**
- `notifyTaskAssigned()` - When a task is assigned
- `notifyApprovalRequired()` - When approval is needed
- `notifyDeadlineWarning()` - When deadline is approaching
- `notifyApproved()` - When item is approved
- `notifyRejected()` - When item is rejected
- `notifySystem()` - System notifications

### 2. Deadline Scheduler Service
**Location:** `src/lib/services/deadline-scheduler.service.ts`

**Purpose:** Scans for upcoming deadlines and creates warning notifications

**Schedule:** Runs daily at 8:00 AM using node-cron

**Checks:**
- Task deadlines (< 48 hours)
- NCR report deadlines
- RFI inspection dates
- Document review dates

### 3. API Routes

#### GET `/api/notifications`
Fetch user's notifications with filters

**Query Parameters:**
- `isRead` - Filter by read status (true/false)
- `isArchived` - Filter by archived status (true/false)
- `type` - Filter by notification type
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "notifications": [...],
  "unreadCount": 5,
  "total": 50
}
```

#### PATCH `/api/notifications/[id]/read`
Mark a notification as read

#### PATCH `/api/notifications/[id]/archive`
Archive a notification

#### POST `/api/notifications/bulk-read`
Mark all notifications as read

**Response:**
```json
{
  "success": true,
  "count": 10
}
```

#### GET `/api/notifications/summary`
Get AI-powered summary of pending notifications

**Response:**
```json
{
  "summary": "You have 3 urgent tasks...",
  "count": 15,
  "deadlines": {
    "urgent": 2,
    "soon": 3,
    "upcoming": 5
  }
}
```

---

## Frontend Components

### 1. NotificationBell
**Location:** `src/components/NotificationBell.tsx`

**Features:**
- Bell icon with unread count badge
- Dropdown panel on click
- Auto-refresh every 30 seconds

**Usage:**
```tsx
import NotificationBell from '@/components/NotificationBell';

<NotificationBell />
```

### 2. NotificationPanel
**Location:** `src/components/NotificationPanel.tsx`

**Features:**
- Tabbed interface (All, Unread, Approvals, Deadlines, Archived)
- Real-time updates
- Click to navigate to related entity
- Archive and mark as read actions
- Deadline countdown badges

### 3. Notifications Page
**Location:** `src/app/notifications/page.tsx`

**Features:**
- Full-page notification center
- AI-powered summary
- Bulk actions
- Advanced filtering
- Responsive design

**Route:** `/notifications`

---

## Integration Guide

### 1. Add Notification Bell to Layout

```tsx
// In your main layout or header component
import NotificationBell from '@/components/NotificationBell';

export default function Header() {
  return (
    <header>
      {/* Other header content */}
      <NotificationBell />
    </header>
  );
}
```

### 2. Trigger Notifications in Your Code

#### Example: Task Assignment
```typescript
import NotificationService from '@/lib/services/notification.service';

// When assigning a task
await NotificationService.notifyTaskAssigned({
  taskId: task.id,
  assignedToId: task.assignedToId,
  taskTitle: task.title,
  assignedByName: currentUser.name,
  dueDate: task.dueDate,
  projectName: project?.name,
  buildingName: building?.name,
});
```

#### Example: Approval Request
```typescript
await NotificationService.notifyApprovalRequired({
  userId: approver.id,
  entityType: 'document',
  entityId: document.id,
  entityName: document.title,
  requesterName: currentUser.name,
  deadline: reviewDeadline,
});
```

#### Example: Approval Result
```typescript
// When approving
await NotificationService.notifyApproved({
  userId: submitter.id,
  entityType: 'RFI',
  entityId: rfi.id,
  entityName: rfi.rfiNumber,
  approverName: currentUser.name,
});

// When rejecting
await NotificationService.notifyRejected({
  userId: submitter.id,
  entityType: 'NCR',
  entityId: ncr.id,
  entityName: ncr.ncrNumber,
  rejectorName: currentUser.name,
  reason: 'Incomplete information',
});
```

### 3. Start Deadline Scheduler

Add to your server startup file (e.g., `server.ts` or `app.ts`):

```typescript
import DeadlineSchedulerService from '@/lib/services/deadline-scheduler.service';

// Start the scheduler
DeadlineSchedulerService.start();
```

---

## Database Migration

### Run Migration

```bash
# Create migration
npx prisma migrate dev --name add_notification_center

# Generate Prisma client
npx prisma generate
```

### Migration File
The migration will:
1. Create `NotificationType` enum
2. Create `notifications` table
3. Add indexes for performance
4. Add foreign key to `users` table

---

## Testing

### Manual Testing Checklist

- [ ] Create a notification manually via service
- [ ] Verify notification appears in bell dropdown
- [ ] Mark notification as read
- [ ] Archive notification
- [ ] Mark all as read
- [ ] Filter by type (approvals, deadlines, etc.)
- [ ] Navigate to related entity
- [ ] Generate AI summary
- [ ] Verify deadline scheduler runs
- [ ] Check real-time updates

### API Testing

```bash
# Get notifications
curl -X GET http://localhost:3000/api/notifications \
  -H "Cookie: ots_session=YOUR_TOKEN"

# Mark as read
curl -X PATCH http://localhost:3000/api/notifications/NOTIFICATION_ID/read \
  -H "Cookie: ots_session=YOUR_TOKEN"

# Get AI summary
curl -X GET http://localhost:3000/api/notifications/summary \
  -H "Cookie: ots_session=YOUR_TOKEN"
```

---

## Configuration

### Environment Variables

```env
# Required for AI summary
OPENAI_API_KEY=your_openai_api_key

# JWT configuration (already configured)
JWT_SECRET=your_jwt_secret
COOKIE_NAME=ots_session
```

---

## Performance Considerations

### Database Indexes
The following indexes are created for optimal performance:
- `userId` - Fast user lookup
- `type` - Filter by notification type
- `isRead` - Filter unread notifications
- `isArchived` - Exclude archived
- `createdAt` - Sort by date
- `deadlineAt` - Deadline queries

### Caching Strategy
- Frontend polls every 30 seconds for unread count
- Consider implementing WebSocket for real-time updates (future enhancement)

### Cleanup
Implement periodic cleanup of old archived notifications:
```sql
DELETE FROM notifications 
WHERE isArchived = true 
AND archivedAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

---

## Future Enhancements

1. **Real-time Updates**
   - WebSocket integration for instant notifications
   - Server-Sent Events (SSE) alternative

2. **Email/SMS Notifications**
   - Integration with email service (SendGrid, AWS SES)
   - SMS notifications for critical alerts

3. **Notification Preferences**
   - User settings for notification types
   - Quiet hours configuration
   - Digest mode (daily/weekly summaries)

4. **Advanced Filtering**
   - Date range filters
   - Search functionality
   - Custom notification rules

5. **Mobile Push Notifications**
   - PWA push notifications
   - Mobile app integration

---

## Troubleshooting

### Notifications Not Appearing
1. Check database connection
2. Verify Prisma client is generated
3. Check user authentication
4. Review server logs for errors

### Deadline Scheduler Not Running
1. Verify cron service is started
2. Check server timezone settings
3. Review scheduler logs

### AI Summary Errors
1. Verify OPENAI_API_KEY is set
2. Check API quota/limits
3. Review API error messages

---

## Support

For issues or questions:
- Review server logs
- Check Prisma schema sync
- Verify API routes are accessible
- Test with Postman/curl

---

## Changelog

### v1.0 (December 8, 2024)
- Initial release
- Core notification system
- Deadline scheduler
- AI-powered summaries
- Frontend components
- Full API implementation
