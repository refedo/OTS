/**
 * Get division based on scope type
 * - Design and Detailing belong to Engineering division
 * - Procurement, Fabrication, Coating, QC, Dispatching belong to Operations Division
 * - Erection belongs to Site Division
 */
export function getDivisionFromScopeType(scopeType: string): string {
  const engineeringScopes = ['design', 'shopDrawing'];
  const operationsScopes = ['procurement', 'fabrication', 'galvanization', 'painting', 'roofSheeting', 'wallSheeting', 'delivery'];
  const siteScopes = ['erection'];

  if (engineeringScopes.includes(scopeType)) {
    return 'Engineering';
  } else if (operationsScopes.includes(scopeType)) {
    return 'Operations';
  } else if (siteScopes.includes(scopeType)) {
    return 'Site';
  }
  
  // Default to Operations for any unknown scope types
  return 'Operations';
}
