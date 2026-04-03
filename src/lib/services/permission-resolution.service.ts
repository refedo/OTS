/**
 * Permission Resolution Service
 * 
 * Resolves effective permissions for a user using the hybrid model:
 * Final Permissions = (Role Permissions) + (User Grants) - (User Revokes) - (Module Restrictions)
 * 
 * customPermissions JSON structure on User:
 * {
 *   "grants": ["financial.view", "production.export_reports"],
 *   "revokes": ["users.delete", "roles.delete"]
 * }
 */

import prisma from '@/lib/db';
import { filterPermissionsByModules } from '@/lib/module-restrictions';
import { logger } from '@/lib/logger';

export interface CustomPermissions {
  grants?: string[];
  revokes?: string[];
}

export interface PermissionResolutionData {
  isAdmin: boolean;
  rolePermissions: string[];
  customPermissions: CustomPermissions | null;
  restrictedModules: string[];
}

/**
 * Pure function: resolves effective permissions from data (works client-side)
 *
 * Resolution order:
 * 1. Start with rolePermissions (same for admin and non-admin)
 * 2. Add customPermissions.grants
 * 4. Remove customPermissions.revokes  ← applied even for isAdmin (PBAC overrides RBAC)
 * 5. Apply restrictedModules filter     ← applied even for isAdmin
 * 6. Return deduplicated array
 */
export function resolvePermissionsFromData(params: PermissionResolutionData): string[] {
  const { isAdmin, rolePermissions, customPermissions, restrictedModules } = params;

  // All users (including admins) use role permissions as their base.
  // isAdmin controls UI management capabilities, not permission bypass.
  let permissions = [...rolePermissions];

  if (customPermissions) {
    const grants = Array.isArray(customPermissions.grants) ? customPermissions.grants : [];
    const revokes = new Set(Array.isArray(customPermissions.revokes) ? customPermissions.revokes : []);

    // Add grants
    for (const grant of grants) {
      if (!permissions.includes(grant)) {
        permissions.push(grant);
      }
    }

    // Remove revokes
    if (revokes.size > 0) {
      permissions = permissions.filter(p => !revokes.has(p));
    }
  }

  // Apply module restrictions
  if (restrictedModules.length > 0) {
    permissions = filterPermissionsByModules(permissions, restrictedModules);
  }

  // Deduplicate
  return [...new Set(permissions)];
}

/**
 * Parse the customPermissions JSON from User model into typed structure.
 * Handles both legacy format (string[]) and new format ({ grants, revokes }).
 */
export function parseCustomPermissions(raw: unknown): CustomPermissions | null {
  if (!raw) return null;

  // New format: { grants: [...], revokes: [...] }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      grants: Array.isArray(obj.grants) ? obj.grants.filter((g): g is string => typeof g === 'string') : [],
      revokes: Array.isArray(obj.revokes) ? obj.revokes.filter((r): r is string => typeof r === 'string') : [],
    };
  }

  // Legacy format: string[] treated as grants only
  if (Array.isArray(raw)) {
    const grants = raw.filter((g): g is string => typeof g === 'string');
    return grants.length > 0 ? { grants, revokes: [] } : null;
  }

  return null;
}

/**
 * Server-side: resolves effective permissions for a user by ID.
 * Fetches user + role from DB, then delegates to pure function.
 */
export async function resolveUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || !user.role) {
    logger.warn({ userId }, '[PBAC] User or role not found');
    return [];
  }

  const rolePermissions = (user.role.permissions as string[]) || [];
  const customPerms = parseCustomPermissions(user.customPermissions);
  const restrictedModules = (user.role.restrictedModules as string[]) || [];

  // isAdmin starts with ALL permissions but PBAC revokes + module restrictions still apply
  const resolved = resolvePermissionsFromData({
    isAdmin: user.isAdmin,
    rolePermissions,
    customPermissions: customPerms,
    restrictedModules,
  });

  logger.debug({
    userId,
    userName: user.name,
    roleName: user.role.name,
    isAdmin: user.isAdmin,
    rolePermCount: user.isAdmin ? 'all' : rolePermissions.length,
    grants: customPerms?.grants?.length ?? 0,
    revokes: customPerms?.revokes?.length ?? 0,
    restrictedModules,
    resolvedCount: resolved.length,
  }, '[PBAC] Resolved user permissions');

  return resolved;
}
