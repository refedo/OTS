'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { BuildingDialog } from './building-dialog';

type Building = {
  id: string;
  designation: string;
  name: string;
  description: string | null;
};

type BuildingsListProps = {
  projectId: string;
  buildings: Building[];
  canEdit: boolean;
};

export function BuildingsList({ projectId, buildings: initialBuildings, canEdit }: BuildingsListProps) {
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingBuilding(null);
    setDialogOpen(true);
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    setDialogOpen(true);
  };

  const handleDelete = async (buildingId: string) => {
    if (!confirm('Are you sure you want to delete this building?')) return;

    setDeleting(buildingId);
    try {
      const response = await fetch(`/api/projects/${projectId}/buildings/${buildingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete building');

      setBuildings(buildings.filter(b => b.id !== buildingId));
    } catch (error) {
      alert('Failed to delete building');
    } finally {
      setDeleting(null);
    }
  };

  const handleSaved = (building: Building) => {
    if (editingBuilding) {
      // Update existing
      setBuildings(buildings.map(b => b.id === building.id ? building : b));
    } else {
      // Add new
      setBuildings([...buildings, building]);
    }
    setDialogOpen(false);
    setEditingBuilding(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" />
                Buildings
              </CardTitle>
              <CardDescription>
                Manage structures and buildings for this project
              </CardDescription>
            </div>
            {canEdit && (
              <Button onClick={handleAdd} size="sm">
                <Plus className="size-4 mr-1" />
                Add Building
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {buildings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="size-12 mx-auto mb-2 opacity-20" />
              <p>No buildings added yet</p>
              {canEdit && (
                <Button onClick={handleAdd} variant="outline" size="sm" className="mt-4">
                  <Plus className="size-4 mr-1" />
                  Add First Building
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {buildings.map((building) => (
                <Card key={building.id} className="relative">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">{building.designation}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{building.name}</h4>
                          {building.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {building.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(building)}
                          className="flex-1"
                        >
                          <Pencil className="size-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(building.id)}
                          disabled={deleting === building.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <BuildingDialog
          projectId={projectId}
          building={editingBuilding}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
