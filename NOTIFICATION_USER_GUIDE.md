# Notification Center - User Guide

**Version:** 1.1.0  
**Last Updated:** December 8, 2024

---

## Where to Find Notifications

### 1. Sidebar Navigation (Main Access)
The **Notifications** link is now available in the main sidebar navigation:

```
📊 Dashboard
✓ Tasks
🔔 Notifications  ← Click here to view all notifications
🤖 AI Assistant
```

**Location:** Between "Tasks" and "AI Assistant" in the sidebar

**What you'll see:**
- Click "Notifications" to go to the full notification center page
- View all your notifications in one place
- Filter by type (All, Unread, Approvals, Deadlines, Archived)
- Generate AI summaries of pending items

---

### 2. Notification Bell (Coming Soon - Optional)
For real-time notifications, you can optionally add a notification bell to your header:

**Features:**
- Red badge showing unread count
- Dropdown panel with quick access
- Auto-refreshes every 30 seconds

**To enable:** Add `<NotificationBell />` component to your header/navigation bar

---

## How Notifications Work

### When You'll Receive Notifications

#### 1. Task Assignments
**When:** Someone assigns you a task
**Notification Type:** TASK_ASSIGNED
**Example:** "John Doe assigned you a task: 'Review design drawings' in project ABC Steel Building"

#### 2. Approval Requests
**When:** You need to approve something (RFI, NCR, Document, ITP, WPS)
**Notification Type:** APPROVAL_REQUIRED
**Example:** "Jane Smith submitted RFI-2024-001 for your approval"

#### 3. Deadline Warnings
**When:** A deadline is approaching (< 48 hours)
**Notification Type:** DEADLINE_WARNING
**Example:** "Task 'Complete welding inspection' is due in 24 hours"

**Note:** Deadline warnings are sent automatically by the system daily at 8:00 AM

#### 4. Approval Results
**When:** Your submitted item is approved or rejected
**Notification Types:** APPROVED or REJECTED
**Examples:**
- "QA Manager approved your document 'Quality Manual v2.0'"
- "QC Inspector rejected your NCR-2024-005: Incomplete corrective action"

#### 5. System Notifications
**When:** Important system-wide announcements
**Notification Type:** SYSTEM
**Example:** "System maintenance scheduled for tonight at 10:00 PM"

---

## Using the Notification Center

### Accessing Notifications
1. Click **"Notifications"** in the sidebar
2. You'll see the notification center page at `/notifications`

### Viewing Notifications
The notification center has 5 tabs:

1. **All** - All your notifications
2. **Unread** - Only unread notifications
3. **Approvals** - Only approval requests
4. **Deadlines** - Only deadline warnings
5. **Archived** - Archived notifications

### Reading Notifications
- Click any notification to mark it as read
- Clicking a notification will navigate you to the related item (task, RFI, document, etc.)
- Unread notifications have a blue indicator on the left

### Managing Notifications
- **Mark as Read:** Click the notification
- **Mark All as Read:** Click the "Mark all as read" button at the top
- **Archive:** Click the archive icon (📁) on any notification
- **Filter:** Use the tabs to filter by type

### AI Summary Feature
Click **"Generate Summary"** to get an AI-powered overview of your pending notifications:
- Highlights urgent items
- Groups similar notifications
- Shows deadline urgency
- Provides actionable insights

**Note:** Requires OpenAI API key to be configured

---

## Testing Notifications

### Create a Test Notification
If you're an admin and want to test the system, you can create a test notification:

1. Go to any API route or use Prisma Studio
2. Create a notification manually:

```typescript
import NotificationService from '@/lib/services/notification.service';

await NotificationService.notifySystem({
  userId: 'your-user-id',
  title: 'Test Notification',
  message: 'This is a test notification to verify the system works.',
});
```

3. Refresh the notifications page
4. You should see your test notification

---

## Why You Might Not See Notifications

### Common Issues:

#### 1. No Notifications Created Yet
**Problem:** The system is new, and no events have triggered notifications yet.

**Solution:**
- Create a task and assign it to yourself
- Request an RFI inspection
- Submit a document for approval
- Wait for the deadline scanner to run (8:00 AM daily)

#### 2. Wrong User ID
**Problem:** Notifications are tied to specific users.

**Solution:**
- Make sure you're logged in with the correct account
- Check that tasks/approvals are assigned to YOUR user ID

#### 3. Database Not Migrated
**Problem:** The notifications table doesn't exist.

**Solution:**
- Run `npx prisma generate`
- Run `npx prisma db push`
- Verify the `notifications` table exists in your database

#### 4. Integration Not Complete
**Problem:** Existing modules haven't been updated to send notifications.

**Solution:**
- Follow the integration examples in `docs/NOTIFICATION_INTEGRATION_EXAMPLES.md`
- Update your task creation, RFI assignment, and approval workflows
- Add notification triggers to your API routes

---

## Integration Status

### Currently Integrated:
- ✅ Notification Center UI (sidebar link)
- ✅ Full notification page
- ✅ Database schema
- ✅ API endpoints
- ✅ Notification service
- ✅ Deadline scheduler

### Needs Integration (Your Action Required):
- ⏳ Task assignment notifications
- ⏳ RFI approval notifications
- ⏳ NCR assignment notifications
- ⏳ Document approval notifications
- ⏳ ITP/WPS approval notifications

**To integrate:** See `docs/NOTIFICATION_INTEGRATION_EXAMPLES.md` for code examples

---

## Example: Creating Your First Notification

### Scenario: Task Assignment

When you create a task and assign it to someone, add this code:

```typescript
// In your task creation API (e.g., /api/tasks/route.ts)
import NotificationService from '@/lib/services/notification.service';

// After creating the task
const task = await prisma.task.create({
  data: { /* task data */ },
  include: { 
    createdBy: true, 
    project: { select: { name: true } },
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
  });
}
```

Now when you assign a task, the assignee will see a notification!

---

## Notification Lifecycle

### 1. Creation
- Notification is created when an event occurs
- Stored in the database
- User can see it immediately

### 2. Delivery
- User sees notification in the notification center
- Badge count updates (if bell is enabled)
- Notification appears as "unread"

### 3. Reading
- User clicks notification
- Marked as read automatically
- Badge count decreases
- User is navigated to related item

### 4. Archiving
- User can archive notifications they don't need
- Archived notifications move to "Archived" tab
- Can be viewed later if needed

### 5. Cleanup (Future)
- Old archived notifications can be deleted
- Recommended: Delete notifications older than 90 days

---

## Tips for Users

### Best Practices:
1. **Check daily** - Visit the notification center at the start of your day
2. **Use AI summary** - Get a quick overview of what needs attention
3. **Filter by type** - Use tabs to focus on specific notification types
4. **Archive old items** - Keep your notification center clean
5. **Click to navigate** - Use notifications as shortcuts to related items

### Keyboard Shortcuts (Future):
- `N` - Open notifications
- `A` - Mark all as read
- `Esc` - Close notification panel

---

## For Administrators

### Monitoring Notifications:
1. Check Prisma Studio to view all notifications
2. Monitor notification creation rate
3. Review deadline scanner logs
4. Track user engagement with notifications

### System Maintenance:
1. Run deadline scanner manually if needed
2. Clean up old archived notifications
3. Review and optimize notification triggers
4. Update AI summary prompts as needed

---

## Support

### Need Help?
- **Documentation:** Check `/docs` folder for detailed guides
- **Integration:** See `NOTIFICATION_INTEGRATION_EXAMPLES.md`
- **Troubleshooting:** See `NOTIFICATION_CENTER_QUICK_START.md`

### Report Issues:
- Check server logs for errors
- Verify database connection
- Test API endpoints
- Review Prisma schema sync

---

## Version History

### v1.1.0 (Current)
- Initial release of Notification Center
- Sidebar navigation link added
- Full notification page
- AI summary feature
- Automatic deadline warnings

### Upcoming (v1.2.0)
- Notification bell in header
- Email notifications
- SMS notifications
- User preferences
- WebSocket real-time updates

---

**Happy tracking! 🎉**

For questions or feedback, contact your system administrator.
