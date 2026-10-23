import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRequiredPermissionsForPath, hasAccessToRoute } from '@/lib/navigation-permissions';
import { getPermissionById } from '@/lib/permissions';

const route = '/supply-chain/supplier-applications';
describe('Supply Chain supplier applications navigation', () => {
  it('shows entry only to authorized managers', () => {
    expect(hasAccessToRoute(['supply_chain.manage'], route)).toBe(true);
    expect(hasAccessToRoute(['supply_chain.view'], route)).toBe(false);
    expect(getRequiredPermissionsForPath(route)).toEqual(['supply_chain.manage']);
    expect(getPermissionById('supply_chain.manage')?.category).toBe('supply_chain');
  });
  it('has a navigable sidebar entry', () => {
    const sidebar=readFileSync(join(process.cwd(), 'src/components/app-sidebar.tsx'),'utf8');
    expect(sidebar).toContain("name: 'Supplier Applications', href: '/supply-chain/supplier-applications'");
  });
});
