# Operations Timeline Integration Example

## Example: Integrating with Document Submissions API

Here's how to integrate the Operations Timeline automatic event capture with the existing Document Submissions module.

### Step 1: Import the Hook

In your document submission API route (`src/app/api/document-submissions/[id]/route.ts`), add the import:

```typescript
import { captureDocumentEvent } from '@/lib/hooks/useOperationTimeline';
```

### Step 2: Add Event Capture on Status Update

When updating a document submission status, add the event capture:

```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ... existing code to update document submission ...
    
    const updatedSubmission = await prisma.documentSubmission.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        // ... other fields
      },
    });

    // 🔥 ADD THIS: Capture the event for operations timeline
    await captureDocumentEvent(
      updatedSubmission.documentType,
      updatedSubmission.status,
      updatedSubmission.projectId,
      updatedSubmission.buildingId,
      updatedSubmission.submissionDate
    );

    return NextResponse.json(updatedSubmission);
  } catch (error) {
    // ... error handling
  }
}
```

### Step 3: Document Type Mapping

The system automatically maps document types and statuses to operation stages:

| Document Type | Status | Operation Stage |
|--------------|--------|-----------------|
| Architectural Drawing | Client Approved | ARCH_APPROVED |
| Structural Design Package | Submitted for approval | DESIGN_SUBMITTED |
| Structural Design Package | Released | DESIGN_APPROVED |
| Shop Drawing | Submitted for approval | SHOP_SUBMITTED |
| Shop Drawing | Released | SHOP_APPROVED |

### Step 4: Production Log Integration

For production logs (`src/app/api/production/logs/route.ts`):

```typescript
import { captureProductionEvent } from '@/lib/hooks/useOperationTimeline';

export async function POST(req: NextRequest) {
  try {
    // ... create production log ...
    
    const productionLog = await prisma.productionLog.create({
      data: {
        // ... production log data
      },
      include: {
        assemblyPart: {
          include: {
            project: true,
            building: true,
          },
        },
      },
    });

    // 🔥 ADD THIS: Capture the event
    await captureProductionEvent(
      productionLog.processType,
      productionLog.assemblyPart.project.id,
      productionLog.assemblyPart.buildingId,
      productionLog.dateProcessed
    );

    return NextResponse.json(productionLog, { status: 201 });
  } catch (error) {
    // ... error handling
  }
}
```

### Process Type Mapping

| Process Type | Operation Stage |
|-------------|-----------------|
| Preparation, Fit-up, Welding | PRODUCTION_START |
| Painting, Galvanization | COATING_OR_GALVANIZED |
| Dispatch | DISPATCHING |
| Erection | ERECTION_START |

## Testing the Integration

### 1. Create a Test Document Submission

```bash
POST /api/document-submissions
{
  "projectId": "your-project-id",
  "documentType": "Architectural Drawing",
  "status": "Client Approved",
  "submissionDate": "2025-01-15T00:00:00Z"
}
```

### 2. Check the Timeline

```bash
GET /api/operations/{projectId}/timeline
```

You should see an event with:
- `stage: "ARCH_APPROVED"`
- `eventSource: "document_control"`
- `status: "Completed"`

### 3. View in UI

Navigate to `/projects/{projectId}/timeline` to see the visual timeline.

## Error Handling

The event capture functions are designed to fail silently - they won't break your main operations if something goes wrong. Errors are logged to the console for debugging.

```typescript
try {
  await captureDocumentEvent(...);
} catch (error) {
  console.error('Error capturing document event:', error);
  // Main operation continues regardless
}
```

## Deduplication

The system automatically prevents duplicate events. If an event for the same stage already exists for a project/building, it won't create a duplicate.

## Manual Event Addition

Users with Admin or Project Manager roles can manually add events through the UI:

1. Go to `/projects/{projectId}/timeline`
2. Click "Add Event" button
3. Fill in the form with stage, date, and status
4. Submit

This is useful for:
- Correcting missed automatic captures
- Adding historical data
- Recording events from external systems

## Monitoring and Alerts

The system includes SLA monitoring that can be run as a cron job:

```typescript
import { OperationTimelineService } from '@/lib/services/operation-timeline.service';

// Check for missing stages (run daily)
const missingStages = await OperationTimelineService.checkMissingStages(projectId);

if (missingStages.length > 0) {
  // Send notification to project manager
  for (const stage of missingStages) {
    console.log(`Alert: ${stage.stageName} not started ${stage.daysSinceCompletion} days after ${stage.previousStage}`);
  }
}
```

## Next Steps

1. **Add Integration to Document Submissions**: Update the PATCH route
2. **Add Integration to Production Logs**: Update the POST route
3. **Test with Real Data**: Create test submissions and verify timeline
4. **Set Up Monitoring**: Create a cron job for SLA checks
5. **Train Users**: Show project managers how to use the timeline

## Support

For questions or issues, refer to `OPERATIONS_TIMELINE_MODULE.md` for complete documentation.
