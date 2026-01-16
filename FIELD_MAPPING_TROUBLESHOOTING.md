# Field Mapping Troubleshooting Guide

## Issue: No Columns Showing in Field Mapper

### Symptoms
- Field mapper modal opens
- Shows "Missing Required Fields" warning
- No columns appear in the mapping table
- Empty "Your Excel Column" section

### Possible Causes & Solutions

#### 1. Excel File Has No Header Row
**Problem**: The first row of your Excel file is empty or contains data instead of column headers.

**Solution**:
- Ensure the first row contains column names
- Column names should not be empty
- Example:
  ```
  Row 1: Project #, Project Name, Client, Status
  Row 2: PRJ-001, Warehouse, ABC Corp, Active
  ```

#### 2. Sheet Names Don't Match
**Problem**: Excel sheets are not named exactly "Projects" and "Buildings"

**Solution**:
- Rename your sheets to exactly "Projects" and "Buildings" (case-sensitive)
- Right-click sheet tab → Rename

#### 3. Empty Cells in Header Row
**Problem**: Header row has empty cells between column names

**Solution**:
- Remove empty columns or fill in header names
- System filters out empty headers

#### 4. Special Characters in Headers
**Problem**: Column headers contain only special characters or numbers

**Solution**:
- Use descriptive text names for columns
- Avoid headers like: `#`, `---`, `123`

### Debugging Steps

1. **Check Browser Console**
   - Press F12 to open Developer Tools
   - Look for console logs:
     - `Extract columns result:` - Shows API response
     - `Setting excel columns:` - Shows what's being set
     - `FieldMapper - Excel Columns:` - Shows what mapper receives

2. **Check Server Logs**
   - Look for: `Extracted columns:` in terminal
   - Should show: `{ projects: [...], buildings: [...] }`

3. **Verify Excel File Structure**
   ```
   Sheet 1 Name: Projects
   Row 1: [Column Headers]
   Row 2+: [Data]
   
   Sheet 2 Name: Buildings
   Row 1: [Column Headers]
   Row 2+: [Data]
   ```

### Example Valid Excel Structure

**Projects Sheet**:
| Project # | Project Name | Client | Status |
|-----------|--------------|--------|--------|
| PRJ-001 | Warehouse | ABC | Active |
| PRJ-002 | Office | XYZ | Draft |

**Buildings Sheet**:
| Project Code | Building Code | Building Name |
|--------------|---------------|---------------|
| PRJ-001 | WH-A | Warehouse A |
| PRJ-001 | WH-B | Warehouse B |

### Testing with Sample File

1. **Download Template**:
   - Click "Download Empty Template" button
   - This gives you the correct structure

2. **Add Data**:
   - Fill in at least one row of data
   - Keep the header row intact

3. **Test Import**:
   - Upload the file
   - Click "Map Fields"
   - Should see all columns

### Error Messages

#### "No columns found in Excel file"
- Excel file has no header row
- First row is empty
- Sheet is completely empty

#### "The Projects sheet appears to be empty or has no header row"
- Projects sheet exists but has no data
- First row has no text values
- All header cells are empty

#### "Excel file must contain 'Projects' and 'Buildings' sheets"
- Sheet names don't match exactly
- Sheets are missing
- Check spelling and capitalization

### Quick Fix Checklist

- [ ] Excel file has "Projects" and "Buildings" sheets (exact names)
- [ ] First row of each sheet contains column headers
- [ ] Column headers are not empty
- [ ] Column headers contain text (not just numbers/symbols)
- [ ] File is .xlsx format (not .xls or .csv)
- [ ] File is not corrupted
- [ ] File size is under 10MB

### Still Not Working?

1. **Try Direct Import Instead**:
   - Use "Direct Import" button
   - This uses automatic column matching
   - Works if your columns match the template

2. **Download and Modify Template**:
   - Download the empty template
   - Copy your data into it
   - Keep the template's column headers

3. **Check File Format**:
   - Save as .xlsx (not .xls)
   - Avoid using Excel 97-2003 format
   - Use modern Excel format

### Common Excel Issues

#### Merged Cells in Header
- Unmerge all cells in row 1
- Each column should have its own header

#### Hidden Columns
- Unhide all columns
- System reads all columns including hidden ones

#### Filtered Data
- Clear all filters
- Show all rows

#### Protected Sheet
- Unprotect the sheet
- Remove password protection

### Developer Notes

If you're debugging the code:

1. **Check API Response**:
   ```javascript
   // In browser console after clicking "Map Fields"
   // Should see: { success: true, columns: { projects: [...], buildings: [...] } }
   ```

2. **Check State**:
   ```javascript
   // In FieldMapper component
   console.log('Excel Columns:', excelColumns);
   // Should be an array of strings
   ```

3. **Check Excel Parser**:
   ```typescript
   // In extractExcelColumns function
   // Returns: { projects: string[], buildings: string[] }
   ```

### Contact Support

If none of these solutions work:
1. Check the browser console for errors
2. Check the server logs for errors
3. Try with the sample template file
4. Report the issue with:
   - Excel file structure (screenshot)
   - Browser console errors
   - Server log errors
