# Project Wizard - Troubleshooting Guide

## Issue: Buildings Not Showing After Project Creation

### Symptoms
- Project created successfully via wizard
- Navigate to project detail page
- Buildings section is empty or not showing

### Root Causes & Solutions

#### 1. Building Creation Failed Silently
**Cause:** The wizard was not checking if building creation succeeded.

**Solution:** ✅ Added error handling in wizard
- Now throws error if building creation fails
- Shows detailed error message
- Prevents silent failures

**Code Location:** `src/app/projects/wizard/page.tsx` line 276-286

#### 2. Page Cache Issue
**Cause:** Next.js might cache the project detail page.

**Solution:** 
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Or navigate away and back to the project
- API calls use `cache: 'no-store'` to prevent caching

**Code Location:** `src/app/projects/[id]/page.tsx` line 22, 37

#### 3. API Endpoint Mismatch
**Cause:** Wizard uses `/api/buildings` but page fetches from `/api/projects/${id}/buildings`

**Status:** ✅ Both endpoints exist and work correctly
- `/api/buildings` - POST endpoint for creating buildings
- `/api/projects/${id}/buildings` - GET endpoint for fetching buildings

#### 4. Scope Schedules Not Persisted
**Status:** ⚠️ Known Limitation
- Scope schedules are captured in the wizard
- They are NOT saved to database yet
- Requires new database table and API

**Workaround:** 
- Scope schedules are included in the success message
- User can see what was defined
- Feature coming soon

---

## Verification Steps

### 1. Check if Buildings Were Created
```sql
SELECT * FROM Building WHERE projectId = 'YOUR_PROJECT_ID';
```

### 2. Check Browser Console
- Open DevTools (F12)
- Check Console tab for errors
- Look for failed API calls

### 3. Check Network Tab
- Open DevTools → Network tab
- Filter by "Fetch/XHR"
- Look for POST to `/api/buildings`
- Check response status and body

### 4. Test Building Creation Manually
```bash
# Test API directly
curl -X POST http://localhost:3000/api/buildings \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "name": "Test Building",
    "designation": "TST"
  }'
```

---

## Current Wizard Flow

### Step 1: Project Info
- ✅ Creates project record
- ✅ Saves scope of work (as text)
- ✅ Saves coating system (as text)

### Step 2: Buildings
- ✅ Creates building records
- ✅ Links to project
- ✅ Saves name and designation

### Step 3: Scope Schedules
- ⚠️ Captured but NOT persisted
- Stored in component state only
- Lost after navigation

### Step 4: Coating Coats
- ✅ Saved as formatted text in project.coatingSystem
- Format: "Coat 1: Name (microns) - RAL"

### Step 5: Upload Parts
- ✅ Optional file upload
- ✅ Processes Excel file

---

## Success Message Details

After successful creation, you should see:
```
Project created successfully!

✓ X building(s) added
✓ Y scope schedule(s) defined
✓ Z coating coat(s) specified

Note: Scope schedules are captured but not yet 
persisted to database (feature coming soon).
```

If you see this message, the project was created successfully.

---

## Common Errors

### Error: "Failed to create building: [Building Name]"
**Cause:** Building creation API call failed

**Check:**
1. Building designation format (2-4 uppercase letters/numbers)
2. Duplicate designation in same project
3. Database connection
4. API endpoint availability

**Solution:**
- Ensure designation is valid (e.g., "BLD1", "A", "B01")
- Check if designation already exists
- Verify database is running

### Error: "Failed to create project"
**Cause:** Project creation API call failed

**Check:**
1. Required fields filled
2. Project manager exists
3. Database connection

**Solution:**
- Verify all Step 1 fields are filled
- Check project manager ID is valid
- Ensure database is accessible

---

## Future Enhancements

### Phase 1: Scope Schedule Persistence
- [ ] Create `ScopeSchedule` table
- [ ] Create API endpoints
- [ ] Save schedules during project creation
- [ ] Display schedules on project detail page

### Phase 2: Better Error Handling
- [ ] Toast notifications instead of alerts
- [ ] Detailed error messages
- [ ] Retry mechanism
- [ ] Rollback on partial failure

### Phase 3: Real-time Validation
- [ ] Check designation uniqueness before submit
- [ ] Validate date ranges
- [ ] Warn about scheduling conflicts

---

## Quick Fixes

### If Buildings Don't Show:
1. **Refresh the page** (Ctrl+R)
2. **Check database** - Query Building table
3. **Re-create buildings** - Use "Add Building" button on project page
4. **Check console** - Look for JavaScript errors

### If Scope Schedules Don't Show:
- This is expected behavior (not yet implemented)
- Schedules are captured but not saved
- Feature coming in next update

### If Coating System Doesn't Show:
- Check project.coatingSystem field in database
- Should contain formatted text with all coats
- Displayed in project details

---

## Contact & Support

If issues persist:
1. Check browser console for errors
2. Check server logs
3. Verify database connectivity
4. Test API endpoints manually
5. Review this troubleshooting guide

For database-related issues, check:
- Prisma schema is up to date
- Migrations are applied
- Database server is running
