'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

type HierarchyNode = {
  id: string;
  name: string;
  email: string;
  role: { name: string };
  department: { name: string } | null;
  position: string | null;
  reportsToId: string | null;
  subordinates?: HierarchyNode[];
};

type FlowchartViewProps = {
  hierarchy: HierarchyNode[];
};

function OrgNode({ node, isRoot = false }: { node: HierarchyNode; isRoot?: boolean }) {
  const hasSubordinates = node.subordinates && node.subordinates.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <Card className={`${isRoot ? 'bg-blue-600 text-white border-blue-700' : 'bg-blue-500 text-white border-blue-600'} min-w-[200px] shadow-lg`}>
        <CardContent className="p-4 text-center">
          <h3 className="font-bold text-lg mb-1">{node.name}</h3>
          <p className="text-sm opacity-90">{node.position || node.role.name}</p>
        </CardContent>
      </Card>

      {/* Connector Line Down */}
      {hasSubordinates && (
        <div className="w-0.5 h-8 bg-gray-400"></div>
      )}

      {/* Subordinates Container */}
      {hasSubordinates && (
        <div className="relative">
          {/* Horizontal Line */}
          {node.subordinates!.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-400" style={{ 
              left: '50%',
              right: '50%',
              width: `${(node.subordinates!.length - 1) * 280}px`,
              marginLeft: `-${((node.subordinates!.length - 1) * 280) / 2}px`
            }}></div>
          )}

          {/* Subordinates Grid */}
          <div className="flex gap-8 pt-8">
            {node.subordinates!.map((subordinate, index) => (
              <div key={subordinate.id} className="relative flex flex-col items-center">
                {/* Vertical connector to horizontal line */}
                <div className="absolute -top-8 w-0.5 h-8 bg-gray-400"></div>
                
                <OrgNode node={subordinate} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgChartFlowchartView({ hierarchy }: FlowchartViewProps) {
  if (hierarchy.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hierarchy data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-8">
      <div className="inline-block min-w-full">
        <div className="flex justify-center p-8">
          {hierarchy.map((root) => (
            <OrgNode key={root.id} node={root} isRoot />
          ))}
        </div>
      </div>
    </div>
  );
}
