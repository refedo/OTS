# Session Timeout Implementation - Dolibarr-Style Idle Detection

## Problem Solved
1. **Page refresh issues** - Session validation was running on every route change, causing inconvenient page refreshes
2. **No idle timeout** - Users could stay logged in indefinitely, creating security risks
3. **Poor user experience** - Users would encounter failures when trying to perform actions after long idle periods

## Solution Overview
Implemented a comprehensive idle timeout system similar to Dolibarr ERP:

### Key Features
- ✅ **2-hour idle timeout** - Automatically logs out users after 2 hours of inactivity
- ✅ **Activity tracking** - Monitors mouse, keyboard, scroll, touch, and click events
- ✅ **5-minute warning** - Shows warning dialog before logout
- ✅ **Session refresh** - Extends session on user activity (throttled to 1-minute intervals)
- ✅ **One-time validation** - Session validated only once on initial load, not on every route change
- ✅ **Security** - Prevents unauthorized access if system left open

## Implementation Details

### 1. Activity Tracker (`src/lib/session-activity.ts`)
```typescript
- Tracks user activity events
- Throttles activity updates to avoid excessive API calls
- Checks for idle timeout every minute
- Shows warning 5 minutes before logout
- Automatically logs out after 2 hours of inactivity
```

### 2. Session Activity Provider (`src/components/session-activity-provider.tsx`)
```typescript
- React component that wraps the app
- Shows warning dialog before logout
- Allows user to continue working or logout immediately
- Displays countdown timer
```

### 3. Activity API Endpoint (`src/app/api/auth/activity/route.ts`)
```typescript
- POST /api/auth/activity
- Refreshes JWT token with new timestamp
- Extends session on user activity
```

### 4. Refactored Session Provider (`src/components/SessionProvider.tsx`)
**CRITICAL CHANGES:**
- Now validates session **ONCE** on initial load only (not on every route change)
- Uses `useRef` to track validation state
- Wraps authenticated pages with:
  - `NotificationProvider` (moved from child layouts)
  - `SessionActivityProvider` (new idle timeout tracking)

## Configuration

### Timeout Settings (in `src/lib/session-activity.ts`)
```typescript
const IDLE_TIMEOUT = 2 * 60 * 60 * 1000;  // 2 hours
const WARNING_TIME = 5 * 60 * 1000;        // 5 minutes before logout
const ACTIVITY_THROTTLE = 60 * 1000;       // Update every 1 minute max
```

To change the timeout period, modify `IDLE_TIMEOUT` in `src/lib/session-activity.ts`.

## Required Cleanup

### Remove Duplicate NotificationProvider
Since `NotificationProvider` is now in the root `SessionProvider`, you must remove it from all child layout files.

**Files to update** (remove NotificationProvider wrapper):
- ✅ `src/app/dashboard/layout.tsx` (already updated)
- `src/app/notifications/layout.tsx`
- `src/app/tasks/layout.tsx`
- `src/app/users/layout.tsx`
- `src/app/roles/layout.tsx`
- `src/app/projects/layout.tsx`
- `src/app/projects/[id]/planning/layout.tsx`
- `src/app/projects-dashboard/layout.tsx`
- `src/app/production/layout.tsx`
- `src/app/qc/layout.tsx`
- `src/app/planning/layout.tsx`
- `src/app/operations/layout.tsx`
- `src/app/operations/events/layout.tsx`
- `src/app/organization/layout.tsx`
- `src/app/settings/layout.tsx`
- `src/app/timeline/layout.tsx`
- `src/app/wps/layout.tsx`
- `src/app/itp/layout.tsx`
- `src/app/documents/layout.tsx`
- `src/app/document-timeline/layout.tsx`
- `src/app/buildings/layout.tsx`
- `src/app/business-planning/layout.tsx`
- `src/app/changelog/layout.tsx`
- `src/app/ai-assistant/layout.tsx`

**Pattern to follow:**

**BEFORE:**
```typescript
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function SomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 lg:pl-64">
          {children}
        </div>
      </div>
    </NotificationProvider>
  );
}
```

**AFTER:**
```typescript
'use client';

import { AppSidebar } from '@/components/app-sidebar';

export default function SomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 lg:pl-64">
        {children}
      </div>
    </div>
  );
}
```

## User Experience

### Normal Usage
1. User logs in
2. Session validated once on initial load
3. User navigates freely without page refreshes
4. Activity is tracked and session refreshed automatically
5. User can work indefinitely as long as they're active

### Idle Scenario
1. User leaves system idle for 1 hour 55 minutes
2. Warning dialog appears: "Your session will expire in 5 minutes"
3. User has two options:
   - **Continue Working** - Resets idle timer, continues session
   - **Logout Now** - Immediately logs out
4. If no action taken, automatic logout after 2 hours
5. Redirect to login page with `?reason=idle` parameter

### Security Benefits
- Prevents unauthorized access if user leaves workstation
- Automatic logout after extended inactivity
- Session tokens are refreshed on activity (rolling expiration)
- Clear warning before logout (no surprise logouts)

## Testing

### Test Idle Timeout (Quick Test)
To test without waiting 2 hours, temporarily modify `src/lib/session-activity.ts`:

```typescript
// For testing only - change to 2 minutes
const IDLE_TIMEOUT = 2 * 60 * 1000;  // 2 minutes
const WARNING_TIME = 30 * 1000;       // 30 seconds before logout
```

1. Log in to the system
2. Don't interact with the page for 1.5 minutes
3. Warning dialog should appear
4. Wait 30 more seconds or click "Continue Working"
5. Verify behavior

**Remember to revert to production values after testing!**

## Troubleshooting

### Issue: Page still refreshing on navigation
- Check that `SessionProvider` is using `useRef` to track validation
- Verify `hasValidated.current` is set to `true` after first validation
- Ensure no other components are calling `router.refresh()` unnecessarily

### Issue: Logout happening too quickly
- Check `IDLE_TIMEOUT` value in `src/lib/session-activity.ts`
- Verify activity events are being tracked (check browser console)
- Ensure `/api/auth/activity` endpoint is responding successfully

### Issue: Warning not showing
- Check that `SessionActivityProvider` is properly wrapped in `SessionProvider`
- Verify `onWarning` callback is being called (add console.log)
- Check that Dialog component is rendering correctly

## Comparison with Dolibarr

| Feature | Dolibarr ERP | Our Implementation |
|---------|--------------|-------------------|
| Session timeout | Configurable (default varies) | 2 hours (configurable) |
| Activity tracking | Server-side PHP session | Client-side + server refresh |
| Warning before logout | No | Yes (5 minutes) |
| Session refresh | On page load | On user activity (throttled) |
| Logout redirect | Login page | Login page with reason |

## Future Enhancements

1. **Admin configurable timeout** - Allow admins to set timeout in settings
2. **Per-role timeouts** - Different timeouts for different user roles
3. **Activity logging** - Track user activity for audit purposes
4. **Remember me** - Extended sessions for "remember me" logins
5. **Multi-tab support** - Sync activity across browser tabs

## Files Modified

1. ✅ `src/lib/session-activity.ts` - New activity tracker
2. ✅ `src/components/session-activity-provider.tsx` - New React component
3. ✅ `src/app/api/auth/activity/route.ts` - New API endpoint
4. ✅ `src/components/SessionProvider.tsx` - Refactored validation logic
5. ✅ `src/app/dashboard/layout.tsx` - Removed duplicate NotificationProvider
6. ⏳ 23 more layout files need NotificationProvider removed

## Deployment Notes

1. No database migrations required
2. No environment variables to add
3. Existing sessions will continue to work
4. New idle timeout applies to new logins
5. Update all layout files before deploying to production
