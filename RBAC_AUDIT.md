# RBAC Hardcoded Role Check Audit

## Summary
Found **50+ instances** of hardcoded role checks that bypass the RBAC permission system.

## Critical Issues

### Pattern 1: Page-level redirects
**Problem**: Pages check `session.role` against hardcoded role names instead of checking permissions.

**Files affected**:
- `src/app/projects/new/page.tsx` - Line 21: `!['CEO', 'Admin', 'Manager'].includes(session.role)`
- `src/app/itp/new/page.tsx` - Line 18: `!['CEO', 'Admin', 'Manager', 'Engineer'].includes(session.role)`
- `src/app/itp/[id]/edit/page.tsx` - Line 18: `!['CEO', 'Admin', 'Manager', 'Engineer'].includes(session.role)`

**Fix**: Replace with `checkPermission(session.sub, 'permission.name')`

### Pattern 2: API route guards
**Problem**: API routes check hardcoded roles instead of permissions.

**Files affected**:
- `src/app/api/wps/route.ts` - Line 115: `!['Admin', 'Manager', 'Engineer'].includes(session.role)`
- `src/app/api/wps/[id]/route.ts` - Lines 115, 168
- `src/app/api/wps/[id]/approve/route.ts` - Line 22
- `src/app/api/wps/[id]/passes/route.ts` - Lines 58, 99
- `src/app/api/wps/[id]/passes/[passId]/route.ts` - Lines 28, 66
- `src/app/api/settings/production/locations/route.ts` - Lines 48, 90, 142
- `src/app/api/settings/production/teams/route.ts` - Lines 48, 90, 142
- `src/app/api/scope-schedules/[id]/route.ts` - Multiple instances
- `src/app/api/tasks/dashboard/route.ts` - Line 14

**Fix**: Replace with `checkPermission(session.sub, 'permission.name')`

### Pattern 3: Client-side permission flags
**Problem**: Pages pass `canEdit`/`canDelete` flags based on hardcoded roles.

**Files affected**:
- `src/app/projects/page.tsx` - Lines 20-21: `canCreate`, `canImportExport`
- `src/app/projects/[id]/page.tsx` - Line 55: `canEdit`
- `src/app/projects/[id]/timeline/page.tsx` - Line 47: `canEdit`
- `src/app/wps/page.tsx` - Line 63: `canApprove`
- `src/app/wps/[id]/page.tsx` - Line 30: `canApprove`
- `src/app/documents/page.tsx` - Line 95: `canDelete`
- `src/app/documents/[id]/page.tsx` - Line 104: `canApprove`

**Fix**: Use `checkPermission()` to set these flags

### Pattern 4: Component-level checks
**Problem**: Client components check hardcoded roles.

**Files affected**:
- `src/components/initiative-tasks-client.tsx` - Lines 74-75
- `src/components/milestones-client.tsx` - Lines 74-75

**Fix**: Pass permissions from server component or fetch via `/api/auth/me`

### Pattern 5: Mixed permission checks
**Problem**: Some files mix RBAC with hardcoded checks.

**Files affected**:
- `src/app/tasks/[id]/edit/page.tsx` - Line 23: Checks permissions OR hardcoded roles
- `src/app/api/tasks/dashboard/route.ts` - Line 14: Checks permission OR hardcoded roles

**Fix**: Remove hardcoded role fallback, use only permissions

## Permission Mapping

| Current Hardcoded Check | Should Use Permission |
|------------------------|----------------------|
| `['CEO', 'Admin', 'Manager'].includes(session.role)` for project create | `projects.create` |
| `['CEO', 'Admin', 'Manager'].includes(session.role)` for project edit | `projects.edit` |
| `['CEO', 'Admin', 'Manager', 'Engineer'].includes(session.role)` for ITP create/edit | `quality.create_itp`, `quality.edit_itp` |
| `['Admin', 'Manager', 'Engineer'].includes(session.role)` for WPS create/edit | `quality.create_wps`, `quality.edit_wps` |
| `['Admin', 'Manager'].includes(session.role)` for WPS approve | `quality.approve_wps` |
| `['CEO', 'Admin', 'Manager'].includes(session.role)` for document approve | `documents.approve` |
| `['CEO', 'Admin', 'Manager'].includes(session.role)` for document delete | `documents.delete` |
| `['Admin', 'Manager'].includes(session.role)` for production settings | `settings.edit`, `production.manage_settings` |

## Implementation Plan

### Phase 1: Critical Pages (High Priority)
1. ✅ `src/app/projects/[id]/edit/page.tsx` - FIXED
2. `src/app/projects/new/page.tsx`
3. `src/app/itp/new/page.tsx`
4. `src/app/itp/[id]/edit/page.tsx`

### Phase 2: API Routes (High Priority)
1. All WPS API routes (7 files)
2. Production settings API routes (2 files)
3. Scope schedules API routes
4. Tasks dashboard API route

### Phase 3: Page Permission Flags (Medium Priority)
1. Projects pages (3 files)
2. WPS pages (2 files)
3. Documents pages (2 files)

### Phase 4: Client Components (Low Priority)
1. Initiative tasks client
2. Milestones client

## Testing Checklist

After fixes, test with a non-Admin user who has specific permissions:

- [ ] User with `projects.create` can create projects
- [ ] User with `projects.edit` can edit projects
- [ ] User with `quality.create_itp` can create ITPs
- [ ] User with `quality.edit_itp` can edit ITPs
- [ ] User with `quality.create_wps` can create WPS
- [ ] User with `quality.approve_wps` can approve WPS
- [ ] User with `documents.approve` can approve documents
- [ ] User with `documents.delete` can delete documents
- [ ] User WITHOUT permission gets proper "Forbidden" error

## Notes

- The v15.18.5 changelog claimed to fix RBAC, but only fixed **18 API routes**
- **50+ additional instances** were missed
- This is why Walaa (Projects Coordinator with `isAdmin: 1` and all permissions) couldn't edit projects
- Need systematic approach to prevent regression
