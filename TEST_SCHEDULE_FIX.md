# Test: Fabrication Schedule Fix

## Quick Test (2 minutes)

### Step 1: Open Work Order Creation
1. Go to Production → Work Orders
2. Click "Create Work Order"

### Step 2: Select Your Building
1. Project: **275 - New Factory in Jazan**
2. Building: **Intake** (or INT)

### Step 3: Check the Dates
Go to Step 4 (Responsibility)

**Expected Result**:
```
Fabrication Schedule Reference
Schedule Start: Nov 15, 2025
Schedule End: Dec 8, 2025
```

**Wrong Result (Before Fix)**:
```
Schedule Start: Jan 1, 2025
Schedule End: Apr 30, 2025
```

### Step 4: Verify in Console
1. Open browser console (F12)
2. Look for logs:
   ```
   Fabrication schedules for building: <id> [...]
   Set dates: { start: '2025-11-15', end: '2025-12-08', building: {...} }
   ```
3. Check that `building.designation` = "INT" or "Intake"

## Detailed Test

### Test Case 1: Intake Building
- **Project**: 275
- **Building**: Intake (INT)
- **Expected**: Nov 15, 2025 - Dec 8, 2025
- **Duration**: 23 days

### Test Case 2: Different Building
- **Project**: 275
- **Building**: (select another building)
- **Expected**: Dates specific to that building
- **Verify**: Dates match Project Planning for that building

### Test Case 3: Multiple Buildings
1. Create WO for Building A → Note dates
2. Go back and create WO for Building B → Note dates
3. Dates should be different for each building
4. Each should match its schedule in Project Planning

## Verification Checklist

- [ ] Dates match Project Planning exactly
- [ ] Different buildings show different dates
- [ ] Console logs show correct building ID
- [ ] No errors in console
- [ ] Schedule reference box appears
- [ ] Dates are pre-filled in the date inputs
- [ ] Warning appears if you exceed end date

## If Test Fails

### Dates Still Wrong?
1. Hard refresh: Ctrl+Shift+R
2. Check console for errors
3. Verify building has fabrication schedule in Planning
4. Check network tab - API should return filtered data

### No Dates Showing?
1. Go to Project Planning
2. Verify fabrication schedule exists for the building
3. Add schedule if missing
4. Try again

### Console Errors?
1. Copy the error message
2. Check if API endpoint is accessible
3. Verify database connection
4. Check if migration was run

## Success Criteria

✅ **Pass**: Dates match Project Planning for the selected building
✅ **Pass**: Different buildings show different dates
✅ **Pass**: Console logs show correct building info
✅ **Pass**: No errors in console

❌ **Fail**: Dates don't match Project Planning
❌ **Fail**: All buildings show same dates
❌ **Fail**: Console shows errors
❌ **Fail**: Wrong building info in logs

## Report Results

If test passes: ✅ Schedule fix working correctly!

If test fails:
1. Note which building was selected
2. Note what dates were shown
3. Note what dates were expected
4. Copy console logs
5. Report issue with details
