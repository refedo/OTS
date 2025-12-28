# Governance Center - Enterprise Audit Trail & Data Recovery Guide

## Overview

The Governance Center provides comprehensive audit trail, version history, and data recovery capabilities similar to Dolibarr ERP. It tracks all system activities, maintains detailed change logs, and enables recovery of deleted items.

## Accessing the Governance Center

Navigate to: **http://localhost:3001/governance**

The Governance Center has three main tabs:
1. **Overview** - Statistics and summary
2. **Audit Trail** - Detailed change logs
3. **Deleted Items** - Soft-deleted records for recovery

---

## 1. Audit Trail System

### What Gets Logged

The system automatically logs all CRUD operations on critical entities:

**Tracked Entities:**
- Projects
- Buildings
- Assembly Parts
- Production Logs
- Tasks
- Work Orders
- QC Inspections (WPS, ITP, RFI, NCR)
- Document Submissions
- Users

**Logged Actions:**
- `CREATE` - New record created
- `UPDATE` - Record modified
- `DELETE` - Record deleted
- `RESTORE` - Deleted record restored
- `APPROVE` - Record approved
- `REJECT` - Record rejected
- `SYNC` - Data synchronized

### Audit Log Details

Each audit entry captures:
- **Who**: User who performed the action
- **What**: Entity type and ID
- **When**: Exact timestamp
- **Action**: Type of operation
- **Changes**: Field-level before/after values
- **Why**: Optional reason/justification
- **Context**: Request ID, source module, metadata

### Viewing Audit Trail

**Filter Options:**
- Entity Type (Project, Building, etc.)
- Action Type (CREATE, UPDATE, DELETE)
- User
- Date Range
- Specific Entity ID

**Example Use Cases:**
1. Track who modified a project's status
2. See all changes to a specific building
3. Review all deletions by a user
4. Audit production log entries

---

## 2. System Events

### Event Categories

**File Events:**
- Document uploads
- File attachments
- Report generation

**Record Events:**
- Entity creation
- Entity updates
- Entity deletion

**Production Events:**
- Production logs
- Assembly part imports
- Mass production logging

**QC Events:**
- Inspection approvals
- RFI submissions
- NCR reports

**Authentication Events:**
- User login
- User logout
- Session activity

**Sync Events:**
- External system synchronization
- Data imports/exports

### Event Details

Each event includes:
- Event type and category
- Severity level (INFO, WARNING, ERROR, CRITICAL)
- Title and description
- Related entity (if applicable)
- Related project (if applicable)
- User who triggered the event
- Timestamp
- Additional metadata

### Accessing System Events

Navigate to: **http://localhost:3001/events**

**Filter Options:**
- Event Type
- Category
- Entity Type
- Project
- Date Range

---

## 3. Version History

### Automatic Versioning

The system maintains version history for critical documents and entities:

**Versioned Entities:**
- Document Submissions (with revisions)
- Project configurations
- WPS/ITP documents

### Version Details

Each version captures:
- Version number
- Created by
- Created at
- Changes summary
- Full snapshot of data

### Viewing Version History

1. Navigate to the entity (e.g., Document Submission)
2. Click "View History" or "Revisions"
3. Compare versions side-by-side
4. Restore previous version if needed

---

## 4. Data Recovery (Soft Delete)

### How Soft Delete Works

When you delete a critical entity, it's not permanently removed. Instead:
1. Record is marked as deleted (`deletedAt` timestamp set)
2. Deleted by user is recorded (`deletedById`)
3. Deletion reason is captured (`deleteReason`)
4. Record remains in database but hidden from normal views

**Soft-Deleted Entities:**
- Projects
- Buildings
- Assembly Parts

### Recovering Deleted Items

**Step-by-Step Recovery:**

1. Go to Governance Center → **Deleted Items** tab
2. Select entity type (Project, Building, or Assembly Part)
3. Browse deleted items with details:
   - Entity name/designation
   - Deleted by (user)
   - Deleted at (timestamp)
   - Deletion reason
4. Click **Restore** button
5. Confirm restoration
6. Item is restored and visible again

**What Happens on Restore:**
- `deletedAt` is cleared
- `deletedById` is cleared
- `deleteReason` is cleared
- Audit log entry created for RESTORE action
- Item appears in normal views

### Permanent Deletion

Only Admins can permanently delete items:
1. Items must be soft-deleted first
2. Navigate to Deleted Items
3. Select item and click "Permanently Delete"
4. Confirm action (irreversible)
5. Record is removed from database

---

## 5. Governance Statistics

### Overview Dashboard

The Governance Center overview shows:

**Audit Activity:**
- Total audit logs
- Logs today
- Logs by action type (pie chart)
- Recent activity timeline

**Version History:**
- Total versions tracked
- Versions created today
- Most versioned entities

**Deleted Items:**
- Total soft-deleted items
- By entity type
- Pending recovery

**User Activity:**
- Most active users
- Actions per user
- Recent user actions

---

## 6. Best Practices

### For Users

1. **Always provide reasons** when deleting items
2. **Review audit trail** before making critical changes
3. **Check deleted items** before creating duplicates
4. **Use filters** to find specific audit entries quickly

### For Administrators

1. **Regular audit reviews** - Weekly review of critical changes
2. **Monitor deletions** - Review deleted items monthly
3. **Permanent cleanup** - Archive old deleted items quarterly
4. **User activity tracking** - Monitor unusual activity patterns
5. **Backup audit logs** - Export audit trail for compliance

### For Compliance

1. **Retention policy** - Keep audit logs for required period
2. **Access control** - Limit who can view sensitive audit data
3. **Export capabilities** - Generate audit reports for auditors
4. **Tamper-proof** - Audit logs cannot be modified or deleted

---

## 7. API Endpoints

### Audit Trail

```
GET /api/governance/audit
  ?entityType=Project
  &entityId=xxx
  &action=UPDATE
  &userId=xxx
  &limit=20
  &offset=0
```

### System Events

```
GET /api/events
  ?eventType=created
  &category=production
  &projectId=xxx
  &limit=20
  &offset=0
```

### Deleted Items

```
GET /api/governance/deleted
  ?entityType=Project

POST /api/governance/deleted
  Body: { entityType: "Project", entityId: "xxx" }
```

### Statistics

```
GET /api/governance/stats
GET /api/events/stats
```

---

## 8. Troubleshooting

### Events Not Appearing

**Issue:** Actions not showing in audit trail

**Solutions:**
1. Verify user is logged in (audit requires user context)
2. Check if entity type is in AUDITED_ENTITIES list
3. Review server logs for audit service errors
4. Ensure database has AuditLog and SystemEvent tables

### Cannot Restore Deleted Item

**Issue:** Restore button not working

**Solutions:**
1. Verify user has restore permissions
2. Check if item has foreign key constraints
3. Review error message in console
4. Ensure item is actually soft-deleted (not hard-deleted)

### Missing Dates in Events

**Issue:** Dates not displaying in events table

**Solutions:**
1. Check date formatting in frontend
2. Verify `createdAt` field exists in database
3. Review API response for date fields
4. Check browser console for JavaScript errors

---

## 9. Security & Permissions

### Access Control

**View Audit Trail:**
- Admins: Full access
- Managers: Project-related only
- Engineers/Operators: Limited access

**Restore Deleted Items:**
- Admins: All entities
- Managers: Project-related only

**Permanent Delete:**
- Admins only

### Data Privacy

- Sensitive fields excluded from audit logs (passwords, tokens)
- Personal data masked in exports
- Access logs maintained for compliance

---

## 10. Integration with Other Modules

### Project Management
- Track project status changes
- Monitor milestone updates
- Audit team assignments

### Production Control
- Log all production entries
- Track assembly part imports
- Monitor process completions

### Quality Control
- Audit inspection approvals
- Track RFI/NCR lifecycle
- Monitor document submissions

### Operations Control
- Track work order changes
- Monitor schedule updates
- Audit resource allocations

---

## Quick Reference

| Feature | Location | Purpose |
|---------|----------|---------|
| Audit Trail | `/governance` → Audit Trail | View all entity changes |
| System Events | `/events` | View all system activities |
| Deleted Items | `/governance` → Deleted Items | Recover soft-deleted records |
| Statistics | `/governance` → Overview | View governance metrics |
| Version History | Entity detail pages | Compare versions |

---

## Support

For issues or questions:
1. Check this guide first
2. Review server logs: `npm run dev`
3. Check browser console for errors
4. Contact system administrator

---

**Last Updated:** December 28, 2025
**Version:** 2.10.0
