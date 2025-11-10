'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Building2, Briefcase } from 'lucide-react';
import { useState } from 'react';

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

type TreeViewProps = {
  hierarchy: HierarchyNode[];
};

function TreeNode({ node, isLast = false, prefix = '' }: { 
  node: HierarchyNode; 
  isLast?: boolean;
  prefix?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubordinates = node.subordinates && node.subordinates.length > 0;

  return (
    <div className="relative">
      {/* Node */}
      <div className="flex items-start gap-3 mb-4">
        {/* Tree Lines */}
        <div className="flex-shrink-0 w-8 relative">
          {prefix && (
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-6 left-4 w-4 h-px bg-border" />
              {!isLast && <div className="absolute top-0 left-4 w-px h-full bg-border" />}
            </div>
          )}
        </div>

        {/* Card */}
        <Card className="flex-1 hover:shadow-md transition-all cursor-pointer" onClick={() => hasSubordinates && setIsExpanded(!isExpanded)}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="size-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border-2 border-primary/20">
                <User className="size-6 text-primary" />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-base">{node.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {node.role.name}
                  </Badge>
                  {hasSubordinates && (
                    <Badge variant="outline" className="text-xs">
                      {node.subordinates!.length} report{node.subordinates!.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  {node.position && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="size-3" />
                      <span className="font-medium text-foreground">{node.position}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="size-3" />
                    <span className="truncate">{node.email}</span>
                  </div>
                  {node.department && (
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3" />
                      <span>{node.department.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subordinates */}
      {hasSubordinates && isExpanded && (
        <div className="ml-8">
          {node.subordinates!.map((subordinate, index) => (
            <TreeNode
              key={subordinate.id}
              node={subordinate}
              isLast={index === node.subordinates!.length - 1}
              prefix={prefix + (isLast ? '  ' : '│ ')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgChartTreeView({ hierarchy }: TreeViewProps) {
  if (hierarchy.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No organization structure found. Start by creating users and assigning reporting relationships.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {hierarchy.map((node, index) => (
        <TreeNode key={node.id} node={node} isLast={index === hierarchy.length - 1} />
      ))}
    </div>
  );
}
