'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Building2, Layers, Activity } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BuildingScopesViewProps {
  buildings: Array<{ id: string; name: string; designation: string; weight?: number }>;
  scopeOfWorks: Array<{
    id: string;
    buildingId: string;
    scopeType: string;
    scopeLabel: string;
    customLabel?: string;
    specification?: string;
    activities: Array<{
      id: string;
      activityType: string;
      activityLabel: string;
      isApplicable: boolean;
    }>;
  }>;
  buildingActivities: Array<{
    id: string;
    buildingId: string;
    scopeOfWorkId: string;
    activityType: string;
    activityLabel: string;
    isApplicable: boolean;
  }>;
  projectId: string;
  canEdit: boolean;
}

export function BuildingScopesView({
  buildings,
  scopeOfWorks,
  buildingActivities,
  projectId,
  canEdit,
}: BuildingScopesViewProps) {
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(
    new Set(buildings.map((b) => b.id))
  );

  const toggleBuilding = (buildingId: string) => {
    setExpandedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
      }
      return next;
    });
  };

  const getScopesForBuilding = (buildingId: string) => {
    return scopeOfWorks.filter((s) => s.buildingId === buildingId);
  };

  const getActivitiesForScope = (scopeId: string, buildingId: string) => {
    const scopeWork = scopeOfWorks.find((s) => s.id === scopeId);
    if (scopeWork?.activities && scopeWork.activities.length > 0) {
      return scopeWork.activities;
    }
    return buildingActivities.filter(
      (a) => a.scopeOfWorkId === scopeId && a.buildingId === buildingId
    );
  };

  if (buildings.length === 0 && scopeOfWorks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-5" />
              Scope of Work &amp; Activities
            </CardTitle>
            <CardDescription>
              Scope items and activity assignments for each building
            </CardDescription>
          </div>
          {canEdit && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/projects/wizard?resume=${projectId}`}>
                Edit Scopes
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {buildings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="size-12 mx-auto mb-2 opacity-20" />
            <p>No buildings configured yet</p>
          </div>
        ) : (
          buildings.map((building) => {
            const scopes = getScopesForBuilding(building.id);
            const isExpanded = expandedBuildings.has(building.id);

            return (
              <div
                key={building.id}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleBuilding(building.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {building.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {building.designation}
                      </Badge>
                      {building.weight != null && building.weight > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {building.weight} tons
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {scopes.length} scope{scopes.length !== 1 ? 's' : ''}
                  </Badge>
                </button>

                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    {scopes.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No scope of work items defined for this building
                      </div>
                    ) : (
                      <div className="divide-y">
                        {scopes.map((scope) => {
                          const activities = getActivitiesForScope(
                            scope.id,
                            building.id
                          );
                          const label =
                            scope.customLabel || scope.scopeLabel;

                          return (
                            <div key={scope.id} className="p-4 pl-14">
                              <div className="flex items-center gap-2 mb-2">
                                <Layers className="size-4 text-muted-foreground shrink-0" />
                                <span className="font-medium">{label}</span>
                                {scope.scopeType === 'DEFAULT' && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-muted-foreground"
                                  >
                                    Default
                                  </Badge>
                                )}
                              </div>

                              {scope.specification && (
                                <p className="text-sm text-muted-foreground mb-3 ml-6 line-clamp-2">
                                  {scope.specification}
                                </p>
                              )}

                              {activities.length > 0 && (
                                <div className="ml-6 flex flex-wrap gap-1.5">
                                  {activities.map((activity) => (
                                    <Badge
                                      key={activity.id}
                                      variant={
                                        activity.isApplicable
                                          ? 'default'
                                          : 'secondary'
                                      }
                                      className={cn(
                                        'text-xs font-normal',
                                        activity.isApplicable
                                          ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200'
                                          : 'bg-gray-100 text-gray-400 hover:bg-gray-100 border-gray-200 line-through'
                                      )}
                                    >
                                      <Activity className="size-3 mr-1" />
                                      {activity.activityLabel}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
