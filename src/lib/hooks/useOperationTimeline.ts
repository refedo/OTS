import { OperationTimelineService } from '@/lib/services/operation-timeline.service';

/**
 * Hook for integrating operation timeline events
 * Use these functions in your API routes to automatically capture events
 */

/**
 * Call this when a document submission status changes
 * @param documentType - Type of document (e.g., 'Architectural Drawing', 'Shop Drawing')
 * @param status - New status (e.g., 'Released', 'Submitted for approval')
 * @param projectId - Project ID
 * @param buildingId - Building ID (optional)
 * @param eventDate - Date of the event
 */
export async function captureDocumentEvent(
  documentType: string,
  status: string,
  projectId: string,
  buildingId: string | null,
  eventDate: Date = new Date()
) {
  try {
    await OperationTimelineService.handleDocumentEvent(
      documentType,
      status,
      projectId,
      buildingId,
      eventDate
    );
  } catch (error) {
    console.error('Error capturing document event:', error);
    // Don't throw - we don't want to break the main operation
  }
}

/**
 * Call this when a production log is created
 * @param processType - Type of process (e.g., 'Preparation', 'Welding', 'Dispatch')
 * @param projectId - Project ID
 * @param buildingId - Building ID (optional)
 * @param eventDate - Date of the event
 */
export async function captureProductionEvent(
  processType: string,
  projectId: string,
  buildingId: string | null,
  eventDate: Date = new Date()
) {
  try {
    await OperationTimelineService.handleProductionEvent(
      processType,
      projectId,
      buildingId,
      eventDate
    );
  } catch (error) {
    console.error('Error capturing production event:', error);
  }
}

/**
 * Call this when a purchase order is created (procurement start)
 * @param projectId - Project ID
 * @param eventDate - Date of the event
 */
export async function captureProcurementEvent(
  projectId: string,
  eventDate: Date = new Date()
) {
  try {
    await OperationTimelineService.handleProcurementEvent(projectId, eventDate);
  } catch (error) {
    console.error('Error capturing procurement event:', error);
  }
}

/**
 * Call this when erection is marked as completed
 * @param projectId - Project ID
 * @param buildingId - Building ID (optional)
 * @param eventDate - Date of the event
 */
export async function captureErectionCompleted(
  projectId: string,
  buildingId: string | null,
  eventDate: Date = new Date()
) {
  try {
    await OperationTimelineService.markErectionCompleted(projectId, buildingId, eventDate);
  } catch (error) {
    console.error('Error capturing erection completion:', error);
  }
}
