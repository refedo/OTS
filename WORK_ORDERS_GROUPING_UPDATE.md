# Work Orders Grouping Update

## Changes Made

### Issue
Groups were initially based on `assemblyMark` field, but should be based on the `Name` column from the assembly parts list (as shown in the uploaded image).

### Solution
Updated the grouping logic to use the **Name** field instead of assemblyMark.

## Files Modified

### 1. API Endpoint
**File**: `src/app/api/work-orders/parts-grouped/route.ts`

**Changes**:
- Changed grouping from `part.assemblyMark` to `part.name`
- Updated ordering from `assemblyMark: 'asc'` to `name: 'asc'`
- Updated comments to reflect Name-based grouping

**Result**: Groups now show as "GABLE ANGLE", "BEAM", "COLUMN", etc. (from Name field)

### 2. Wizard UI
**File**: `src/app/production/work-orders/new/page.tsx`

**Changes**:
- Updated Step 3 part display to show: `{assemblyMark} - {partMark}`
- Shows part designation instead of name in the details
- Example display: "GA1 - GA1-1" with "270-GA1-GA1-1 • Qty: 2 • 0.45 tons"

**Result**: Parts are now properly identified by their marks, not by the group name

### 3. Documentation
**File**: `docs/features/WORK_ORDERS_MODULE.md`

**Changes**:
- Updated all references to grouping methodology
- Changed examples from "Columns, Rafters" to "GABLE ANGLE, BEAM, COLUMN"
- Updated workflow example to use GABLE ANGLE instead of Columns
- Clarified that groups are based on the "Name" column from assembly parts list

## How It Works Now

### Step 2: Group Selection
- Groups are created by unique values in the **Name** field
- Examples from your data:
  - "GABLE ANGLE" (multiple parts with this name)
  - "BEAM" (multiple parts with this name)
  - etc.

### Step 3: Part Selection
Within each group, parts are displayed as:
- **Primary**: Assembly Mark - Part Mark (e.g., "GA1 - GA1-1")
- **Secondary**: Part Designation, Quantity, Weight (e.g., "270-GA1-GA1-1 • Qty: 2 • 0.45 tons")

## Example Flow

1. **Select Building**: BLD1
2. **View Groups** (Step 2):
   ```
   ┌─────────────────────┐
   │   GABLE ANGLE       │
   │   10 parts • 5 tons │
   └─────────────────────┘
   
   ┌─────────────────────┐
   │   BEAM              │
   │   15 parts • 8 tons │
   └─────────────────────┘
   ```

3. **Select Group**: GABLE ANGLE
4. **View Parts** (Step 3):
   ```
   GABLE ANGLE
   ├─ GA1 - GA1-1
   │  270-GA1-GA1-1 • Qty: 2 • 0.45 tons
   ├─ GA1 - GA1-2
   │  270-GA1-GA1-2 • Qty: 2 • 0.45 tons
   └─ GA2 - GA2-1
      270-GA2-GA2-1 • Qty: 1 • 0.30 tons
   ```

5. **Create Work Order**:
   - Name: "BLD1 - GABLE ANGLE (15.5%)"
   - Contains selected parts

## Benefits

1. **Intuitive Grouping**: Groups match the Name column from assembly parts list
2. **Clear Part Identification**: Parts show their assembly and part marks
3. **Consistent with Data Structure**: Aligns with how parts are organized in the system
4. **Easy Selection**: Users can select all parts of a specific type (e.g., all GABLE ANGLEs)

## Testing

To test the changes:
1. Navigate to Production → Work Orders → Create Work Order
2. Select a project and building
3. In Step 2, verify groups show as "GABLE ANGLE", "BEAM", etc. (not assembly marks)
4. In Step 3, verify parts show as "Assembly Mark - Part Mark" format
5. Create a work order and verify the name includes the group name

## No Migration Required

These changes are UI and logic only - no database schema changes needed.
