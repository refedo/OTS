'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  projectNumber: string;
}

export default function NewKnowledgeEntryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    type: 'CHALLENGE',
    title: '',
    summary: '',
    rootCause: '',
    resolution: '',
    recommendation: '',
    severity: 'Medium',
    process: 'Production',
    projectId: '',
    tags: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload attachments first if any
      let uploadedFiles: any[] = [];
      if (attachments.length > 0) {
        setUploading(true);
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder', 'knowledge-center');

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedFiles.push({
              fileName: file.name,
              filePath: uploadData.filePath,
              uploadedAt: new Date().toISOString(),
            });
          }
        }
        setUploading(false);
      }

      const payload = {
        ...formData,
        projectId: formData.projectId || null,
        rootCause: formData.rootCause || null,
        resolution: formData.resolution || null,
        recommendation: formData.recommendation || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        attachments: uploadedFiles.length > 0 ? uploadedFiles : null,
      };

      console.log('Submitting knowledge entry:', payload);

      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const entry = await response.json();
        toast({
          title: 'Success',
          description: 'Knowledge entry created successfully',
        });
        router.push(`/knowledge-center/${entry.id}`);
      } else {
        const error = await response.json();
        console.error('API Error:', error);
        toast({
          title: 'Error',
          description: error.message || error.error || 'Failed to create entry',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create knowledge entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Knowledge Entry</h1>
          <p className="text-muted-foreground">
            Log a challenge, issue, lesson, or best practice
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Entry Details</CardTitle>
            <CardDescription>
              Minimum required fields: Type, Title, Process, Severity, and Summary
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHALLENGE">Challenge (Active Problem)</SelectItem>
                    <SelectItem value="ISSUE">Issue (Resolved Problem)</SelectItem>
                    <SelectItem value="LESSON">Lesson Learned</SelectItem>
                    <SelectItem value="BEST_PRACTICE">Best Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger id="severity">
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
                <Label htmlFor="process">Process *</Label>
                <Select
                  value={formData.process}
                  onValueChange={(value) => setFormData({ ...formData, process: value })}
                >
                  <SelectTrigger id="process">
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

              <div className="space-y-2">
                <Label htmlFor="projectId">Project (Optional)</Label>
                <Select
                  value={formData.projectId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, projectId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger id="projectId">
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Brief descriptive title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                minLength={2}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 2 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary *</Label>
              <Textarea
                id="summary"
                placeholder="Short structured description of the challenge, issue, or lesson"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={4}
                required
                minLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters ({formData.summary.length}/10)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rootCause">Root Cause (Optional)</Label>
              <Textarea
                id="rootCause"
                placeholder="What caused this issue or challenge?"
                value={formData.rootCause}
                onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution (Optional)</Label>
              <Textarea
                id="resolution"
                placeholder="How was this resolved or addressed?"
                value={formData.resolution}
                onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendation">Recommendation (Optional)</Label>
              <Textarea
                id="recommendation"
                placeholder="What should be done in the future to prevent or address this?"
                value={formData.recommendation}
                onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input
                id="tags"
                placeholder="Comma-separated tags (e.g., welding, delay, material)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Tags help categorize and search for entries
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments (Optional)</Label>
              <div className="space-y-2">
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Upload supporting documents, images, or files
                </p>
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || uploading}>
            <Save className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading files...' : loading ? 'Creating...' : 'Create Entry'}
          </Button>
        </div>
      </form>
    </div>
  );
}
