import {describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/db',()=>({default:{}}));
import {
  withExecutiveSupplierReviewPermission,
  resolvePermissionsFromData,
  SUPPLIER_REVIEW_PERMISSION,
} from '@/lib/services/permission-resolution.service';
import {getPermissionById} from '@/lib/permissions';

const resolved=(role:string,revokes:string[]=[],restrictedModules:string[]=[])=>{
 const perms=withExecutiveSupplierReviewPermission(role,['supply_chain.view']);
 return resolvePermissionsFromData({
  isAdmin: false,
  rolePermissions: perms,
  customPermissions: {grants:[],revokes},
  restrictedModules,
 });
};

describe('Supplier Applications executive and RBAC access',()=>{
 it('defines the new permission in the canonical registry',()=>{
  expect(getPermissionById(SUPPLIER_REVIEW_PERMISSION)?.category).toBe('supply_chain');
 });
 it.each(['CEO','ceo','Admin','administrator'])('grants verified %s role supplier-review permission even with stale stored role JSON',(name)=>{
  expect(resolved(name)).toContain(SUPPLIER_REVIEW_PERMISSION);
 });
 it('administrators with isAdmin receive newly registered permissions',()=>{
  expect(resolvePermissionsFromData({isAdmin:true,rolePermissions:[],customPermissions:null,restrictedModules:[]})).toContain(SUPPLIER_REVIEW_PERMISSION);
 });
 it('does not grant unrelated view-only roles by default',()=>{
  expect(resolved('Procurement Viewer')).not.toContain(SUPPLIER_REVIEW_PERMISSION);
 });
 it('respects explicit per-user denial despite CEO role',()=>{
  expect(resolved('CEO',[SUPPLIER_REVIEW_PERMISSION])).not.toContain(SUPPLIER_REVIEW_PERMISSION);
 });
 it('keeps the new permission separate from read-only supply chain access',()=>{
  expect(withExecutiveSupplierReviewPermission('Procurement Manager',['supply_chain.view'])).toEqual(['supply_chain.view']);
 });
});
