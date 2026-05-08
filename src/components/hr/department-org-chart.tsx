'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Building2, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DeptHierarchyNode } from '@/lib/employee-hierarchy';

type Props = {
  tree: DeptHierarchyNode[];
};

function DeptNode({ node, depth }: { node: DeptHierarchyNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const totalEmployees = node.employees.length;

  return (
    <div className="select-none">
      <div
        className={`flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow ${
          depth === 0 ? 'border-sky-200 bg-sky-50/50' : 'border-border'
        }`}
        style={{ marginLeft: depth * 24 }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((v: boolean) => !v)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <div className="p-1.5 rounded-md bg-sky-100 text-sky-700 shrink-0">
            <Building2 className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{node.name}</span>
              {node.children.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {node.children.length} sub-dept{node.children.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {totalEmployees > 0 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  {totalEmployees}
                </Badge>
              )}
            </div>
            {node.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{node.description}</p>
            )}
            {node.manager && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Manager: {node.manager.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {expanded && totalEmployees > 0 && (
        <div
          className="mt-1 mb-1 ml-6 pl-3 border-l-2 border-dashed border-slate-200"
          style={{ marginLeft: depth * 24 + 48 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 py-1">
            {node.employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs bg-slate-50 border border-slate-100"
              >
                <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{emp.fullNameEn}</div>
                  {emp.occupation && (
                    <div className="text-muted-foreground truncate">{emp.occupation}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && hasChildren && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <DeptNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DepartmentOrgChart({ tree }: Props) {
  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Building2 className="h-12 w-12 mb-3 opacity-30" />
        <p className="font-medium">No departments found</p>
        <p className="text-sm mt-1">Create departments in HR Setup to build the hierarchy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tree.map((node) => (
        <DeptNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
