# Work Orders - Fabrication Schedule Fix

## Issue
Work order was showing incorrect fabrication schedule dates for the selected building.

**Example**:
- Selected: PJ275 Intake building
- Expected dates: Nov 15, 2025 - Dec 8, 2025 (from Project Planning)
- Actual dates shown: Jan 1, 2025 - Apr 30, 2025 (wrong building's schedule)

## Root Cause

### Problem 1: API Not Filtering by Building
The `/api/scope-schedules/all` endpoint was returning ALL schedules from ALL buildings, not filtering by the requested `buildingId` parameter.

```typescript
// Before - Ignored query parameters
export async function GET() {
  const scopeSchedules = await prisma.scopeSchedule.findMany({
    // No where clause - returns everything!
  });
}
```

### Problem 2: Frontend Filtering After Fetch
The frontend was fetching all schedules and then trying to filter them client-side:
```typescript
const data = await response.json();
const fabrication = data.find((s: any) => s.scopeType === 'fabrication');
// This would find the FIRST fabrication schedule, not necessarily the right building!
```

## Solution

### Fix 1: API Now Filters by Building
Updated `/api/scope-schedules/all/route.ts` to accept and use query parameters:

```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const buildingId = searchParams.get('buildingId');
  const scopeType = searchParams.get('scopeType');
  
  const whereClause: any = {};
  if (buildingId) whereClause.buildingId = buildingId;
  if (scopeType) whereClause.scopeType = scopeType;
  
  const scopeSchedules = await prisma.scopeSchedule.findMany({
    where: whereClause, // Now filters correctly!
  });
}
```

### Fix 2: Frontend Requests Specific Data
Updated the fetch call to include both filters:

```typescript
const response = await fetch(
  `/api/scope-schedules/all?buildingId=${buildingId}&scopeType=fabrication`
);
```

Now the API returns ONLY the fabrication schedule for the specific building.

### Fix 3: Added Logging for Debugging
Added console logs to verify correct data:

```typescript
console.log('Fabrication schedules for building:', buildingId, data);
console.log('Set dates:', { start, end, building: fabrication.building });
```

## Files Modified

1. **`src/app/api/scope-schedules/all/route.ts`**
   - Added query parameter parsing
   - Added where clause filtering
   - Now supports: `buildingId`, `projectId`, `scopeType`

2. **`src/app/production/work-orders/new/page.tsx`**
   - Updated API call to include `scopeType=fabrication`
   - Added console logging for debugging
   - Improved error handling when no schedule found

## Testing

### Before Fix
1. Select Project 275
2. Select Intake building
3. See wrong dates (Jan 1 - Apr 30)

### After Fix
1. Select Project 275
2. Select Intake building
3. See correct dates (Nov 15 - Dec 8)

### Verification Steps
1. Open browser console (F12)
2. Create new work order
3. Select a building
4. Check console logs:
   ```
   Fabrication schedules for building: <buildingId> [...]
   Set dates: { start: '2025-11-15', end: '2025-12-08', building: {...} }
   ```
5. Verify the building object matches your selection
6. Verify dates match Project Planning

## Additional Benefits

The API now supports multiple filters:

### Filter by Building Only
```
GET /api/scope-schedules/all?buildingId=<id>
```
Returns all schedules for that building (design, fabrication, painting, etc.)

### Filter by Scope Type Only
```
GET /api/scope-schedules/all?scopeType=fabrication
```
Returns all fabrication schedules across all buildings

### Filter by Both
```
GET /api/scope-schedules/all?buildingId=<id>&scopeType=fabrication
```
Returns only the fabrication schedule for that specific building (what we need!)

### Filter by Project
```
GET /api/scope-schedules/all?projectId=<id>
```
Returns all schedules for all buildings in that project

## Database Query Efficiency

### Before
```sql
-- Fetched ALL schedules
SELECT * FROM ScopeSchedule;
-- Then filtered in JavaScript
```

### After
```sql
-- Fetches only what's needed
SELECT * FROM ScopeSchedule 
WHERE buildingId = ? AND scopeType = 'fabrication';
```

Much more efficient, especially with many projects and buildings!

## Troubleshooting

### Still Seeing Wrong Dates?

1. **Check Browser Console**
   - Look for the log: "Fabrication schedules for building:"
   - Verify the buildingId matches your selection
   - Verify the returned data has correct dates

2. **Check Database**
   - Verify the building has a fabrication schedule
   - Check the ScopeSchedule table:
     ```sql
     SELECT * FROM ScopeSchedule 
     WHERE buildingId = '<your-building-id>' 
     AND scopeType = 'fabrication';
     ```

3. **Check Building Selection**
   - Make sure you're selecting the correct building
   - Building dropdown should show: "Designation - Name"

4. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear cache and reload

### No Dates Showing?

If the fabrication schedule reference box doesn't appear:

1. **No Schedule Exists**
   - Go to Project Planning
   - Add a fabrication schedule for the building
   - Set start and end dates
   - Save

2. **Schedule Not Saved**
   - Check if schedule was saved successfully
   - Refresh the planning page
   - Verify dates are displayed

3. **API Error**
   - Check browser console for errors
   - Check network tab for failed requests
   - Verify API endpoint is accessible

## Related Issues Fixed

This fix also resolves:
- ✅ Work orders showing dates from wrong buildings
- ✅ Inconsistent dates between planning and work orders
- ✅ Performance issue from fetching all schedules
- ✅ Confusion about which building's schedule is being used

## Future Improvements

- [ ] Add building name to schedule reference box for clarity
- [ ] Show warning if building has no fabrication schedule
- [ ] Allow creating schedule directly from work order page
- [ ] Add validation to ensure dates are within project timeline
- [ ] Cache schedule data to reduce API calls
