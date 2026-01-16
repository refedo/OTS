# Field Mapping Fixes - Summary

## Issues Fixed

### 1. ✅ Duplicate Key Error
**Problem**: React warning about duplicate keys "Litters Needed"
```
Encountered two children with the same key, `Litters Needed`. 
Keys should be unique so that components maintain their identity across updates.
```

**Root Cause**: Excel file had duplicate column names, and we were using column name as the React key.

**Solution**: Changed key from `key={col}` to `key={`${col}-${index}`}` to ensure uniqueness even with duplicate column names.

**File**: `src/components/project-migration/field-mapper.tsx`

---

### 2. ✅ Allow Ignoring Non-Mapped Fields
**Problem**: Users couldn't skip optional fields - system required all fields to be mapped.

**Solution**:
- Changed dropdown placeholder to "-- Select Field or Skip --"
- Filter out empty string mappings in `handleComplete()`
- Only validate required fields are mapped
- Added info message: "You can leave optional fields unmapped (they will be skipped)"

**Files Modified**:
- `src/components/project-migration/field-mapper.tsx`

**Behavior**:
- Required fields (marked with "Required") must be mapped
- Optional fields can be left unmapped (empty selection)
- Unmapped fields are automatically skipped during import
- Only mapped fields are sent to the import API

---

### 3. ✅ Allow Null/Empty Fields
**Problem**: System didn't handle null or empty values in Excel columns properly.

**Solution**:
- Updated `extractExcelColumns()` to filter out null/undefined/empty values
- Added `.trim()` to remove whitespace
- Convert all values to strings
- Better validation messages

**File**: `src/lib/utils/excel-parser.ts`

---

### 4. ✅ Buildings Sheet Not Showing
**Problem**: Clicking "Buildings Sheet" button didn't show building fields to map.

**Root Cause**: Component had internal state for sheet type, but it wasn't being used correctly.

**Solution**:
- Changed `FieldMapper` to accept `sheetType` as a prop instead of internal state
- Added `currentMappingSheet` state to migration page
- Sequential mapping: Projects first, then Buildings
- Pass correct columns based on current sheet type

**Flow**:
1. User clicks "Map Fields"
2. Shows Projects sheet mapping first
3. After completing Projects, automatically shows Buildings sheet
4. After completing Buildings, proceeds to import

**Files Modified**:
- `src/components/project-migration/field-mapper.tsx` - Accept sheetType prop
- `src/app/projects/migration/page.tsx` - Manage sheet state and sequential flow

---

## New Features

### Sequential Sheet Mapping
Instead of tabs, users now map sheets sequentially:

1. **Projects Sheet** - Map all project columns
2. Click "Continue with Mapping"
3. **Buildings Sheet** - Map all building columns  
4. Click "Continue with Mapping"
5. **Import** - Data is imported with both mappings

### Better User Feedback
- Info message explaining optional fields can be skipped
- Clear indication of which sheet is being mapped
- Improved validation messages
- Debug logging for troubleshooting

---

## Testing

### Test Case 1: Duplicate Column Names
**Excel File**:
```
| Project | Name | Client | Name |
| PRJ-001 | Test | ABC    | XYZ  |
```

**Expected**: No React key warnings, both "Name" columns appear in mapper

**Result**: ✅ Fixed - uses index-based keys

---

### Test Case 2: Skip Optional Fields
**Steps**:
1. Upload Excel file
2. Click "Map Fields"
3. Map only required fields (Project #, Project Name)
4. Leave other fields unmapped
5. Click "Continue"

**Expected**: Import succeeds with only mapped fields

**Result**: ✅ Works - unmapped fields are skipped

---

### Test Case 3: Buildings Sheet Mapping
**Steps**:
1. Upload Excel file
2. Click "Map Fields"
3. Map Projects sheet fields
4. Click "Continue with Mapping"
5. Should show Buildings sheet fields

**Expected**: Buildings sheet columns appear for mapping

**Result**: ✅ Fixed - shows correct sheet columns

---

### Test Case 4: Empty/Null Columns
**Excel File**:
```
| Project | Name |      | Client |
| PRJ-001 | Test | null | ABC    |
```

**Expected**: Empty column is filtered out, doesn't appear in mapper

**Result**: ✅ Fixed - empty columns filtered

---

## Code Changes Summary

### `field-mapper.tsx`
```typescript
// Before
export function FieldMapper({ excelColumns, onMappingComplete, onCancel })
const [sheetType, setSheetType] = useState('projects');

// After  
export function FieldMapper({ excelColumns, sheetType, onMappingComplete, onCancel })
// sheetType is now a prop

// Key fix
key={col} → key={`${col}-${index}`}

// Mapping filter
.filter(([_, otsField]) => otsField && otsField !== '' && otsField !== '_skip')
```

### `page.tsx`
```typescript
// Added state
const [currentMappingSheet, setCurrentMappingSheet] = useState<'projects' | 'buildings'>('projects');

// Sequential flow
if (currentMappingSheet === 'projects') {
  setCurrentMappingSheet('buildings'); // Move to buildings
} else {
  handleImportWithMappings(); // Import
}

// Pass correct columns
excelColumns={currentMappingSheet === 'projects' ? excelColumns.projects : excelColumns.buildings}
```

### `excel-parser.ts`
```typescript
// Better filtering
const projectHeaders = (projectsData[0] || [])
  .filter((col: any) => col !== null && col !== undefined && col !== '')
  .map((col: any) => String(col).trim());
```

---

## User Guide Updates

### How to Skip Optional Fields

1. In the field mapper, you'll see all your Excel columns
2. For columns you don't want to import:
   - Leave the dropdown as "-- Select Field or Skip --"
   - Or select "(Skip this column)"
3. Only required fields (marked with "Required") must be mapped
4. Click "Continue with Mapping" when done

### Mapping Both Sheets

1. Click "Map Fields" button
2. **Step 1**: Map your Projects sheet columns
   - Map at least: Project # and Project Name
   - Click "Continue with Mapping"
3. **Step 2**: Map your Buildings sheet columns
   - Map at least: Project Code, Building Code, Building Name
   - Click "Continue with Mapping"
4. Import will proceed with both mappings

---

## Benefits

✅ **Handles duplicate column names** - No more React warnings  
✅ **Flexible mapping** - Skip fields you don't need  
✅ **Sequential workflow** - Clear step-by-step process  
✅ **Better validation** - Only required fields enforced  
✅ **Cleaner data** - Filters out empty/null columns  

---

## Summary

All three issues have been resolved:
1. ✅ Duplicate key error fixed with index-based keys
2. ✅ Optional fields can now be skipped/ignored
3. ✅ Buildings sheet mapping now works correctly

The field mapping feature is now more robust and user-friendly! 🎉
