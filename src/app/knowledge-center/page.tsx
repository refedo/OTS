'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, BookOpen, AlertTriangle, CheckCircle, Lightbulb, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
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

interface KnowledgeEntry {
  id: string;
  type: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  process: string;
  createdAt: string;
  reportedBy: {
    name: string;
  };
  project?: {
    id: string;
    name: string;
    projectNumber: string;
  };
}

interface Project {
  id: string;
  name: string;
  projectNumber: string;
}

export default function KnowledgeCenterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [processFilter, setProcessFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [typeFilter, statusFilter, processFilter, severityFilter, projectFilter, search]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (processFilter) params.append('process', processFilter);
      if (projectFilter) params.append('projectId', projectFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (search) params.append('search', search);

      const response = await fetch(`/api/knowledge?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CHALLENGE': return <AlertTriangle className="h-4 w-4" />;
      case 'ISSUE': return <AlertTriangle className="h-4 w-4" />;
      case 'LESSON': return <BookOpen className="h-4 w-4" />;
      case 'BEST_PRACTICE': return <Lightbulb className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CHALLENGE': return 'bg-orange-100 text-orange-800';
      case 'ISSUE': return 'bg-red-100 text-red-800';
      case 'LESSON': return 'bg-blue-100 text-blue-800';
      case 'BEST_PRACTICE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Validated': return 'bg-green-100 text-green-800';
      case 'PendingValidation': return 'bg-blue-100 text-blue-800';
      case 'InProgress': return 'bg-yellow-100 text-yellow-800';
      case 'Open': return 'bg-gray-100 text-gray-800';
      case 'Archived': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === entries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(entries.map(e => e.id));
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const deletePromises = selectedIds.map(id => 
        fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;
      
      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `Deleted ${successCount} knowledge ${successCount === 1 ? 'entry' : 'entries'}`,
        });
        setSelectedIds([]);
        fetchEntries();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete entries',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete entries',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Center</h1>
          <p className="text-muted-foreground">
            Operational memory and intelligence spine for OTS
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => router.push('/knowledge-center/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, summary, or resolution..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={typeFilter || 'all'} onValueChange={(value) => setTypeFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CHALLENGE">Challenge</SelectItem>
                <SelectItem value="ISSUE">Issue</SelectItem>
                <SelectItem value="LESSON">Lesson</SelectItem>
                <SelectItem value="BEST_PRACTICE">Best Practice</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
                <SelectItem value="PendingValidation">Pending Validation</SelectItem>
                <SelectItem value="Validated">Validated</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={processFilter || 'all'} onValueChange={(value) => setProcessFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Processes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processes</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Detailing">Detailing</SelectItem>
                <SelectItem value="Procurement">Procurement</SelectItem>
                <SelectItem value="Production">Production</SelectItem>
                <SelectItem value="QC">QC</SelectItem>
                <SelectItem value="Erection">Erection</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter || 'all'} onValueChange={(value) => setSeverityFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter || 'all'} onValueChange={(value) => setProjectFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.projectNumber} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading knowledge entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No knowledge entries found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/knowledge-center/new')}
            >
              Create First Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.length > 0 && (
            <div className="flex items-center gap-2 px-2">
              <Checkbox
                checked={selectedIds.length === entries.length && entries.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
              </span>
            </div>
          )}
          <div className="grid gap-4">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(entry.id)}
                        onCheckedChange={() => toggleSelection(entry.id)}
                      />
                    </div>
                    <div 
                      className="flex-1 space-y-2 cursor-pointer"
                      onClick={() => router.push(`/knowledge-center/${entry.id}`)}
                    >
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(entry.type)}>
                        <span className="flex items-center gap-1">
                          {getTypeIcon(entry.type)}
                          {entry.type.replace('_', ' ')}
                        </span>
                      </Badge>
                      <Badge className={getSeverityColor(entry.severity)}>
                        {entry.severity}
                      </Badge>
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status === 'PendingValidation' ? 'Pending Validation' : entry.status}
                      </Badge>
                      <Badge variant="outline">{entry.process}</Badge>
                    </div>

                    <h3 className="text-lg font-semibold">{entry.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.summary}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Reported by {entry.reportedBy.name}</span>
                      {entry.project && (
                        <span>
                          Project: {entry.project.projectNumber} - {entry.project.name}
                        </span>
                      )}
                      <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                    </div>

                    {entry.status === 'Validated' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Entries?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} knowledge {selectedIds.length === 1 ? 'entry' : 'entries'}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
