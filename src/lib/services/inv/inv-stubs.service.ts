/**
 * INV Stub Services
 * These functions are stubs for future module integrations.
 * They currently return null (no restriction/action).
 */

/**
 * TODO: validate against BOM module when built
 * Will compare requested qty against the Bill of Materials for the given project.
 * Returns null until BOM module is implemented.
 */
export function checkAgainstBOM(
  _projectId: string,
  _itemId: string,
  _qty: number
): null {
  return null;
}

/**
 * TODO: create cost allocation entry in Financial module
 * Called after MIR-OUT status transitions to ISSUED.
 * Will allocate material cost to the associated project cost center.
 * Returns null until Financial cost allocation module is implemented.
 */
export function postCostAllocationToFinance(_mirOutId: string): null {
  return null;
}
