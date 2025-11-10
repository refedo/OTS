'use client';

import { Badge } from '@/components/ui/badge';
import { User, ChevronRight, ChevronDown, Briefcase, Building2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type HierarchyNode = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: { name: string };
  department: { name: string } | null;
  reportsToId: string | null;
  subordinates?: HierarchyNode[];
  _count?: { subordinates: number };
};

type ListViewProps = {
  hierarchy: HierarchyNode[];
};

function ListNode({ node, level = 0 }: { node: HierarchyNode; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasSubordinates = node.subordinates && node.subordinates.length > 0;

  return (
    <div>
      {/* Node Row */}
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border-b",
          level > 0 && "ml-6"
        )}
        onClick={() => hasSubordinates && setIsExpanded(!isExpanded)}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        {/* Expand/Collapse Icon */}
        <div className="size-5 flex items-center justify-center shrink-0">
          {hasSubordinates ? (
            isExpanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )
          ) : (
            <div className="size-1 rounded-full bg-muted-foreground/30" />
          )}
        </div>

        {/* Avatar */}
        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="size-4 text-primary" />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-medium">{node.name}</span>
            {node.position && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Briefcase className="size-3" />
                {node.position}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {node.role.name}
            </Badge>
            {node.department && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Building2 className="size-3" />
                {node.department.name}
              </Badge>
            )}
            {hasSubordinates && (
              <Badge variant="outline" className="text-xs">
                {node.subordinates!.length} direct report{node.subordinates!.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="hidden md:block text-sm text-muted-foreground">
          {node.email}
        </div>
      </div>

      {/* Subordinates */}
      {hasSubordinates && isExpanded && (
        <div>
          {node.subordinates!.map((subordinate) => (
            <ListNode key={subordinate.id} node={subordinate} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgChartListView({ hierarchy }: ListViewProps) {
  if (hierarchy.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">
          No organization structure found. Start by creating users and assigning reporting relationships.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      {hierarchy.map((node) => (
        <ListNode key={node.id} node={node} />
      ))}
    </div>
  );
}
