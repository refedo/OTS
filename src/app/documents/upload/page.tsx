'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, FileText } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  description: string | null;
};

const DOCUMENT_TYPES = ['Procedure', 'Policy', 'Form', 'Work Instruction', 'Manual'];
const STANDARDS = [
  'ISO 9001:2015',
  'ISO 3834',
  'ISO 14001',
  'AWS D1.1',
  'AWS D17.1',
  'ASME Section IX',
  'Other',
];

export default function UploadDocumentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitForReview, setSubmitForReview] = useState(false);
  
  const [formData, setFormData] = useState({
    documentNumber: '',
    title: '',
    revision: 0,
    categoryId: '',
    description: '',
    type: 'Procedure',
    standard: '',
    effectiveDate: '',
    reviewDate: '',
    tags: '',
    filePath: '',
    fileSize: 0,
    fileType: '',
    content: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/documents/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadingFile(true);
    setError('');

    try {
      const fileFormData = new FormData();
      fileFormData.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: fileFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const fileInfo = await response.json();
      setFormData({
        ...formData,
        filePath: fileInfo.filePath,
        fileSize: fileInfo.fileSize,
        fileType: fileInfo.fileType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setSelectedFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, submitStatus: 'Draft' | 'Under Review' = 'Draft') => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          revision: parseInt(formData.revision.toString()),
          effectiveDate: formData.effectiveDate || null,
          reviewDate: formData.reviewDate || null,
          filePath: formData.filePath || null,
          fileSize: formData.fileSize || null,
          fileType: formData.fileType || null,
          status: submitStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      const document = await response.json();
      router.push(`/documents/${document.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-4xl max-lg:pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Upload Document</h1>
          <p className="text-muted-foreground mt-1">
            Add a new document to the library
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentNumber">Document Number *</Label>
                    <Input
                      id="documentNumber"
                      value={formData.documentNumber}
                      onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                      placeholder="e.g., HEXA-QP-001"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="revision">Revision</Label>
                    <Input
                      id="revision"
                      type="number"
                      min="0"
                      value={formData.revision}
                      onChange={(e) => setFormData({ ...formData, revision: parseInt(e.target.value) })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Quality Control Procedure"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the document..."
                    rows={3}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Classification */}
            <Card>
              <CardHeader>
                <CardTitle>Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category *</Label>
                    <select
                      id="categoryId"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      required
                      disabled={loading}
                      className="w-full h-10 px-3 rounded-md border bg-background"
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {categories.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No categories available. Create one first in Categories page.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Document Type *</Label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                      disabled={loading}
                      className="w-full h-10 px-3 rounded-md border bg-background"
                    >
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="standard">Related Standard</Label>
                    <select
                      id="standard"
                      value={formData.standard}
                      onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                      disabled={loading}
                      className="w-full h-10 px-3 rounded-md border bg-background"
                    >
                      <option value="">Select Standard (Optional)</option>
                      {STANDARDS.map((std) => (
                        <option key={std} value={std}>
                          {std}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., quality, inspection, welding"
                      disabled={loading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="effectiveDate">Effective Date</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reviewDate">Next Review Date</Label>
                    <Input
                      id="reviewDate"
                      type="date"
                      value={formData.reviewDate}
                      onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Content */}
            <Card>
              <CardHeader>
                <CardTitle>Document Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">
                    Paste Document Content Here
                    <span className="text-xs text-muted-foreground ml-2">
                      (Copy and paste your procedure/manual text for inline viewing)
                    </span>
                  </Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Paste the full content of your procedure or manual here...

Example:
1. Purpose
   This procedure defines the quality control process...

2. Scope
   This procedure applies to all...

3. Responsibilities
   - QC Manager: ...
   - Inspector: ..."
                    rows={20}
                    disabled={loading}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: You can copy content from Word/PDF documents and paste it here. 
                    The content will be viewable directly in the system without opening external files.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* File Upload (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle>File Attachment (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-6">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Upload PDF, Word, Excel, or text files (max 10MB)
                    </p>
                    <div className="flex justify-center">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                          {uploadingFile ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              Choose File
                            </span>
                          )}
                        </div>
                        <input
                          id="file-upload"
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                          onChange={handleFileChange}
                          disabled={loading || uploadingFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  
                  {selectedFile && (
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null);
                            setFormData({ ...formData, filePath: '', fileSize: 0, fileType: '' });
                          }}
                          disabled={loading}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: Upload the original file for download, and paste content above for inline viewing
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={(e) => handleSubmit(e, 'Draft')}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FileText className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button 
              type="button"
              onClick={(e) => handleSubmit(e, 'Under Review')}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for Review
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
