'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OperationTimeline } from './OperationTimeline';
import { AddEventDialog } from './AddEventDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Project {
  id: string;
  projectNumber: string;
  name: string;
}

interface Building {
  id: string;
  designation: string;
  name: string;
}

interface OperationTimelineClientProps {
  projectId: string;
  project: Project;
  buildings: Building[];
  canEdit: boolean;
  userRole: string;
}

export function OperationTimelineClient({
  projectId,
  project,
  buildings,
  canEdit,
  userRole,
}: OperationTimelineClientProps) {
  const router = useRouter();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    fetchTimeline();
  }, [projectId, selectedBuilding]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const url =
        selectedBuilding === 'all'
          ? `/api/operations/${projectId}/timeline`
          : `/api/operations/${projectId}/timeline?buildingId=${selectedBuilding}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTimeline(data.timeline);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventAdded = () => {
    setShowAddDialog(false);
    fetchTimeline();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${projectId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Operations Timeline</h1>
            <p className="text-sm text-gray-600">
              {project.projectNumber} - {project.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Building</label>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings (Project Level)</SelectItem>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.designation} - {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">View Mode</label>
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                  <SelectItem value="vertical">Vertical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
          <CardDescription>
            Track all operational milestones from design to erection completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : timeline.length > 0 ? (
            <OperationTimeline timeline={timeline} mode={viewMode} showDetails={true} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No timeline data available yet.</p>
              <p className="text-sm mt-2">
                Events will be automatically captured as the project progresses.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Event Dialog */}
      {showAddDialog && (
        <AddEventDialog
          projectId={projectId}
          buildings={buildings}
          onClose={() => setShowAddDialog(false)}
          onSuccess={handleEventAdded}
        />
      )}
    </div>
  );
}
