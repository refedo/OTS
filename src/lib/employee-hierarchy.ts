import db from '@/lib/db';
import type { HierarchyNode } from '@/lib/hierarchy';

export type { HierarchyNode };

export type DeptHierarchyNode = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  manager: { id: string; name: string } | null;
  children: DeptHierarchyNode[];
  employees: { id: string; fullNameEn: string; occupation: string | null; reportsToId: string | null }[];
};

/**
 * Fetches all active employees in one query and builds a reporting hierarchy
 * tree in-memory. Roots are employees with no supervisor (reportsToId = null).
 * Maps employee fields to the shared HierarchyNode type so existing org chart
 * view components can render without modification.
 */
export async function buildEmployeeHierarchyTree(): Promise<HierarchyNode[]> {
  const employees = await db.employee.findMany({
    where: { deletedAt: null, status: { not: 'TERMINATED' } },
    select: {
      id: true,
      fullNameEn: true,
      employmentId: true,
      occupation: true,
      jobTitleEn: true,
      reportsToId: true,
      departmentRef: { select: { name: true } },
    },
    orderBy: { fullNameEn: 'asc' },
  });

  const nodeMap = new Map<string, HierarchyNode & { _childIds: string[] }>();

  for (const e of employees) {
    nodeMap.set(e.id, {
      id: e.id,
      name: e.fullNameEn,
      email: e.employmentId,
      position: e.occupation ?? e.jobTitleEn ?? null,
      role: { name: e.occupation ?? e.jobTitleEn ?? 'Employee' },
      department: e.departmentRef ? { name: e.departmentRef.name } : null,
      reportsToId: e.reportsToId,
      _childIds: [],
    });
  }

  const roots: string[] = [];
  for (const e of employees) {
    if (e.reportsToId && nodeMap.has(e.reportsToId)) {
      nodeMap.get(e.reportsToId)!._childIds.push(e.id);
    } else {
      roots.push(e.id);
    }
  }

  function buildSubtree(id: string): HierarchyNode {
    const node = nodeMap.get(id)!;
    const children = node._childIds.map(buildSubtree);
    const result: HierarchyNode = {
      id: node.id,
      name: node.name,
      email: node.email,
      position: node.position,
      role: node.role,
      department: node.department,
      reportsToId: node.reportsToId,
      _count: { subordinates: children.length },
    };
    if (children.length > 0) result.subordinates = children;
    return result;
  }

  return roots.map(buildSubtree);
}

/**
 * Fetches all departments and builds a parent-child tree in-memory.
 * Top-level nodes are departments with parentId = null.
 */
export async function buildDepartmentHierarchyTree(): Promise<DeptHierarchyNode[]> {
  const [depts, employees] = await Promise.all([
    db.department.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        manager: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    db.employee.findMany({
      where: { deletedAt: null, status: { not: 'TERMINATED' }, departmentId: { not: null } },
      select: {
        id: true,
        fullNameEn: true,
        occupation: true,
        reportsToId: true,
        departmentId: true,
      },
      orderBy: { fullNameEn: 'asc' },
    }),
  ]);

  const empsByDept = new Map<string, typeof employees>();
  for (const e of employees) {
    if (!e.departmentId) continue;
    if (!empsByDept.has(e.departmentId)) empsByDept.set(e.departmentId, []);
    empsByDept.get(e.departmentId)!.push(e);
  }

  const nodeMap = new Map<string, DeptHierarchyNode & { _childIds: string[] }>();
  for (const d of depts) {
    nodeMap.set(d.id, {
      id: d.id,
      name: d.name,
      description: d.description,
      parentId: d.parentId,
      manager: d.manager ?? null,
      children: [],
      employees: empsByDept.get(d.id) ?? [],
      _childIds: [],
    });
  }

  const roots: string[] = [];
  for (const d of depts) {
    if (d.parentId && nodeMap.has(d.parentId)) {
      nodeMap.get(d.parentId)!._childIds.push(d.id);
    } else {
      roots.push(d.id);
    }
  }

  function buildDeptSubtree(id: string): DeptHierarchyNode {
    const node = nodeMap.get(id)!;
    return {
      id: node.id,
      name: node.name,
      description: node.description,
      parentId: node.parentId,
      manager: node.manager,
      children: node._childIds.map(buildDeptSubtree),
      employees: node.employees,
    };
  }

  return roots.map(buildDeptSubtree);
}
