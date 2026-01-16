# Quality Control Module

**Version:** 1.0.0  
**Status:** Production Ready ✅  
**Last Updated:** October 16, 2025

## Overview

The Quality Control (QC) Module manages inspection requests and quality approval workflows for production items.

## Key Features

### 1. RFI Creation

**Smart Grouping**
- Automatically groups items by project + process type
- Example: 10 items → 3 RFIs (grouped logically)
- Reduces inspector workload

**Automatic Numbering**
- Format: `RFI-YYMM-NNNN`
- Example: `RFI-2510-0023` (October 2025)
- Sequential per month
- YY = Last 2 digits of year
- MM = Month (01-12)

**Process Mapping**
```
Fit-up          → Dimension Check
Welding         → NDT (Non-Destructive Testing)
Visualization   → Visual Check
Sandblasting    → Surface Preparation Check
Painting        → Paint Thickness & Quality Check
Galvanization   → Coating Thickness Check
Fabrication     → Dimension Check
Coating         → Coating Thickness Check
```

### 2. RFI List & Management

**Filters Available:**
- **Search:** Text search (parts, projects, types)
- **Project:** Dropdown of all projects
- **Building:** Dropdown of all buildings
- **Status:** Pending/Approved/Rejected
- **Inspection Type:** All inspection categories

**Visual Indicators:**
- 🟡 Yellow badge = Pending
- 🟢 Green badge = Approved
- 🔴 Red badge = Rejected
- 🔄 Orange icon = Rectification

**Display Information:**
- RFI number
- Part designation(s) or item count
- Project and building
- Process type
- Inspection type
- Request date
- Requested by
- Status
- NCR count

### 3. Bulk Operations

**Bulk Approve**
1. Select multiple RFIs (checkboxes)
2. Click "Approve Selected (X)"
3. Add optional comments
4. Confirm approval
5. All items marked as approved

**Bulk Delete**
1. Select multiple RFIs
2. Click "Delete Selected (X)"
3. Confirm deletion (warning shown)
4. RFIs deleted, statuses reset

### 4. Workflows

#### Submit for QC
```
Production Logs → Select Items → Choose Inspector → Submit
                                                      ↓
                                            RFIs Created (Grouped)
                                                      ↓
                                        Status: Pending Inspection
```

#### Perform Inspection
```
RFI List → Select RFI → Update → Approve/Reject → Add Comments
                                                        ↓
                                        Status Synced to Production Logs
```

#### Rectification
```
Rejected Items → Fix Issues → Resubmit → New RFI Created
                                              ↓
                                    "RECTIFICATION:" prefix added
```

## Database Structure

### RFIRequest Table
```
id, rfiNumber, projectId, buildingId
processType, inspectionType
status, qcComments
requestDate, inspectionDate
requestedById, assignedToId
createdAt, updatedAt
```

### RFIProductionLog (Junction)
```
id, rfiRequestId, productionLogId
createdAt
UNIQUE(rfiRequestId, productionLogId)
```

### ProductionLog (Extended)
```
qcStatus: "Not Required" | "Pending Inspection" | "Approved" | "Rejected"
qcRequired: boolean
```

## API Endpoints

### Create RFIs
```
POST /api/qc/rfi
Body: {
  productionLogIds: string[],
  assignedToId: string,
  rectificationRemarks?: string
}
```

### List RFIs
```
GET /api/qc/rfi
Query: projectId, buildingId, status, inspectionType
```

### Update RFI
```
PATCH /api/qc/rfi/[id]
Body: {
  status?: string,
  qcComments?: string,
  inspectionDate?: string,
  assignedToId?: string
}
```

### Delete RFI
```
DELETE /api/qc/rfi/[id]
```

## User Guide

### For Production Managers

**Submit Items for QC:**
1. Go to Production Logs page
2. Filter completed items
3. Select items (checkbox)
4. Click "Submit for QC Inspection"
5. Choose inspector
6. Add remarks if resubmitting
7. Click Submit

**Handle Rejections:**
1. View rejected items
2. Perform rectification
3. Resubmit with remarks
4. New RFI created automatically

### For QC Inspectors

**Perform Inspection:**
1. Go to RFI List page
2. Filter by status = Pending
3. Click Update on RFI
4. Perform physical inspection
5. Set status (Approved/Rejected)
6. Add comments with findings
7. Click Update RFI

**Bulk Approve:**
1. Select multiple pending RFIs
2. Click "Approve Selected"
3. Add optional comments
4. Confirm approval

## Best Practices

### When Creating RFIs
- ✅ Group similar items together
- ✅ Assign to appropriate inspector
- ✅ Add clear remarks for rectifications
- ❌ Don't mix different process types manually

### When Inspecting
- ✅ Add detailed comments
- ✅ Document measurements
- ✅ Note any deviations
- ✅ Set inspection date
- ❌ Don't approve without physical inspection

### When Handling Rejections
- ✅ Understand rejection reason
- ✅ Document fixes performed
- ✅ Add rectification remarks
- ✅ Verify fix before resubmitting

## Troubleshooting

### RFIs Not Showing
**Solution:** Run cleanup script
```bash
cleanup-qc-system.bat
```

### Production Logs Stuck in "Pending"
**Solution:** Check for orphaned statuses
```bash
npx tsx scripts/cleanup-orphaned-qc-status.ts
```

### Cannot Delete RFI
**Solution:** Check for linked NCRs, delete NCRs first

## Performance

- RFI Creation: < 1 second
- List Loading: < 2 seconds (100 items)
- Bulk Approve: < 3 seconds (10 items)
- Search/Filter: Real-time

## Future Enhancements

- 📋 Email notifications
- 📋 File attachments (photos, reports)
- 📋 Custom inspection checklists
- 📋 Mobile app for field inspection
- 📋 QR code scanning
- 📋 Offline capability

---

**Related Documentation:**
- [API Reference](../technical/API_REFERENCE.md)
- [Database Schema](../technical/DATABASE_SCHEMA.md)
- [User Guides](../user-guides/)
