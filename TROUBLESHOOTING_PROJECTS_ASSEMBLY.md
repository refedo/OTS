# 🔧 Troubleshooting: Projects & Assembly Parts Not Showing

## Issue Description
Projects and Assembly Parts lists are not displaying data even though the database contains records.

**Database Status:**
- ✅ 4 Projects in database
- ✅ 98 Assembly Parts in database
- ✅ Database connection working

## Debugging Steps Added

I've added console logging to help identify the issue:

### 1. Projects Component
**File:** `src/components/projects-client.tsx`

Added logging to show:
- API response status
- Number of projects received
- Any error messages

### 2. Assembly Parts Component
**File:** `src/app/production/assembly-parts/page.tsx`

Added logging to show:
- API response status
- Number of parts received
- Any error messages

## How to Diagnose

### Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Navigate to `/projects` page
4. Look for these messages:
   - `Projects API response status: 200` (or other status code)
   - `Projects data received: X projects`
   - Any error messages in red

5. Navigate to `/production/assembly-parts` page
6. Look for these messages:
   - `Assembly parts API response status: 200` (or other status code)
   - `Assembly parts data received: X parts`
   - Any error messages in red

### Step 2: Common Issues & Solutions

#### Issue 1: 401 Unauthorized Error
**Symptom:** Console shows `Projects API error: 401`

**Solution:**
1. Make sure you're logged in
2. Clear browser cookies and log in again
3. Check if your session token is valid

#### Issue 2: 500 Server Error
**Symptom:** Console shows `Projects API error: 500`

**Solution:**
1. Check the terminal/server logs for detailed error
2. Verify database connection is working
3. Check if Prisma schema is up to date

#### Issue 3: Empty Array Returned
**Symptom:** Console shows `Projects data received: 0 projects` but database has data

**Solution:**
1. Check role-based filtering in API route
2. Verify your user role has permission to see projects
3. Check if status filters are excluding all projects

#### Issue 4: Network Error
**Symptom:** Console shows `Failed to fetch projects: TypeError`

**Solution:**
1. Verify dev server is running (`npm run dev`)
2. Check if API route exists at `/api/projects`
3. Verify no CORS issues

## Quick Tests

### Test 1: Database Connection
Run this command to verify database has data:
```bash
node test-db-connection.js
```

Expected output:
```
✓ Projects table accessible: 4 records found
✓ AssemblyPart table accessible: 98 records found
```

### Test 2: API Endpoints (While Logged In)
Open these URLs in your browser:
- http://localhost:3000/api/projects
- http://localhost:3000/api/production/assembly-parts

You should see JSON data, not an error page.

### Test 3: Check User Role
Your user role affects what you can see:
- **Admin:** Can see all projects
- **Manager:** Can see only their own projects
- **Engineer/Operator:** Can see only assigned projects

To check your role:
1. Open browser console
2. Navigate to any page
3. Type: `document.cookie`
4. Look for the session cookie

## Likely Causes

Based on the symptoms, the most likely causes are:

### 1. **Authentication Issue** (Most Common)
- Session expired
- Cookie not being sent with requests
- JWT token invalid

**Fix:** Log out and log back in

### 2. **Role-Based Filtering**
- User role doesn't have permission to see data
- Projects filtered by role (Manager only sees their projects)

**Fix:** Check user role and permissions

### 3. **API Route Error**
- Server-side error in API route
- Database query failing

**Fix:** Check server logs in terminal

### 4. **Client-Side Error**
- JavaScript error preventing data display
- React component error

**Fix:** Check browser console for errors

## Next Steps

1. **Restart the dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache and cookies:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear all site data in browser settings

3. **Log out and log back in:**
   - Go to `/login`
   - Enter credentials
   - Navigate to `/projects` or `/production/assembly-parts`

4. **Check the browser console:**
   - Look for the new debug messages
   - Share any error messages you see

## What I Did

I added debugging console logs to both components to help identify where the issue is occurring. These logs will show:

1. Whether the API request is being made
2. What status code is returned (200 = success, 401 = unauthorized, 500 = server error)
3. How many records are being returned
4. Any error messages

## Expected Behavior

When working correctly, you should see:
- **Projects page:** 4 projects displayed
- **Assembly Parts page:** 98 parts displayed
- **Console logs:** 
  - `Projects API response status: 200`
  - `Projects data received: 4 projects`
  - `Assembly parts API response status: 200`
  - `Assembly parts data received: 98 parts`

## If Issue Persists

If you still see no data after checking the above:

1. **Share the console logs** - Copy the exact error messages
2. **Check server terminal** - Look for any errors in the terminal where `npm run dev` is running
3. **Verify login** - Make sure you're logged in with a valid account
4. **Check user role** - Verify your user has appropriate permissions

## Contact Information

If you need further assistance, provide:
1. Browser console logs (screenshot or text)
2. Server terminal logs (any errors)
3. Your user role (Admin, Manager, Engineer, etc.)
4. Which page is not working (Projects, Assembly Parts, or both)
