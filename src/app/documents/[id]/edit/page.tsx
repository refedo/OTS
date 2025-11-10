'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Document = {
  id: string;
  documentNumber: string;
  title: string;
  type: string;
  status: string;
};

type Reference = {
  id: string;
  referenceType: string;
  referencedDocument: Document;
};

export default function EditDocumentReferencesPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState<Document | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');

  useEffect(() => {
    fetchData();
  }, [documentId]);

  const fetchData = async () => {
    try {
      // Fetch current document
      const docRes = await fetch(`/api/documents/${documentId}`);
      if (docRes.ok) {
        const docData = await docRes.json();
        setDocument(docData);
      }

      // Fetch references
      const refRes = await fetch(`/api/documents/${documentId}/references`);
      if (refRes.ok) {
        const refData = await refRes.json();
        setReferences(refData);
      }

      // Fetch all documents for selection
      const docsRes = await fetch('/api/documents');
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        // Filter out current document
        setAvailableDocuments(docsData.filter((d: Document) => d.id !== documentId));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReference = async () => {
    if (!selectedDocId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referencedDocumentId: selectedDocId,
          referenceType: 'Related Form',
        }),
      });

      if (response.ok) {
        await fetchData();
        setSelectedDocId('');
      }
    } catch (error) {
      console.error('Error adding reference:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveReference = async (referenceId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/references?referenceId=${referenceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReferences(references.filter(r => r.id !== referenceId));
      }
    } catch (error) {
      console.error('Error removing reference:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
        <div className="container mx-auto p-6 lg:p-8 max-w-4xl flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-4xl max-lg:pt-20">
        <div className="mb-6">
          <Link href={`/documents/${documentId}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Document
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Manage Reference Forms</h1>
          <p className="text-muted-foreground mt-1">
            {document?.title} ({document?.documentNumber})
          </p>
        </div>

        <div className="space-y-6">
          {/* Add New Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Add Reference Form</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="document-select">Select Document</Label>
                  <select
                    id="document-select"
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    disabled={saving}
                    className="w-full h-10 px-3 rounded-md border bg-background mt-2"
                  >
                    <option value="">Choose a document...</option>
                    {availableDocuments
                      .filter(d => !references.some(r => r.referencedDocument.id === d.id))
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.documentNumber} - {doc.title} ({doc.type})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAddReference}
                    disabled={!selectedDocId || saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add Reference
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current References */}
          <Card>
            <CardHeader>
              <CardTitle>Current Reference Forms ({references.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {references.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No reference forms added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {references.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{ref.referencedDocument.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {ref.referencedDocument.documentNumber} • {ref.referencedDocument.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/documents/${ref.referencedDocument.id}`} target="_blank">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveReference(ref.id)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
