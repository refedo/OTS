# Project Migration Module - Bug Fixes

## Issues Fixed

### 1. ✅ 401 Unauthorized Error on Export/Import

**Problem:**
- Template download button returned 401 Unauthorized
- Export all projects button returned 401 Unauthorized
- API routes were looking for cookie named `'token'`

**Root Cause:**
The authentication cookie in the application is named `'ots_session'` (or from `process.env.COOKIE_NAME`), but the migration API routes were hardcoded to look for a cookie named `'token'`.

**Solution:**
Updated all migration API routes to use the correct cookie name:

```typescript
const cookieName = process.env.COOKIE_NAME || 'ots_session';
const token = cookieStore.get(cookieName)?.value;
```

**Files Fixed:**
- ✅ `src/app/api/projects/export/route.ts`
- ✅ `src/app/api/projects/export/[projectId]/route.ts`
- ✅ `src/app/api/projects/template/route.ts`
- ✅ `src/app/api/projects/import/route.ts`

---

### 2. ✅ Missing Import/Export Button on Projects Page

**Problem:**
- No way to access the migration page from the main projects page
- Users had to manually navigate to `/projects/migration`

**Solution:**
Added an "Import/Export" button to the projects page header that:
- Only visible to Admin and PMO users
- Uses outline variant to differentiate from primary "Create Project" button
- Links to `/projects/migration` page
- Includes Upload icon for visual clarity

**Files Modified:**
- ✅ `src/app/projects/page.tsx`

**Changes:**
1. Added `Upload` icon import from `lucide-react`
2. Added `canImportExport` permission check for Admin and PMO roles
3. Added button in header with proper styling and responsive layout

---

## Testing Checklist

### ✅ Authentication Fixed
- [x] Template download now works (no 401 error)
- [x] Export all projects now works (no 401 error)
- [x] Import functionality works (no 401 error)
- [x] Single project export works (no 401 error)

### ✅ UI Enhancement
- [x] Import/Export button visible on `/projects` page
- [x] Button only shows for Admin and PMO users
- [x] Button links to `/projects/migration`
- [x] Responsive layout works on mobile and desktop
- [x] Button styling matches design system

---

## How to Test

### 1. Test Authentication Fix

1. Login as Admin or PMO user
2. Navigate to `/projects/migration`
3. Click "Download Empty Template" - Should download Excel file
4. Click "Download All Projects (Excel)" - Should download Excel file
5. Upload a valid Excel file - Should import successfully

### 2. Test UI Enhancement

1. Navigate to `/projects` (main projects page)
2. Verify "Import/Export" button appears in header (Admin/PMO only)
3. Click the button - Should navigate to `/projects/migration`
4. Test on mobile - Buttons should wrap properly

### 3. Test Permissions

1. Login as non-Admin/non-PMO user (e.g., Engineer)
2. Navigate to `/projects`
3. Verify "Import/Export" button does NOT appear
4. Try to access `/projects/migration` directly
5. Should still work if user has correct role

---

## Summary

Both issues have been resolved:

1. **Authentication Issue**: Fixed cookie name mismatch in all migration API routes
2. **UI Issue**: Added Import/Export button to projects page for easy access

The module is now fully functional and accessible! ✅
