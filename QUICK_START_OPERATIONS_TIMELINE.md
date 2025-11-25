# Operations Timeline - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Database Setup (1 min)
```bash
# Push schema changes to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed operation stages
node scripts/seed-operation-stages.js
```

### Step 2: Verify Installation (1 min)
Check that these files exist:
- ✅ `prisma/schema.prisma` (contains OperationEvent, OperationStageConfig, OperationEventAudit)
- ✅ `src/app/api/operations/` (API routes)
- ✅ `src/components/operations/` (UI components)
- ✅ `src/lib/services/operation-timeline.service.ts` (Service layer)

### Step 3: Test the Timeline (2 min)
1. Start your dev server: `npm run dev`
2. Navigate to any project: `/projects/{project-id}`
3. Click the "Timeline" button in the header
4. You should see an empty timeline with 11 stages

### Step 4: Add a Test Event (1 min)
1. On the timeline page, click "Add Event"
2. Select stage: "ARCH_APPROVED"
3. Select date: Today
4. Status: "Completed"
5. Click "Add Event"
6. ✅ You should see a green circle on the timeline!

## 📱 Quick Access URLs

- **Project Timeline:** `/projects/{project-id}/timeline`
- **Operations Dashboard:** `/operations/dashboard`

## 🔗 Integration (5 minutes per module)

### Document Submissions
Add to `src/app/api/document-submissions/[id]/route.ts`:

```typescript
import { captureDocumentEvent } from '@/lib/hooks/useOperationTimeline';

// After updating document
await captureDocumentEvent(
  submission.documentType,
  submission.status,
  submission.projectId,
  submission.buildingId,
  new Date()
);
```

### Production Logs
Add to `src/app/api/production/logs/route.ts`:

```typescript
import { captureProductionEvent } from '@/lib/hooks/useOperationTimeline';

// After creating production log
await captureProductionEvent(
  log.processType,
  projectId,
  buildingId,
  log.dateProcessed
);
```

## 🎨 Visual Guide

### Timeline Colors
- 🟢 **Green** = Completed
- 🟡 **Yellow** = Pending/In Progress
- 🔴 **Red** = Delayed/Failed
- ⚪ **Gray** = Not Started

### Stage Sequence
1. Architectural Approved
2. Design Submitted
3. Design Approved
4. Shop Submitted
5. Shop Approved
6. Procurement Start
7. Production Start
8. Coating/Galvanized
9. Dispatching
10. Erection Start
11. Erection Completed

## 🔐 Permissions

| Role | View Timeline | Add Event | Edit Event | Delete Event |
|------|--------------|-----------|------------|--------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Project Manager | ✅ | ✅ | ✅ | ❌ |
| Engineer | ✅ | ❌ | ❌ | ❌ |

## 📊 Dashboard Features

Access at `/operations/dashboard`:
- Total projects and events
- Completion rates per stage
- Event status distribution
- Average durations between stages
- Project progress overview
- Delayed projects alerts

## 🐛 Quick Troubleshooting

### Timeline is empty
- Check if project has any events in database
- Try adding a manual event to test
- Check browser console for errors

### Events not auto-capturing
- Verify integration hooks are added to API routes
- Check console logs for errors
- Ensure document types/statuses match expected values

### Can't add events
- Check user role (must be Admin or Project Manager)
- Verify stage code exists in database
- Check for duplicate events (system prevents duplicates)

## 📚 Full Documentation

- **Complete Guide:** `OPERATIONS_TIMELINE_MODULE.md`
- **Integration Examples:** `INTEGRATION_EXAMPLE.md`
- **Implementation Summary:** `OPERATIONS_TIMELINE_SUMMARY.md`

## ✅ Quick Checklist

- [ ] Database migrated and seeded
- [ ] Timeline page accessible
- [ ] Can add manual events
- [ ] Dashboard shows data
- [ ] Document integration added
- [ ] Production integration added
- [ ] Tested with real project

## 🎯 What's Next?

1. **Integrate with existing modules** (Document Control, Production)
2. **Test with real project data**
3. **Train project managers** on timeline features
4. **Set up SLA monitoring** (optional cron job)
5. **Monitor analytics dashboard** for insights

## 💡 Pro Tips

- Use building filter to track individual buildings
- Switch between horizontal and vertical views
- Click on stage circles to see event details
- Check dashboard weekly for delayed projects
- Export timeline data via API for reports

---

**Need Help?** Check the full documentation or contact the development team.
