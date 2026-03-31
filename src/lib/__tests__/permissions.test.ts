import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  ALL_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsByCategory,
  getPermissionById,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/lib/permissions';

// ─── hasPermission ────────────────────────────────────────────────────────────

describe('hasPermission', () => {
  it('returns true when the user holds the required permission', () => {
    expect(hasPermission(['projects.view', 'tasks.create'], 'projects.view')).toBe(true);
  });

  it('returns false when the user does not hold the required permission', () => {
    expect(hasPermission(['projects.view'], 'projects.delete')).toBe(false);
  });

  it('returns false for an empty permission list', () => {
    expect(hasPermission([], 'projects.view')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(hasPermission(['Projects.View'], 'projects.view')).toBe(false);
  });
});

// ─── hasAnyPermission ─────────────────────────────────────────────────────────

describe('hasAnyPermission', () => {
  it('returns true when at least one required permission is present', () => {
    expect(hasAnyPermission(['tasks.view'], ['tasks.edit', 'tasks.view'])).toBe(true);
  });

  it('returns false when none of the required permissions are present', () => {
    expect(hasAnyPermission(['projects.view'], ['tasks.edit', 'tasks.delete'])).toBe(false);
  });

  it('returns false for an empty user permissions list', () => {
    expect(hasAnyPermission([], ['tasks.view'])).toBe(false);
  });

  it('returns false when required permissions array is empty', () => {
    expect(hasAnyPermission(['tasks.view'], [])).toBe(false);
  });
});

// ─── hasAllPermissions ────────────────────────────────────────────────────────

describe('hasAllPermissions', () => {
  it('returns true when the user holds every required permission', () => {
    expect(
      hasAllPermissions(['tasks.view', 'tasks.edit', 'tasks.delete'], ['tasks.view', 'tasks.edit'])
    ).toBe(true);
  });

  it('returns false when the user is missing even one required permission', () => {
    expect(hasAllPermissions(['tasks.view'], ['tasks.view', 'tasks.edit'])).toBe(false);
  });

  it('returns true for an empty required permissions array (vacuous truth)', () => {
    expect(hasAllPermissions([], [])).toBe(true);
  });

  it('returns false for an empty user permissions list with non-empty requirements', () => {
    expect(hasAllPermissions([], ['tasks.view'])).toBe(false);
  });
});

// ─── getPermissionsByCategory ─────────────────────────────────────────────────

describe('getPermissionsByCategory', () => {
  it('returns the correct permissions for a known category', () => {
    const perms = getPermissionsByCategory('tasks');
    expect(perms.length).toBeGreaterThan(0);
    expect(perms.every(p => p.category === 'tasks')).toBe(true);
  });

  it('returns an empty array for an unknown category', () => {
    expect(getPermissionsByCategory('nonexistent_category')).toEqual([]);
  });

  it('includes expected task permissions', () => {
    const perms = getPermissionsByCategory('tasks');
    const ids = perms.map(p => p.id);
    expect(ids).toContain('tasks.view');
    expect(ids).toContain('tasks.create');
    expect(ids).toContain('tasks.edit');
    expect(ids).toContain('tasks.delete');
  });
});

// ─── getPermissionById ────────────────────────────────────────────────────────

describe('getPermissionById', () => {
  it('returns the permission object for a valid id', () => {
    const perm = getPermissionById('projects.view');
    expect(perm).toBeDefined();
    expect(perm!.id).toBe('projects.view');
    expect(perm!.category).toBe('projects');
  });

  it('returns undefined for an unknown id', () => {
    expect(getPermissionById('does.not.exist')).toBeUndefined();
  });
});

// ─── ALL_PERMISSIONS / PERMISSIONS catalogue ──────────────────────────────────

describe('ALL_PERMISSIONS catalogue', () => {
  it('contains at least one permission per defined category', () => {
    for (const category of PERMISSIONS) {
      expect(category.permissions.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate permission ids', () => {
    const ids = ALL_PERMISSIONS.map(p => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every permission id follows the <category>.<action> convention', () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(perm.id).toMatch(/^[\w_]+\.[\w_]+$/);
    }
  });

  it('every permission has a non-empty name and description', () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(perm.name.length).toBeGreaterThan(0);
      expect(perm.description.length).toBeGreaterThan(0);
    }
  });
});

// ─── DEFAULT_ROLE_PERMISSIONS ─────────────────────────────────────────────────

describe('DEFAULT_ROLE_PERMISSIONS', () => {
  it('Admin role contains every permission in the catalogue', () => {
    const allIds = new Set(ALL_PERMISSIONS.map(p => p.id));
    const adminIds = new Set(DEFAULT_ROLE_PERMISSIONS.Admin);
    for (const id of allIds) {
      expect(adminIds.has(id), `Admin missing permission: ${id}`).toBe(true);
    }
  });

  it('Manager has more permissions than Engineer', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Manager.length).toBeGreaterThan(
      DEFAULT_ROLE_PERMISSIONS.Engineer.length
    );
  });

  it('Operator cannot manage projects (create/delete)', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Operator).not.toContain('projects.create');
    expect(DEFAULT_ROLE_PERMISSIONS.Operator).not.toContain('projects.delete');
  });

  it('Operator cannot access admin-level user management', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Operator).not.toContain('users.create');
    expect(DEFAULT_ROLE_PERMISSIONS.Operator).not.toContain('users.delete');
    expect(DEFAULT_ROLE_PERMISSIONS.Operator).not.toContain('users.manage_roles');
  });

  it('Engineer can view production dashboard but cannot delete parts', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Engineer).toContain('production.view_dashboard');
    expect(DEFAULT_ROLE_PERMISSIONS.Engineer).not.toContain('production.delete_parts');
  });

  it('all roles contain only valid permission ids', () => {
    const allIds = new Set(ALL_PERMISSIONS.map(p => p.id));
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const perm of perms) {
        expect(allIds.has(perm), `Role "${role}" references unknown permission: ${perm}`).toBe(true);
      }
    }
  });
});
