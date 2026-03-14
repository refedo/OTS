'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Filter, Building2, FolderKanban, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { AddEventDialogWithProject } from '@/components/operations/AddEventDialogWithProject';

type Project = {
  id: string;
  projectNumber: string;
  name: string;
};

type Building = {
  id: string;
  designation: string;
  name: string;
  projectId: string;
};

type OperationEvent = {
  id: string;
  projectId: string;
  buildingId: string | null;
  stage: string;
  eventDate: string;
  status: string;
  description: string | null;
  project: {
    projectNumber: string;
    name: string;
  };
  building: {
    designation: string;
    name: string;
  } | null;
  stageConfig: {
    stageName: string;
  };
};

const STATUS_OPTIONS = ['Completed', 'Pending', 'In Progress', 'Delayed'];

export default function EventManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<OperationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [showDialog, setShowDialog] = useState(false);

  // Filter state
  const [filterProject, setFilterProject] = useState('__all__');
  const [filterStatus, setFilterStatus] = useState('__all__');

  useEffect(() => {
    fetchProjects();
    fetchEvents();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/operations/events/all');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    setShowDialog(false);
  };

  const handleEventCreated = () => {
    console.log('Event created successfully, refreshing list...');
    fetchEvents();
    handleDialogClose();
  };

  const filteredEvents = events.filter((event) => {
    if (filterProject && filterProject !== '__all__' && event.projectId !== filterProject) return false;
    if (filterStatus && filterStatus !== '__all__' && event.status !== filterStatus) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Delayed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage operational events across all projects
          </p>
        </div>
      </div>

      {/* Quick Add Section */}
      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Events ({filteredEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading events...</p>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No events found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Select a project above to create your first event
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {event.project.projectNumber} - {event.project.name}
                      </span>
                      {event.building && (
                        <>
                          <Building2 className="h-4 w-4 text-muted-foreground ml-2" />
                          <span className="text-sm text-muted-foreground">
                            {event.building.designation} - {event.building.name}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <span className="font-medium">{event.stageConfig.stageName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(event.eventDate).toLocaleDateString('en-GB')}</span>
                      </div>
                      <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Event Dialog */}
      {showDialog && (
        <AddEventDialogWithProject
          onClose={handleDialogClose}
          onSuccess={handleEventCreated}
        />
      )}
    </div>
  );
}
