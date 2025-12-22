'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Edit, CheckCircle, Trash2, Clock } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface KnowledgeEntry {
  id: string;
  type: string;
  title: string;
  summary: string;
  rootCause?: string;
  resolution?: string;
  recommendation?: string;
  severity: string;
  status: string;
  process: string;
  projectId?: string;
  tags?: string[];
  evidenceLinks?: any[];
  reportedBy: {
    id: string;
    name: string;
    email: string;
    position?: string;
  };
  owner?: {
    id: string;
    name: string;
  };
  validatedBy?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
    projectNumber: string;
  };
  createdAt: string;
  updatedAt: string;
  validatedAt?: string;
  applications?: any[];
}

export default function KnowledgeEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [entry, setEntry] = useState<KnowledgeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (params.id) {
      fetchEntry();
    }
  }, [params.id]);

  const fetchEntry = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/knowledge/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setEntry(data);
        setFormData({
          title: data.title,
          summary: data.summary,
          rootCause: data.rootCause || '',
          resolution: data.resolution || '',
          recommendation: data.recommendation || '',
          severity: data.severity,
          status: data.status,
          process: data.process,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load knowledge entry',
          variant: 'destructive',
        });
        router.push('/knowledge-center');
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to load knowledge entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/knowledge/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updated = await response.json();
        setEntry(updated);
        setEditing(false);
        toast({
          title: 'Success',
          description: 'Knowledge entry updated successfully',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update entry',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update knowledge entry',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/knowledge/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Validated' }),
      });

      if (response.ok) {
        const updated = await response.json();
        setEntry(updated);
        toast({
          title: 'Success',
          description: 'Knowledge entry validated successfully',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to validate entry',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate knowledge entry',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/knowledge/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Knowledge entry deleted successfully',
        });
        router.push('/knowledge-center');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete entry',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete knowledge entry',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!entry) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Validated': return 'bg-green-100 text-green-800';
      case 'PendingValidation': return 'bg-blue-100 text-blue-800';
      case 'InProgress': return 'bg-yellow-100 text-yellow-800';
      case 'Open': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{entry.type.replace('_', ' ')}</Badge>
              <Badge className={getStatusColor(entry.status)}>
                {entry.status === 'PendingValidation' ? 'Pending Validation' : entry.status}
              </Badge>
              {entry.status === 'Validated' && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            <h1 className="text-3xl font-bold">{entry.title}</h1>
          </div>
        </div>

        <div className="flex gap-2">
          {!editing && (
            <>
              {entry.status !== 'Validated' && (
                <Button onClick={handleValidate} disabled={saving}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Validate
                </Button>
              )}
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Knowledge Entry?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the knowledge entry.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entry Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Process</Label>
                  <Select
                    value={formData.process}
                    onValueChange={(value) => setFormData({ ...formData, process: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Detailing">Detailing</SelectItem>
                      <SelectItem value="Procurement">Procurement</SelectItem>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="QC">QC</SelectItem>
                      <SelectItem value="Erection">Erection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Root Cause</Label>
                <Textarea
                  value={formData.rootCause}
                  onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Resolution</Label>
                <Textarea
                  value={formData.resolution}
                  onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Recommendation</Label>
                <Textarea
                  value={formData.recommendation}
                  onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="PendingValidation">Pending Validation</SelectItem>
                    <SelectItem value="Validated">Validated</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-muted-foreground">Severity</Label>
                  <p className="font-medium">{entry.severity}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Process</Label>
                  <p className="font-medium">{entry.process}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Summary</Label>
                <p className="mt-1">{entry.summary}</p>
              </div>

              {entry.rootCause && (
                <div>
                  <Label className="text-muted-foreground">Root Cause</Label>
                  <p className="mt-1">{entry.rootCause}</p>
                </div>
              )}

              {entry.resolution && (
                <div>
                  <Label className="text-muted-foreground">Resolution</Label>
                  <p className="mt-1">{entry.resolution}</p>
                </div>
              )}

              {entry.recommendation && (
                <div>
                  <Label className="text-muted-foreground">Recommendation</Label>
                  <p className="mt-1">{entry.recommendation}</p>
                </div>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground">Reported By</Label>
              <p className="font-medium">{entry.reportedBy.name}</p>
              <p className="text-sm text-muted-foreground">{entry.reportedBy.position || entry.reportedBy.email}</p>
            </div>

            {entry.project && (
              <div>
                <Label className="text-muted-foreground">Project</Label>
                <p className="font-medium">{entry.project.projectNumber}</p>
                <p className="text-sm text-muted-foreground">{entry.project.name}</p>
              </div>
            )}

            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p className="font-medium">{new Date(entry.createdAt).toLocaleString()}</p>
            </div>

            <div>
              <Label className="text-muted-foreground">Last Updated</Label>
              <p className="font-medium">{new Date(entry.updatedAt).toLocaleString()}</p>
            </div>

            {entry.validatedBy && (
              <>
                <div>
                  <Label className="text-muted-foreground">Validated By</Label>
                  <p className="font-medium">{entry.validatedBy.name}</p>
                </div>
                {entry.validatedAt && (
                  <div>
                    <Label className="text-muted-foreground">Validated At</Label>
                    <p className="font-medium">{new Date(entry.validatedAt).toLocaleString()}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {entry.applications && entry.applications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              This knowledge has been applied {entry.applications.length} time(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entry.applications.map((app: any) => (
                <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{app.project.projectNumber} - {app.project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Applied by {app.appliedBy.name} on {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                    {app.outcomeNotes && (
                      <p className="text-sm mt-1">{app.outcomeNotes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
