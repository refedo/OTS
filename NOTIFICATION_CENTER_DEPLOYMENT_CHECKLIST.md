# Notification Center - Deployment Checklist

Use this checklist to ensure a smooth deployment of the Notification Center module.

---

## Pre-Deployment

### 1. Dependencies
- [ ] Run `npm install` to install new packages
- [ ] Verify `@radix-ui/react-scroll-area` is installed
- [ ] Check that all existing dependencies are up to date

### 2. Database
- [ ] Backup production database
- [ ] Review migration file for `add_notification_center`
- [ ] Test migration on development database first
- [ ] Verify no conflicts with existing schema

### 3. Environment Variables
- [ ] Add `OPENAI_API_KEY` to `.env` (optional, for AI summaries)
- [ ] Verify `JWT_SECRET` is set
- [ ] Verify `COOKIE_NAME` is set
- [ ] Verify `DATABASE_URL` is correct

### 4. Code Review
- [ ] Review all new files for security issues
- [ ] Check authentication implementation
- [ ] Verify no hardcoded credentials
- [ ] Review error handling

---

## Deployment Steps

### Step 1: Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Run migration (development first!)
npx prisma migrate dev --name add_notification_center

# For production
npx prisma migrate deploy
```

**Verify:**
- [ ] `notifications` table created
- [ ] `NotificationType` enum created
- [ ] All indexes created
- [ ] Foreign key to `users` table exists

### Step 2: Build Application
```bash
# Build for production
npm run build
```

**Verify:**
- [ ] Build completes without errors
- [ ] No TypeScript errors (after Prisma generate)
- [ ] All components compile correctly

### Step 3: Deploy Backend
- [ ] Deploy API routes to server
- [ ] Verify API endpoints are accessible
- [ ] Test authentication on production

### Step 4: Deploy Frontend
- [ ] Deploy updated frontend
- [ ] Verify NotificationBell component renders
- [ ] Test notification panel opens correctly

### Step 5: Configure Scheduler
Choose one option:

**Option A: External Cron Service**
- [ ] Set up cron job to call `/api/cron/deadline-check`
- [ ] Configure to run daily at 8:00 AM
- [ ] Test cron job execution

**Option B: Server-side Scheduler**
- [ ] Add scheduler start to server initialization
- [ ] Verify scheduler starts on server boot
- [ ] Check scheduler logs

---

## Post-Deployment Testing

### Basic Functionality
- [ ] Create test notification via API
- [ ] Verify notification appears in bell
- [ ] Click bell to open panel
- [ ] Mark notification as read
- [ ] Archive notification
- [ ] Visit `/notifications` page

### API Endpoints
- [ ] `GET /api/notifications` returns data
- [ ] `PATCH /api/notifications/:id/read` works
- [ ] `PATCH /api/notifications/:id/archive` works
- [ ] `POST /api/notifications/bulk-read` works
- [ ] `GET /api/notifications/summary` works (if OpenAI configured)

### User Experience
- [ ] Notification bell shows correct count
- [ ] Badge updates when notifications are read
- [ ] Tabs filter correctly
- [ ] Clicking notification navigates to entity
- [ ] Time-ago formatting displays correctly
- [ ] Deadline badges show correctly

### Performance
- [ ] Page load time acceptable
- [ ] API response time < 500ms
- [ ] No memory leaks in frontend
- [ ] Database queries optimized

### Security
- [ ] Users can only see their own notifications
- [ ] Authentication required for all endpoints
- [ ] No SQL injection vulnerabilities
- [ ] XSS protection in place

---

## Integration Testing

### Test with Existing Modules
- [ ] Create task and verify notification sent
- [ ] Assign RFI and verify notification sent
- [ ] Create NCR and verify notification sent
- [ ] Approve document and verify notification sent
- [ ] Test deadline warnings trigger correctly

### Multi-User Testing
- [ ] User A assigns task to User B
- [ ] User B receives notification
- [ ] User B marks as read
- [ ] User A doesn't see User B's notifications

---

## Monitoring Setup

### Logging
- [ ] Enable notification creation logs
- [ ] Log API errors
- [ ] Log scheduler execution
- [ ] Log AI summary requests

### Metrics
- [ ] Track notification creation rate
- [ ] Monitor API response times
- [ ] Track unread notification counts
- [ ] Monitor database query performance

### Alerts
- [ ] Alert on API errors
- [ ] Alert on scheduler failures
- [ ] Alert on database connection issues
- [ ] Alert on high notification volume

---

## Rollback Plan

If issues occur:

### Immediate Rollback
1. [ ] Revert frontend deployment
2. [ ] Disable API routes (if needed)
3. [ ] Stop deadline scheduler

### Database Rollback
```bash
# Rollback migration (if needed)
npx prisma migrate reset
```

**Note:** This will delete all notifications. Only use if critical.

### Partial Rollback
- [ ] Keep database changes
- [ ] Disable frontend components
- [ ] Keep API routes but don't call them

---

## User Communication

### Before Deployment
- [ ] Notify users of new feature
- [ ] Provide quick start guide
- [ ] Schedule training session (optional)

### After Deployment
- [ ] Send announcement email
- [ ] Share documentation link
- [ ] Provide support contact

### Training Materials
- [ ] How to use notification bell
- [ ] How to filter notifications
- [ ] How to navigate to related items
- [ ] How to use AI summary

---

## Documentation Checklist

### Available Documentation
- [ ] `NOTIFICATION_CENTER_QUICK_START.md` - Quick start guide
- [ ] `docs/NOTIFICATION_CENTER_MODULE.md` - Complete documentation
- [ ] `docs/NOTIFICATION_INTEGRATION_EXAMPLES.md` - Integration examples
- [ ] `NOTIFICATION_CENTER_IMPLEMENTATION_SUMMARY.md` - Implementation summary
- [ ] `NOTIFICATION_CENTER_DEPLOYMENT_CHECKLIST.md` - This checklist

### Share with Team
- [ ] Developers have access to integration examples
- [ ] QA team has test scenarios
- [ ] End users have quick start guide
- [ ] Support team has troubleshooting guide

---

## Performance Optimization

### Database
- [ ] Verify indexes are used in queries
- [ ] Monitor query execution times
- [ ] Consider archiving old notifications (> 90 days)

### Frontend
- [ ] Enable production build optimizations
- [ ] Minimize bundle size
- [ ] Lazy load notification panel
- [ ] Optimize polling interval

### Backend
- [ ] Enable API response caching (if applicable)
- [ ] Optimize notification queries
- [ ] Batch notification creation when possible

---

## Maintenance Tasks

### Daily
- [ ] Monitor error logs
- [ ] Check scheduler execution

### Weekly
- [ ] Review notification volume
- [ ] Check API performance metrics
- [ ] Review user feedback

### Monthly
- [ ] Clean up archived notifications (> 90 days)
- [ ] Review and optimize queries
- [ ] Update documentation if needed

### Quarterly
- [ ] Review AI summary costs
- [ ] Analyze notification patterns
- [ ] Plan feature enhancements

---

## Success Criteria

The deployment is successful when:

- ✅ All users can see notification bell
- ✅ Notifications are created correctly
- ✅ Users can read and archive notifications
- ✅ Deadline warnings trigger automatically
- ✅ AI summaries work (if configured)
- ✅ No critical errors in logs
- ✅ Performance is acceptable
- ✅ Users can navigate to related entities
- ✅ Security requirements are met

---

## Troubleshooting

### Common Issues

**Issue: Notifications not appearing**
- Check database connection
- Verify Prisma client is generated
- Check user authentication
- Review API logs

**Issue: Bell badge not updating**
- Check polling interval (30s)
- Verify API endpoint returns correct count
- Check browser console for errors

**Issue: Deadline scheduler not running**
- Verify scheduler is started
- Check cron expression
- Review scheduler logs
- Test manual execution

**Issue: AI summary fails**
- Verify OPENAI_API_KEY is set
- Check API quota
- Review error messages
- Test with smaller notification set

---

## Sign-off

### Deployment Team
- [ ] Developer: _____________________ Date: _______
- [ ] QA Lead: _______________________ Date: _______
- [ ] DevOps: ________________________ Date: _______
- [ ] Product Owner: _________________ Date: _______

### Post-Deployment Review
- [ ] All tests passed
- [ ] No critical issues
- [ ] Performance acceptable
- [ ] Users notified
- [ ] Documentation complete

---

## Next Steps After Deployment

1. Monitor for 24-48 hours
2. Collect user feedback
3. Address any issues promptly
4. Plan integration with remaining modules
5. Consider future enhancements

---

**Deployment Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Deployed By:** _____________________  
**Deployment Date:** _____________________  
**Production URL:** _____________________

---

Good luck with your deployment! 🚀
