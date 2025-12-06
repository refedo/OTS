# Project Code vs Project Number - Clarification

## What's the Difference?

**Short Answer**: They're the **SAME THING!**

### Terminology

| Term | Meaning | Example |
|------|---------|---------|
| **Project Code** | Internal database field name | `project_code` |
| **Project Number** | User-friendly name | "PRJ-2024-001" |
| **Project #** | Short form | Same as above |

### Why the Confusion?

- **Database/Code**: Uses `project_code` as the field name
- **User Interface**: Shows "Project #" or "Project Number"
- **Excel Templates**: Uses "Project #" in column headers
- **Documentation**: May use either term

They all refer to the **unique identifier** for each project.

---

## Field Mapping Fix

### Problem
When using field mapping, the system was checking for column names BEFORE applying the mappings, causing this error:

```
Projects sheet missing required column: project_code
```

### Root Cause
The validation flow was:
1. Check if Excel has column named "project_code" ❌
2. Apply field mappings
3. Parse data

But with field mapping, the Excel column might be named:
- "Project"
- "Project Number"  
- "Proj No"
- "Project #"
- etc.

### Solution
Updated the validation flow:
1. Check if custom mappings are provided
2. **Skip** structure validation if mappings exist
3. Apply field mappings
4. Parse data
5. Validate data content (not column names)

**File Modified**: `src/app/api/projects/import/route.ts`

```typescript
// Skip structure validation when using custom mappings
if (!projectMappings && !buildingMappings) {
  const structureErrors = validateExcelStructure(buffer);
  // ... validation
}
```

---

## Updated Field Labels

### Before
- `project_code` → "Project # (Required)"
- `building_code` → "Building Code (Required)"

### After
- `project_code` → "Project Number / Project # (Required)"
- `building_code` → "Building Code / Building # (Required)"

This makes it clear that:
- "Project Code" = "Project Number" = "Project #"
- "Building Code" = "Building #"

---

## How It Works Now

### Direct Import (No Mapping)
1. Excel must have columns named exactly:
   - "Project #" or "project_code" or "Project"
   - "Building Code" or "building_code" or "Building"
2. System auto-normalizes column names
3. Validates structure
4. Imports data

### Field Mapping
1. Excel can have ANY column names
2. User maps columns to OTS fields
3. **Structure validation is skipped** ✅
4. Mappings are applied
5. Data is validated (not column names)
6. Imports data

---

## Common Column Name Variations

The system recognizes these variations:

### For Project Number
- "Project #"
- "Project"
- "Project Number"
- "Project Code"
- "Proj No"
- "project_code"

### For Building Code
- "Building"
- "Building Code"
- "Building #"
- "Bldg"
- "building_code"

### For Project Name
- "Project Name"
- "Name"
- "project_name"

---

## Examples

### Example 1: Standard Template
**Excel Columns**: `Project #`, `Project Name`, `Client`

**Result**: Direct import works ✅ (auto-normalized)

---

### Example 2: Custom Format
**Excel Columns**: `Proj No`, `Proj Name`, `Customer`

**Solution**: Use field mapping
1. Map "Proj No" → "Project Number / Project #"
2. Map "Proj Name" → "Project Name"
3. Map "Customer" → "Client Name"

**Result**: Import works ✅ (no structure validation)

---

### Example 3: Legacy Format
**Excel Columns**: `Project`, `Building`, `Client`, `Area`

**Solution**: Use field mapping
1. Map "Project" → "Project Number / Project #"
2. Map "Building" → "Building Code / Building #"
3. etc.

**Result**: Import works ✅

---

## Database Schema

In the database, the field is stored as:

```prisma
model Project {
  id            String   @id @default(uuid())
  projectNumber String   @unique  // This is the "Project Code"
  name          String
  // ... other fields
}
```

Note: The database field is actually called `projectNumber`, but we refer to it as `project_code` in the import system for consistency with the Excel column normalization.

---

## Summary

✅ **Project Code = Project Number = Project #** (same thing)  
✅ **Field mapping now skips structure validation**  
✅ **Labels updated to show both terms**  
✅ **Any column name works with field mapping**  

---

## Testing

### Test Case 1: Excel with "Project Number"
**Columns**: `Project Number`, `Name`, `Client`

**Steps**:
1. Upload file
2. Click "Map Fields"
3. Map "Project Number" → "Project Number / Project #"

**Expected**: ✅ Import succeeds

---

### Test Case 2: Excel with "Proj No"
**Columns**: `Proj No`, `Proj Name`, `Customer`

**Steps**:
1. Upload file
2. Click "Map Fields"
3. Map "Proj No" → "Project Number / Project #"
4. Map "Proj Name" → "Project Name"
5. Map "Customer" → "Client Name"

**Expected**: ✅ Import succeeds

---

### Test Case 3: Direct Import
**Columns**: `Project #`, `Project Name`, `Client`

**Steps**:
1. Upload file
2. Click "Direct Import"

**Expected**: ✅ Import succeeds (matches template)

---

## Key Takeaway

**When using field mapping, you can name your Excel columns ANYTHING!**

The system will:
1. Skip column name validation
2. Use your custom mappings
3. Validate the actual data content
4. Import successfully

No more "missing required column" errors! 🎉
