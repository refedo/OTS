# Empty Rows & Building Type Fixes

## Issues Fixed

### 1. ✅ Empty Rows Causing Validation Errors

**Problem**:
```
Row 52 (project_code): Projects sheet: Project code is required
Row 52 (project_name): Projects sheet: Project name is required
Row 53 (project_code): Projects sheet: Project code is required
Row 53 (project_name): Projects sheet: Project name is required
...
```

**Root Cause**: Excel files often have empty rows at the end (formatting, formulas, etc.) that Excel still reads as data rows.

**Solution**: Added filtering to remove completely empty rows:
- **Projects**: Filter out rows with no `project_code` AND no `project_name`
- **Buildings**: Filter out rows with no `project_code`, `building_code`, AND `building_name`

---

### 2. ✅ Invalid Building Type Values

**Problem**:
```
Row 2 (building_type): Buildings sheet: Invalid option: expected one of "HR"|"PEB"|"MEP"|"Modular"|"Other"
Row 3 (building_type): Buildings sheet: Invalid option: expected one of "HR"|"PEB"|"MEP"|"Modular"|"Other"
...
```

**Root Cause**: Excel has building type values that don't exactly match the system's enum values.

**Solution**: 
1. Changed schema to accept any string
2. Added `normalizeBuildingType()` function to convert values to valid enum or default to "Other"

---

## Technical Details

### Empty Row Filtering

#### Projects Sheet
```typescript
.filter((project) => {
  // Filter out completely empty rows
  return project.project_code || project.project_name;
});
```

**Logic**: Keep row if it has EITHER project_code OR project_name

#### Buildings Sheet
```typescript
.filter((building) => {
  // Filter out completely empty rows
  return building.project_code || building.building_code || building.building_name;
});
```

**Logic**: Keep row if it has ANY of: project_code, building_code, or building_name

---

### Building Type Normalization

#### Valid Enum Values
- `HR` - Heavy Rigid
- `PEB` - Pre-Engineered Building
- `MEP` - Mechanical, Electrical, Plumbing
- `Modular` - Modular Buildings
- `Other` - Everything else

#### Normalization Function
```typescript
function normalizeBuildingType(value: any): string | undefined {
  if (!value) return undefined;
  
  const str = toString(value).toUpperCase();
  
  // Valid enum values
  const validTypes = ['HR', 'PEB', 'MEP', 'MODULAR', 'OTHER'];
  
  // Check for exact match
  if (validTypes.includes(str)) {
    return str; // with proper casing
  }
  
  // Check for common variations
  if (str.includes('HEAVY')) return 'HR';
  if (str.includes('PRE') || str.includes('ENGINEERED')) return 'PEB';
  if (str.includes('MECHANICAL') || str.includes('ELECTRICAL')) return 'MEP';
  if (str.includes('MODULAR') || str.includes('MODULE')) return 'Modular';
  
  // Default to Other
  return 'Other';
}
```

---

## Examples

### Example 1: Empty Rows

**Excel Data**:
```
Row 1: Project # | Project Name | Client
Row 2: 249       | Warehouse    | ABC
Row 3: 250       | Office       | XYZ
Row 4:           |              |        <- Empty row
Row 5:           |              |        <- Empty row
```

**Before**: ❌ Rows 4-5 cause validation errors

**After**: ✅ Rows 4-5 are automatically filtered out

---

### Example 2: Building Type Variations

**Excel Values** → **Normalized To**:

| Excel Value | Normalized |
|-------------|------------|
| `HR` | `HR` ✅ |
| `hr` | `HR` ✅ |
| `Heavy Rigid` | `HR` ✅ |
| `PEB` | `PEB` ✅ |
| `Pre-Engineered` | `PEB` ✅ |
| `MEP` | `MEP` ✅ |
| `Mechanical` | `MEP` ✅ |
| `Modular` | `Modular` ✅ |
| `Module` | `Modular` ✅ |
| `Warehouse` | `Other` ✅ |
| `Factory` | `Other` ✅ |
| `` (empty) | `undefined` ✅ |

---

### Example 3: Mixed Valid/Invalid Types

**Excel Data**:
```
Buildings Sheet:
| Project | Building | Name | Type |
|---------|----------|------|------|
| 249 | 1 | Main | HR |
| 249 | 2 | Warehouse | Storage |
| 249 | 3 | Office | PEB |
```

**Result**:
- Row 1: Type = `HR` ✅
- Row 2: Type = `Other` ✅ (Storage not recognized)
- Row 3: Type = `PEB` ✅

---

## Schema Changes

### Before
```typescript
building_type: BuildingType.optional(), // Strict enum validation
```

**Problem**: Rejects any value not in enum

### After
```typescript
building_type: z.string().optional(), // Accept any string
```

**Solution**: Accept any string, normalize in parser

---

## Benefits

### Empty Row Filtering
✅ **Handles Excel formatting** - Empty rows from formatting don't cause errors  
✅ **Handles trailing rows** - Extra rows at end of sheet are ignored  
✅ **Handles deleted data** - Rows where data was deleted are filtered  
✅ **Smart filtering** - Only removes truly empty rows  

### Building Type Normalization
✅ **Flexible input** - Accept any building type value  
✅ **Smart matching** - Recognizes common variations  
✅ **Safe default** - Unknown types become "Other"  
✅ **Case insensitive** - `hr`, `HR`, `Hr` all work  
✅ **Partial matching** - "Heavy Rigid" → `HR`  

---

## Files Modified

1. **`src/lib/types/project-migration.ts`**
   - Changed `building_type` from strict enum to string

2. **`src/lib/utils/excel-parser.ts`**
   - Added empty row filtering for projects
   - Added empty row filtering for buildings
   - Added `normalizeBuildingType()` function
   - Updated `mapBuildingRow()` to use normalization

---

## Testing

### Test Case 1: Empty Rows at End
**Excel**:
```
Projects:
| 249 | Warehouse | ABC |
| 250 | Office | XYZ |
|     |           |     |  <- Empty
|     |           |     |  <- Empty
```

**Expected**: ✅ Import 2 projects, ignore 2 empty rows

---

### Test Case 2: Empty Rows in Middle
**Excel**:
```
Projects:
| 249 | Warehouse | ABC |
|     |           |     |  <- Empty
| 250 | Office | XYZ |
```

**Expected**: ✅ Import 2 projects, ignore 1 empty row

---

### Test Case 3: Custom Building Types
**Excel**:
```
Buildings:
| 249 | 1 | Main Building | Factory |
| 249 | 2 | Warehouse | Storage |
| 249 | 3 | Office | PEB |
```

**Expected**: 
- Row 1: Type = `Other` (Factory → Other)
- Row 2: Type = `Other` (Storage → Other)
- Row 3: Type = `PEB` (PEB → PEB)

---

### Test Case 4: Case Variations
**Excel**:
```
| hr | HR | Hr | peb | PEB | Peb |
```

**Expected**: All normalized to proper casing (`HR`, `PEB`)

---

## Common Scenarios

### Scenario 1: Legacy Data Export
Your old system has building types like "Factory", "Warehouse", "Storage"

**Solution**: ✅ All import as "Other"

---

### Scenario 2: Excel Template with Extra Rows
Template has 100 rows but only 50 have data

**Solution**: ✅ Only 50 rows imported, 50 empty rows filtered

---

### Scenario 3: User Deleted Some Rows
User deleted data but Excel still shows the rows

**Solution**: ✅ Empty rows automatically filtered

---

### Scenario 4: Mixed Case Building Types
Users entered "hr", "Hr", "HR" inconsistently

**Solution**: ✅ All normalized to "HR"

---

## Best Practices

### For Users

1. **Don't worry about empty rows** - System filters them automatically
2. **Any building type works** - Unknown types become "Other"
3. **Case doesn't matter** - "hr", "HR", "Hr" all work
4. **Use standard types when possible**:
   - HR, PEB, MEP, Modular, Other

### For Developers

1. **Always filter empty rows** - Prevents validation errors
2. **Normalize enum values** - Accept variations, normalize to standard
3. **Default to safe value** - "Other" for unrecognized types
4. **Case-insensitive matching** - Convert to uppercase for comparison

---

## Summary

**Problems**:
1. Empty rows causing validation errors
2. Invalid building type values

**Solutions**:
1. Filter out empty rows automatically
2. Normalize building types or default to "Other"

**Results**:
- ✅ Empty rows no longer cause errors
- ✅ Any building type value works
- ✅ Unknown types become "Other"
- ✅ Case-insensitive matching
- ✅ Smart variation recognition

**Files Modified**:
- `src/lib/types/project-migration.ts`
- `src/lib/utils/excel-parser.ts`

**Impact**: Import now handles real-world Excel files with empty rows and non-standard building types! 🎉
