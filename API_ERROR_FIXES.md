# API Error Fixes - Project Creation 500 Error

## Issue
Project creation via wizard was failing with a 500 Internal Server Error.

## Root Cause
The `/api/projects` POST endpoint had issues:
1. **Missing try-catch block** - Errors weren't being caught properly
2. **Client handling bug** - Code assumed `clientName` was always provided
3. **Poor error logging** - No visibility into what was failing
4. **Generic error messages** - User couldn't see what went wrong

---

## Fixes Applied

### Fix 1: Added Try-Catch Block ✅
**File:** `src/app/api/projects/route.ts`

**Before:**
```typescript
export async function POST(req: Request) {
  const store = await cookies();
  // ... rest of code without try-catch
}
```

**After:**
```typescript
export async function POST(req: Request) {
  try {
    const store = await cookies();
    // ... rest of code
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ 
      error: 'Failed to create project', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
```

**Benefits:**
- Catches all errors
- Returns proper 500 response
- Logs error details
- Provides error message to client

### Fix 2: Fixed Client Handling ✅
**File:** `src/app/api/projects/route.ts`

**Before:**
```typescript
// Find or create client by name
let client = await prisma.client.findFirst({
  where: { name: parsed.data.clientName },
});

if (!client) {
  client = await prisma.client.create({
    data: { name: parsed.data.clientName },
  });
}

const { clientName, ...projectData } = parsed.data;
const data: any = { ...projectData, clientId: client.id };
```

**Problem:** Crashed if `clientName` was undefined/null

**After:**
```typescript
// Find or create client by name
let clientId = parsed.data.clientId;

if (parsed.data.clientName) {
  let client = await prisma.client.findFirst({
    where: { name: parsed.data.clientName },
  });

  if (!client) {
    client = await prisma.client.create({
      data: { name: parsed.data.clientName },
    });
  }
  clientId = client.id;
}

const { clientName, clientId: _, ...projectData } = parsed.data;
const data: any = { ...projectData, clientId };
```

**Benefits:**
- Handles both `clientId` and `clientName`
- Only creates client if `clientName` is provided
- Doesn't crash on null/undefined
- Supports existing projects with `clientId`

### Fix 3: Enhanced Error Logging ✅
**File:** `src/app/api/projects/route.ts`

**Added:**
```typescript
const parsed = createSchema.safeParse(body);
if (!parsed.success) {
  console.error('Validation error:', parsed.error);
  return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
}
```

**Benefits:**
- Logs validation errors
- Shows which fields failed validation
- Helps debug schema issues
- Visible in server console

### Fix 4: Better Error Messages in Wizard ✅
**File:** `src/app/projects/wizard/page.tsx`

**Before:**
```typescript
if (!projectResponse.ok) {
  throw new Error('Failed to create project');
}
```

**After:**
```typescript
if (!projectResponse.ok) {
  const errorData = await projectResponse.json();
  console.error('Project creation error:', errorData);
  throw new Error(errorData.details || errorData.error || 'Failed to create project');
}
```

**Benefits:**
- Shows actual API error message
- Logs error details to console
- User sees specific error
- Easier to debug issues

### Fix 5: Improved User Error Display ✅
**File:** `src/app/projects/wizard/page.tsx`

**Before:**
```typescript
catch (error) {
  console.error('Error creating project:', error);
  alert('Failed to create project');
}
```

**After:**
```typescript
catch (error) {
  console.error('Error creating project:', error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  alert(`Failed to create project:\n\n${errorMessage}`);
}
```

**Benefits:**
- Shows specific error message
- User knows what went wrong
- Can take corrective action
- Better UX

---

## Testing

### Test Case 1: Valid Project Creation
**Steps:**
1. Fill all wizard steps correctly
2. Add buildings
3. Add coating coats
4. Submit

**Expected:**
- ✅ Project created successfully
- ✅ Success message with counts
- ✅ Redirected to project page
- ✅ Buildings visible

### Test Case 2: Missing Required Field
**Steps:**
1. Leave project manager empty
2. Try to submit

**Expected:**
- ❌ Validation error
- ✅ Error message: "projectManagerId is required"
- ✅ User stays on wizard
- ✅ Can fix and retry

### Test Case 3: Invalid Data
**Steps:**
1. Enter invalid project manager ID
2. Submit

**Expected:**
- ❌ Database error
- ✅ Error message shows specific issue
- ✅ Logged to console
- ✅ User can retry

### Test Case 4: Network Error
**Steps:**
1. Disconnect network
2. Try to submit

**Expected:**
- ❌ Network error
- ✅ Error message: "Failed to fetch" or similar
- ✅ User can retry when back online

---

## Error Messages Reference

### Validation Errors (400)
```
Failed to create project:

Invalid input
```
*Check console for specific field errors*

### Authorization Errors (403)
```
Failed to create project:

Forbidden
```
*User doesn't have permission (not Admin/Manager)*

### Server Errors (500)
```
Failed to create project:

[Specific error message from server]
```
*Database error, constraint violation, etc.*

### Network Errors
```
Failed to create project:

Failed to fetch
```
*Network disconnected or server down*

---

## Debugging Guide

### If Project Creation Fails:

#### 1. Check Browser Console
- Open DevTools (F12)
- Look for red errors
- Check "Project creation error:" log
- Note the error message

#### 2. Check Server Console
- Look for "Error creating project:" log
- Check for "Validation error:" log
- Note the stack trace
- Check database connection

#### 3. Check Network Tab
- Open DevTools → Network
- Find POST to `/api/projects`
- Check status code (400, 403, 500)
- View response body
- Check request payload

#### 4. Common Issues

**"projectManagerId is required"**
- Solution: Select a project manager in Step 1

**"Invalid UUID"**
- Solution: Project manager ID is corrupted, refresh page

**"Unique constraint violation"**
- Solution: Project number already exists, use different number

**"Foreign key constraint"**
- Solution: Project manager doesn't exist in database

**"clientName is required"**
- Solution: Enter client name in Step 1

---

## Files Modified

1. **src/app/api/projects/route.ts**
   - Added try-catch block
   - Fixed client handling logic
   - Added error logging
   - Improved error responses

2. **src/app/projects/wizard/page.tsx**
   - Enhanced error handling
   - Better error messages
   - Improved user feedback

---

## Future Improvements

### Phase 1: Better Validation
- [ ] Client-side validation before submit
- [ ] Real-time field validation
- [ ] Check project number uniqueness
- [ ] Validate manager exists

### Phase 2: Better Error UX
- [ ] Toast notifications instead of alerts
- [ ] Inline error messages
- [ ] Field-level error highlighting
- [ ] Retry button

### Phase 3: Better Logging
- [ ] Structured error logging
- [ ] Error tracking service integration
- [ ] User session tracking
- [ ] Performance monitoring

---

## Summary

The 500 error was caused by:
1. Missing error handling in API
2. Bug in client creation logic
3. Poor error visibility

All issues have been fixed with:
- ✅ Proper try-catch blocks
- ✅ Fixed client handling
- ✅ Enhanced error logging
- ✅ Better error messages
- ✅ Improved user feedback

**Result:** Users now see specific error messages and can take corrective action instead of seeing generic "500 Internal Server Error".
