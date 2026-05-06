'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SCOPE_COLORS: Record<string, string> = {
  steel: 'bg-blue-50 border-blue-200 text-blue-800',
  roof_sheeting: 'bg-orange-50 border-orange-200 text-orange-800',
  wall_sheeting: 'bg-amber-50 border-amber-200 text-amber-800',
  deck_panel: 'bg-purple-50 border-purple-200 text-purple-800',
  metal_work: 'bg-gray-50 border-gray-200 text-gray-800',
  other: 'bg-green-50 border-green-200 text-green-800',
};

const ralColors: Record<string, string> = {
  '9005': '#0E0E10', '9002': '#E8E4D9', '9001': '#FDF8EF', '9003': '#ECECE7',
  '7016': '#293133', '7035': '#D7D7D7', '6005': '#2F4538', '5010': '#0E294B',
  '3000': '#AF2B1E', '1003': '#E5BE01',
};

function getRalSwatch(ral: string): string {
  const clean = ral.replace(/[^0-9]/g, '');
  return ralColors[clean] || '#CCCCCC';
}

type ScopeOfWork = {
  id: string;
  scopeType: string;
  scopeLabel: string;
  customLabel?: string;
  quantity?: number;
  unit?: string;
  ralColor?: string;
  panelThickness?: number;
  ribHeight?: number;
  upperSheetThick?: number;
  lowerSheetThick?: number;
  panelProfile?: string;
  deckProfile?: string;
  hasShearStuds?: boolean;
  shearStudQty?: number;
  shearStudSpecs?: string;
  metalWorkItems?: { name: string; unit: string; quantity: number }[];
  building?: { id: string; name: string; designation: string; location?: string; weight?: number };
  activities?: { activityType: string; activityLabel: string; isApplicable: boolean }[];
};

type ProjectScopeSummaryProps = {
  project: {
    id: string;
    projectNumber: string;
    name: string;
    buildings?: { id: string; designation: string; name: string; location?: string; weight?: number; scopeOfWorks?: ScopeOfWork[] }[];
  };
  scopeOfWorks: ScopeOfWork[];
};

export function ProjectScopeSummary({ project, scopeOfWorks }: ProjectScopeSummaryProps) {
  const buildings = project.buildings || [];

  // Group scopes by building
  const scopesByBuilding: Record<string, ScopeOfWork[]> = {};
  for (const scope of scopeOfWorks) {
    const bId = scope.building?.id || 'unknown';
    if (!scopesByBuilding[bId]) scopesByBuilding[bId] = [];
    scopesByBuilding[bId].push(scope);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/projects/${project.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Project
          </Link>
          <h1 className="text-2xl font-bold">{project.projectNumber} — {project.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">Scope of Work Summary</p>
        </div>
        <Link href={`/projects/${project.id}/edit`}>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </Link>
      </div>

      {/* Summary table per building */}
      {buildings.length === 0 && scopeOfWorks.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No buildings or scope data found for this project.
          </CardContent>
        </Card>
      )}

      {buildings.map((building) => {
        const bScopes = building.scopeOfWorks || scopesByBuilding[building.id] || [];
        return (
          <Card key={building.id} className="overflow-hidden">
            <CardHeader className="bg-muted/40 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    <span className="text-primary font-mono">{building.designation}</span>
                    <span className="text-muted-foreground font-normal ml-2">— {building.name}</span>
                  </CardTitle>
                  {building.location && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {building.location}</p>
                  )}
                </div>
                {building.weight && (
                  <span className="text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                    {building.weight} ton (estimated)
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {bScopes.length === 0 ? (
                <div className="px-6 py-4 text-sm text-muted-foreground">No scope defined for this building.</div>
              ) : (
                <div className="divide-y">
                  {bScopes.map((scope) => (
                    <div key={scope.id} className="px-6 py-4 grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-4">
                      {/* Scope type badge */}
                      <div className="flex items-start">
                        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${SCOPE_COLORS[scope.scopeType] || SCOPE_COLORS.other}`}>
                          {scope.scopeLabel}
                          {scope.customLabel && ` — ${scope.customLabel}`}
                        </span>
                      </div>

                      {/* Specs */}
                      <div className="space-y-2">
                        {/* Quantity */}
                        {scope.quantity && (
                          <div className="text-sm font-medium">
                            <span className="text-2xl font-bold text-foreground">{scope.quantity}</span>
                            <span className="text-muted-foreground ml-1">
                              {scope.unit || (scope.scopeType === 'steel' ? 'ton' : 'm²')}
                            </span>
                          </div>
                        )}

                        {/* Sandwich panel specs */}
                        {(scope.scopeType === 'roof_sheeting' || scope.scopeType === 'wall_sheeting') && (
                          <div className="flex flex-wrap gap-3 text-xs">
                            {scope.ralColor && (
                              <div className="flex items-center gap-1.5 bg-background border rounded-md px-2 py-1">
                                <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: getRalSwatch(scope.ralColor) }} />
                                <span className="font-medium">RAL {scope.ralColor}</span>
                              </div>
                            )}
                            {scope.panelProfile && (
                              <div className="bg-background border rounded-md px-2 py-1">
                                Profile: <strong>{scope.panelProfile}</strong>
                              </div>
                            )}
                            {scope.panelThickness && (
                              <div className="bg-background border rounded-md px-2 py-1">
                                Panel: <strong>{scope.panelThickness}mm</strong>
                              </div>
                            )}
                            {scope.ribHeight && (
                              <div className="bg-background border rounded-md px-2 py-1">
                                Rib: <strong>{scope.ribHeight}mm</strong>
                              </div>
                            )}
                            {(scope.upperSheetThick || scope.lowerSheetThick) && (
                              <div className="bg-background border rounded-md px-2 py-1">
                                Sheets: <strong>{scope.upperSheetThick}mm / {scope.lowerSheetThick}mm</strong>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Deck panel specs */}
                        {scope.scopeType === 'deck_panel' && (
                          <div className="flex flex-wrap gap-3 text-xs">
                            {scope.deckProfile && (
                              <div className="bg-background border rounded-md px-2 py-1">
                                Profile: <strong>{scope.deckProfile}</strong>
                              </div>
                            )}
                            {scope.hasShearStuds && (
                              <div className="bg-background border rounded-md px-2 py-1">
                                Shear Studs: <strong>{scope.shearStudQty ?? '?'}</strong>
                                {scope.shearStudSpecs && <span className="text-muted-foreground ml-1">({scope.shearStudSpecs})</span>}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Metal works */}
                        {scope.scopeType === 'metal_work' && scope.metalWorkItems && scope.metalWorkItems.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {scope.metalWorkItems.map((item, i) => (
                              <div key={i} className="bg-background border rounded-md px-3 py-1.5 text-xs">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-muted-foreground">{item.quantity} {item.unit}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Activities */}
                      {scope.activities && scope.activities.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-muted-foreground mb-1">Activities</p>
                          <div className="flex flex-wrap gap-1">
                            {scope.activities.filter((a) => a.isApplicable).map((a) => (
                              <span key={a.activityType}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                {a.activityLabel}
                              </span>
                            ))}
                            {scope.activities.filter((a) => !a.isApplicable).map((a) => (
                              <span key={a.activityType}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground line-through">
                                {a.activityLabel}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Scopes without a known building (shouldn't happen, but just in case) */}
      {scopeOfWorks.filter((s) => !s.building || !buildings.find((b) => b.id === s.building?.id)).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Other Scopes (unlinked buildings)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {scopeOfWorks.filter((s) => !s.building).length} scope(s) without linked building data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
