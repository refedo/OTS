'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Plus, Edit, Trash2, Users, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type ProcessingTeam = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
};

type ProcessingLocation = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
};

export default function ProductionSettingsPage() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<ProcessingTeam[]>([]);
  const [locations, setLocations] = useState<ProcessingLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Team dialog state
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ProcessingTeam | null>(null);
  const [teamForm, setTeamForm] = useState<{ name: string; description: string; isActive: boolean; isDefault: boolean }>({ name: '', description: '', isActive: true, isDefault: false });

  // Location dialog state
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ProcessingLocation | null>(null);
  const [locationForm, setLocationForm] = useState<{ name: string; description: string; isActive: boolean; isDefault: boolean }>({ name: '', description: '', isActive: true, isDefault: false });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'team' | 'location'; id: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, locationsRes] = await Promise.all([
        fetch('/api/settings/production/teams'),
        fetch('/api/settings/production/locations'),
      ]);

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setLocations(locationsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Team handlers
  const openTeamDialog = (team?: ProcessingTeam) => {
    if (team) {
      setEditingTeam(team);
      setTeamForm({ 
        name: team.name, 
        description: team.description || '', 
        isActive: team.isActive ?? true, 
        isDefault: team.isDefault ?? false 
      });
    } else {
      setEditingTeam(null);
      setTeamForm({ name: '', description: '', isActive: true, isDefault: false });
    }
    setShowTeamDialog(true);
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = '/api/settings/production/teams';
      const method = editingTeam ? 'PUT' : 'POST';
      const body = editingTeam ? { id: editingTeam.id, ...teamForm } : teamForm;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to save team');
      }

      toast({
        title: 'Success',
        description: `Team ${editingTeam ? 'updated' : 'created'} successfully`,
      });

      setShowTeamDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error saving team:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save team',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTeam = async (id: string) => {
    try {
      const response = await fetch(`/api/settings/production/teams?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete team');
      }

      toast({
        title: 'Success',
        description: 'Team deleted successfully',
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive',
      });
    }
  };

  // Location handlers
  const openLocationDialog = (location?: ProcessingLocation) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm({ 
        name: location.name, 
        description: location.description || '', 
        isActive: location.isActive ?? true, 
        isDefault: location.isDefault ?? false 
      });
    } else {
      setEditingLocation(null);
      setLocationForm({ name: '', description: '', isActive: true, isDefault: false });
    }
    setShowLocationDialog(true);
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = '/api/settings/production/locations';
      const method = editingLocation ? 'PUT' : 'POST';
      const body = editingLocation ? { id: editingLocation.id, ...locationForm } : locationForm;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to save location');
      }

      toast({
        title: 'Success',
        description: `Location ${editingLocation ? 'updated' : 'created'} successfully`,
      });

      setShowLocationDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save location',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const response = await fetch(`/api/settings/production/locations?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete location',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8" />
          Production Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage processing teams and locations for production logging
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Processing Teams */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Processing Teams
              </CardTitle>
              <Button onClick={() => openTeamDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Team
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No teams configured
                </p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 ${
                      team.isDefault ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{team.name}</span>
                        {team.isDefault && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      {team.description && (
                        <div className="text-sm text-muted-foreground">{team.description}</div>
                      )}
                      {!team.isActive && (
                        <span className="text-xs text-red-500">Inactive</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTeamDialog(team)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm({ type: 'team', id: team.id })}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Processing Locations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Processing Locations
              </CardTitle>
              <Button onClick={() => openLocationDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No locations configured
                </p>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 ${
                      location.isDefault ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{location.name}</span>
                        {location.isDefault && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      {location.description && (
                        <div className="text-sm text-muted-foreground">{location.description}</div>
                      )}
                      {!location.isActive && (
                        <span className="text-xs text-red-500">Inactive</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLocationDialog(location)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm({ type: 'location', id: location.id })}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit' : 'Add'} Processing Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTeamSubmit} className="space-y-4">
            <div>
              <Label htmlFor="team-name">Team Name *</Label>
              <Input
                id="team-name"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                placeholder="e.g., Team A, Shift 1"
                required
              />
            </div>
            <div>
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="team-active"
                  checked={teamForm.isActive}
                  onChange={(e) => setTeamForm({ ...teamForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="team-active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="team-default"
                  checked={teamForm.isDefault}
                  onChange={(e) => setTeamForm({ ...teamForm, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="team-default">Set as Default</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTeamDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTeam ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit' : 'Add'} Processing Location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLocationSubmit} className="space-y-4">
            <div>
              <Label htmlFor="location-name">Location Name *</Label>
              <Input
                id="location-name"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                placeholder="e.g., Workshop A, Bay 3"
                required
              />
            </div>
            <div>
              <Label htmlFor="location-description">Description</Label>
              <Textarea
                id="location-description"
                value={locationForm.description}
                onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="location-active"
                  checked={locationForm.isActive}
                  onChange={(e) => setLocationForm({ ...locationForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="location-active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="location-default"
                  checked={locationForm.isDefault}
                  onChange={(e) => setLocationForm({ ...locationForm, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="location-default">Set as Default</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLocationDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingLocation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deleteConfirm?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  if (deleteConfirm.type === 'team') {
                    handleDeleteTeam(deleteConfirm.id);
                  } else {
                    handleDeleteLocation(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
