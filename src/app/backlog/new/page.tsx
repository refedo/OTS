'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Sparkles, Paperclip, X, FileText, Upload, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { showConfirmation } from '@/components/ui/confirmation-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AttachmentFile {
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

const backlogTypes = ['FEATURE', 'BUG', 'TECH_DEBT', 'PERFORMANCE', 'REPORTING', 'REFACTOR', 'COMPLIANCE', 'INSIGHT'];
const backlogCategories = ['CORE_SYSTEM', 'PRODUCTION', 'DESIGN', 'DETAILING', 'PROCUREMENT', 'QC', 'LOGISTICS', 'FINANCE', 'REPORTING', 'AI', 'GOVERNANCE', 'PROJECTS'];
const backlogPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function NewBacklogItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingValue, setGeneratingValue] = useState(false);
  const [generatingModules, setGeneratingModules] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    expectedValue: '',
    type: 'FEATURE',
    category: 'CORE_SYSTEM',
    priority: 'MEDIUM',
    affectedModules: '',
  });

  const generateTitle = async () => {
    if (!formData.description) {
      showConfirmation({
        type: 'warning',
        title: 'Description Required',
        message: 'Please enter a feature description first before generating a title.',
      });
      return;
    }

    setGeneratingTitle(true);
    try {
      const response = await fetch('/api/ai/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, title: data.title });
      } else {
        showConfirmation({
          type: 'error',
          title: 'Generation Failed',
          message: 'Failed to generate title. Please try again.',
        });
      }
    } catch (error) {
      showConfirmation({
        type: 'error',
        title: 'Generation Failed',
        message: 'Failed to generate title. Please try again.',
      });
    } finally {
      setGeneratingTitle(false);
    }
  };

  const generateExpectedValue = async () => {
    if (!formData.description) {
      showConfirmation({
        type: 'warning',
        title: 'Description Required',
        message: 'Please enter a feature description first.',
      });
      return;
    }

    setGeneratingValue(true);
    try {
      const response = await fetch('/api/ai/generate-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, expectedValue: data.value });
      } else {
        showConfirmation({
          type: 'error',
          title: 'Generation Failed',
          message: 'Failed to generate expected value. Please try again.',
        });
      }
    } catch (error) {
      showConfirmation({
        type: 'error',
        title: 'Generation Failed',
        message: 'Failed to generate expected value. Please try again.',
      });
    } finally {
      setGeneratingValue(false);
    }
  };

  const generateAffectedModules = async () => {
    if (!formData.description) {
      showConfirmation({
        type: 'warning',
        title: 'Description Required',
        message: 'Please enter a feature description first.',
      });
      return;
    }

    setGeneratingModules(true);
    try {
      const response = await fetch('/api/ai/generate-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, affectedModules: data.modules });
      } else {
        showConfirmation({
          type: 'error',
          title: 'Generation Failed',
          message: 'Failed to generate affected modules. Please try again.',
        });
      }
    } catch (error) {
      showConfirmation({
        type: 'error',
        title: 'Generation Failed',
        message: 'Failed to generate affected modules. Please try again.',
      });
    } finally {
      setGeneratingModules(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setAttachments(prev => [...prev, {
            fileName: data.originalName,
            filePath: data.filePath,
            fileType: data.fileType,
            fileSize: data.fileSize,
            uploadedAt: new Date().toISOString(),
          }]);
        } else {
          const error = await response.json();
          showConfirmation({
            type: 'error',
            title: 'Upload Failed',
            message: error.error || `Failed to upload ${file.name}`,
          });
        }
      }
    } catch {
      showConfirmation({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload file. Please try again.',
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          businessReason: formData.expectedValue || 'To be determined',
          expectedValue: formData.expectedValue,
          type: formData.type,
          category: formData.category,
          priority: formData.priority,
          affectedModules: formData.affectedModules.split(',').map(m => m.trim()).filter(Boolean),
          attachments,
        }),
      });

      if (response.ok) {
        showConfirmation({
          type: 'success',
          title: 'Success',
          message: 'Backlog item created successfully!',
          onConfirm: () => router.push('/backlog'),
        });
      } else {
        const error = await response.json();
        showConfirmation({
          type: 'error',
          title: 'Creation Failed',
          message: error.details
            ? `${error.error}\n\nDetails: ${error.details}`
            : error.error || 'Failed to create backlog item',
        });
      }
    } catch (error) {
      showConfirmation({
        type: 'error',
        title: 'Creation Failed',
        message: error instanceof Error 
          ? `Failed to create backlog item.\n\nError: ${error.message}` 
          : 'Failed to create backlog item. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/backlog">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Backlog Item</h1>
            <p className="text-muted-foreground mt-1">
              Create a new feature, bug, or improvement request
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Backlog Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description - Now First */}
              <div className="space-y-2">
                <Label htmlFor="description">Feature Description *</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the feature, bug, or improvement"
                  rows={5}
                />
              </div>

              {/* Title with AI Generation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Title *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateTitle}
                    disabled={generatingTitle || !formData.description}
                  >
                    <Sparkles className="size-4 mr-2" />
                    {generatingTitle ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title for the item"
                />
              </div>

              {/* Type, Category, Priority */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {backlogTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {backlogCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {backlogPriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Expected Value with AI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="expectedValue">Expected Value</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateExpectedValue}
                    disabled={generatingValue || !formData.description}
                  >
                    <Sparkles className="size-4 mr-2" />
                    {generatingValue ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
                <Textarea
                  id="expectedValue"
                  value={formData.expectedValue}
                  onChange={(e) => setFormData({ ...formData, expectedValue: e.target.value })}
                  placeholder="What value or benefit will this provide?"
                  rows={3}
                />
              </div>

              {/* Affected Modules with AI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="affectedModules">Affected Modules</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateAffectedModules}
                    disabled={generatingModules || !formData.description}
                  >
                    <Sparkles className="size-4 mr-2" />
                    {generatingModules ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
                <Input
                  id="affectedModules"
                  value={formData.affectedModules}
                  onChange={(e) => setFormData({ ...formData, affectedModules: e.target.value })}
                  placeholder="e.g., Production, QC, Tasks (comma-separated)"
                />
                <p className="text-sm text-muted-foreground">
                  Enter module names separated by commas
                </p>
              </div>

              {/* Attachments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Attachments</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="gap-2"
                  >
                    {uploadingFile ? (
                      <>
                        <Upload className="size-4 animate-pulse" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Paperclip className="size-4" />
                        Attach File
                      </>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.svg"
                    onChange={handleFileUpload}
                  />
                </div>

                {attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((file, index) => {
                      const isImage = file.fileType.startsWith('image/');
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                        >
                          {isImage ? (
                            <ImageIcon className="size-4 text-blue-500 shrink-0" />
                          ) : (
                            <FileText className="size-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Attach documents, images, or specs (PDF, Word, Excel, TXT, JPEG, PNG — max 10 MB each)
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Backlog Item'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/backlog')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </main>
  );
}
