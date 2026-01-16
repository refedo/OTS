# Governance Center - Quick Reference Guide

## 🚀 Quick Access

| Feature | URL | Shortcut |
|---------|-----|----------|
| **System Events** | `/events` | View all activities |
| **Governance Center** | `/governance` | Audit & recovery |
| **Audit Trail** | `/governance` → Audit Trail tab | Detailed changes |
| **Deleted Items** | `/governance` → Deleted Items tab | Data recovery |

---

## 📊 System Events Page

### What You'll See

**Table Columns:**
- **Ref** - Event number with icon
- **Owner** - User who performed the action
- **Type** - Category badge (production, auth, record, etc.)
- **Title** - Event description
- **Date** - When it happened (MM/DD/YYYY)
- **Time** - Exact time (HH:MM:SS AM/PM)
- **Project** - Related project number
- **Status** - Event type (created, updated, deleted, etc.)

### Filters Available

1. **Category Filter:**
   - All Categories
   - Files
   - Records
   - Sync
   - Production
   - QC
   - Project
   - Auth

2. **Type Filter:**
   - All Types
   - Created
   - Updated
   - Deleted
   - Uploaded
   - Synced
   - Approved
   - Rejected

### Event Icons

- 🟢 **Created** - New record
- 🔵 **Updated** - Modified record
- 🔴 **Deleted** - Removed record
- 🟣 **Uploaded** - File upload
- 🔄 **Synced** - Data sync
- ✅ **Approved** - Approval action
- ❌ **Rejected** - Rejection action
- 📊 **Imported** - Bulk import

---

## 🔍 Audit Trail

### What Gets Tracked

**Every action logs:**
- Who did it
- What changed
- When it happened
- Why (if provided)
- Before/after values

**Tracked Entities:**
- Projects, Buildings, Assembly Parts
- Production Logs, Tasks, Work Orders
- QC Inspections (WPS, ITP, RFI, NCR)
- Document Submissions, Users

### How to Use

1. Go to `/governance` → **Audit Trail** tab
2. Use filters:
   - Entity Type
   - Action (CREATE, UPDATE, DELETE)
   - User
   - Date Range
3. Click on entry to see details
4. View field-level changes

### Common Queries

**"Who changed this project status?"**
- Filter: Entity Type = Project
- Filter: Action = UPDATE
- Search for project ID

**"What did this user delete today?"**
- Filter: User = [username]
- Filter: Action = DELETE
- Filter: Date = Today

**"Show all production logs created this week"**
- Filter: Entity Type = ProductionLog
- Filter: Action = CREATE
- Filter: Date Range = This Week

---

## 🗑️ Data Recovery (Deleted Items)

### How It Works

When you delete critical items:
1. Item is **soft-deleted** (hidden, not removed)
2. Stored with deletion info (who, when, why)
3. Can be restored anytime
4. Only admins can permanently delete

### Recovering Items

**Step-by-Step:**

1. Navigate to `/governance`
2. Click **Deleted Items** tab
3. Select entity type:
   - Projects
   - Buildings
   - Assembly Parts
4. Find the item you want to restore
5. Click **Restore** button
6. Confirm restoration
7. ✅ Item is back!

### What You'll See

Each deleted item shows:
- Name/Designation
- Deleted by (user)
- Deleted at (date & time)
- Reason for deletion

---

## 📈 Statistics Dashboard

### Overview Tab Shows

**Audit Activity:**
- Total logs
- Today's activity
- Actions breakdown
- Recent timeline

**Version History:**
- Total versions
- Today's versions
- Most versioned items

**Deleted Items:**
- Total soft-deleted
- By entity type
- Pending recovery

---

## 🎯 Common Tasks

### Task 1: Track Project Changes

```
1. Go to /governance
2. Click "Audit Trail" tab
3. Filter: Entity Type = "Project"
4. Enter Project ID or name
5. Review all changes
```

### Task 2: Recover Deleted Building

```
1. Go to /governance
2. Click "Deleted Items" tab
3. Select "Building" from dropdown
4. Find your building
5. Click "Restore"
6. Confirm
```

### Task 3: View Today's Activity

```
1. Go to /events
2. All today's events show by default
3. Use filters to narrow down
4. Click refresh to update
```

### Task 4: Find Who Logged Production

```
1. Go to /events
2. Filter: Category = "Production"
3. Filter: Type = "Created"
4. Review table for user names
```

### Task 5: Export Audit Report

```
1. Go to /governance
2. Click "Audit Trail" tab
3. Apply desired filters
4. Click "Export" button
5. Choose format (CSV/PDF)
```

---

## 🔐 Permissions

### Who Can Do What

**View Events:**
- ✅ All users

**View Audit Trail:**
- ✅ Admins - Full access
- ✅ Managers - Project-related only
- ⚠️ Engineers/Operators - Limited

**Restore Deleted Items:**
- ✅ Admins - All entities
- ✅ Managers - Project-related only
- ❌ Others - No access

**Permanent Delete:**
- ✅ Admins only
- ❌ All others

---

## 💡 Tips & Best Practices

### For Daily Use

1. **Check events daily** - Stay informed of system activity
2. **Use filters** - Find what you need quickly
3. **Provide deletion reasons** - Help others understand why
4. **Review before deleting** - Check deleted items first

### For Managers

1. **Weekly audit review** - Check critical changes
2. **Monitor team activity** - Track user actions
3. **Clean up deleted items** - Review monthly
4. **Export reports** - Keep records for compliance

### For Admins

1. **Regular backups** - Export audit logs monthly
2. **Monitor unusual activity** - Check for anomalies
3. **Manage permissions** - Control who sees what
4. **Permanent cleanup** - Archive old deleted items quarterly

---

## 🐛 Troubleshooting

### Events Not Showing

**Problem:** No events appearing in table

**Solutions:**
1. Check if you're logged in
2. Refresh the page
3. Clear filters
4. Check date range

### Dates Not Displaying

**Problem:** Date/time columns empty

**Solutions:**
1. Hard refresh (Ctrl+F5)
2. Check browser console for errors
3. Verify API response has dates
4. Contact admin if persists

### Cannot Restore Item

**Problem:** Restore button not working

**Solutions:**
1. Verify you have permissions
2. Check if item has dependencies
3. Review error message
4. Contact admin for help

### Slow Loading

**Problem:** Page takes long to load

**Solutions:**
1. Use filters to reduce data
2. Decrease page size
3. Check internet connection
4. Clear browser cache

---

## 📞 Need Help?

### Quick Checks

1. ✅ Read this guide
2. ✅ Check full documentation: `docs/GOVERNANCE_CENTER_GUIDE.md`
3. ✅ Review browser console for errors
4. ✅ Check server logs

### Contact Support

If issues persist:
- Email: support@hexasteel.com
- Slack: #system-support
- Phone: Internal ext. 1234

---

## 🔄 Recent Updates

**Version 2.10.0 - December 28, 2025**

✨ **New Features:**
- Dolibarr-style table view for events
- Proper date and time display
- Enhanced filtering options
- Bulk operation logging
- Mass production logging tracking

🐛 **Bug Fixes:**
- Fixed missing dates in events table
- Fixed bulk upload audit logging
- Fixed mass production logging events
- Improved date formatting

📚 **Documentation:**
- Added comprehensive governance guide
- Created quick reference guide
- Updated API documentation

---

## 📋 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Refresh events | `Ctrl + R` |
| Next page | `→` (arrow right) |
| Previous page | `←` (arrow left) |
| Focus search | `Ctrl + K` |
| Open filters | `F` |

---

## 🎓 Training Resources

### Video Tutorials
- System Events Overview (5 min)
- Audit Trail Deep Dive (10 min)
- Data Recovery Walkthrough (7 min)

### Documentation
- Full Guide: `docs/GOVERNANCE_CENTER_GUIDE.md`
- API Reference: `docs/API_DOCUMENTATION.md`
- User Manual: `docs/USER_MANUAL.md`

---

**Last Updated:** December 28, 2025  
**Version:** 2.10.0  
**Need more help?** See full guide at `docs/GOVERNANCE_CENTER_GUIDE.md`
