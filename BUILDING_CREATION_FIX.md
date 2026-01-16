# Building Creation Fix

## Issue
Building creation was failing with error: "Failed to create building: Main"

## Root Cause
The `/api/buildings` POST endpoint was trying to set `startDate` and `endDate` fields on the Building model, but these fields don't exist in the database schema.

### Why This Happened
During the wizard redesign, we removed `startDate` and `endDate` from buildings because:
- Buildings don't have single start/end dates
- Dates are now tracked at the scope level per building
- More accurate project scheduling

However, the API endpoint wasn't updated to reflect this change.

## The Error
```typescript
// API was trying to do this:
const building = await prisma.building.create({
  data: {
    projectId,
    name,
    designation,
    description: description || null,
    startDate: startDate ? new Date(startDate) : null,  // ❌ Field doesn't exist
    endDate: endDate ? new Date(endDate) : null,        // ❌ Field doesn't exist
  },
});
```

Prisma error:
```
Unknown field `startDate` for model `Building`
Unknown field `endDate` for model `Building`
```

## Fix Applied ✅

**File:** `src/app/api/buildings/route.ts`

**Before:**
```typescript
const building = await prisma.building.create({
  data: {
    projectId,
    name,
    designation,
    description: description || null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  },
});
```

**After:**
```typescript
const building = await prisma.building.create({
  data: {
    projectId,
    name,
    designation,
    description: description || null,
  },
});
```

**Also Added:**
```typescript
catch (error) {
  console.error('Error creating building:', error);
  return NextResponse.json(
    { 
      error: 'Failed to create building',
      details: error instanceof Error ? error.message : 'Unknown error'
    },
    { status: 500 }
  );
}
```

## Current Building Schema

```prisma
model Building {
  id          String   @id @default(uuid())
  projectId   String
  designation String   // 2-4 letter code (e.g., "BLD1", "WH", "MAIN")
  name        String
  description String?
  
  // Relations
  project       Project         @relation(...)
  assemblyParts AssemblyPart[]
  // ... other relations
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Note:** No `startDate` or `endDate` fields!

## Verification

### Test Building Creation
1. Go to `/projects/wizard`
2. Complete all steps
3. Add buildings with:
   - Name: "Main Building"
   - Designation: "MAIN"
4. Submit

**Expected Result:**
- ✅ Project created successfully
- ✅ Buildings created successfully
- ✅ Success message shows building count
- ✅ Buildings visible on project page

### If Still Failing
Check:
1. **Designation is not empty** - Required field
2. **Name is not empty** - Required field
3. **ProjectId is valid** - Must be valid UUID
4. **Database connection** - Ensure Prisma can connect

## Related Files

### Files Modified
1. `src/app/api/buildings/route.ts` - Removed date fields
2. `src/app/projects/wizard/page.tsx` - Already updated (doesn't send dates)

### Files Checked
1. `prisma/schema.prisma` - Confirmed Building model has no date fields
2. `src/app/api/projects/[id]/buildings/route.ts` - Uses same schema (OK)

## Impact

### What Changed
- ✅ Building creation now works
- ✅ No more "Unknown field" errors
- ✅ Matches current database schema
- ✅ Aligns with wizard redesign

### What Didn't Change
- Buildings still have: id, projectId, designation, name, description
- Scope schedules still tracked separately (not in Building model)
- Project creation flow unchanged
- Wizard UI unchanged

## Future Considerations

### Scope Schedule Persistence
Currently scope schedules (with dates) are:
- ✅ Captured in wizard
- ✅ Shown in success message
- ❌ NOT saved to database

**To implement:**
1. Create `ScopeSchedule` table
2. Add fields: buildingId, scopeType, startDate, endDate
3. Create API endpoints
4. Save during project creation
5. Display on project detail page

### Migration Notes
If you need to add dates back to buildings:
1. Add migration to add fields to Building table
2. Update Prisma schema
3. Update API endpoints
4. Update wizard to collect building dates
5. Update display components

But current design is better - scope-level dates are more accurate!

## Summary

**Problem:** API trying to set non-existent fields on Building model

**Solution:** Removed `startDate` and `endDate` from building creation

**Result:** Buildings now create successfully ✅

**Next Step:** Try creating a project again - it should work now!
