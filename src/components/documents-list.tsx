'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText, CheckCircle, Clock, Search, Download, Edit, Trash2, Plus } from 'lucide-react';
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

type Document = {
  id: string;
  documentNumber: string;
  title: string;
  revision: number;
  type: string;
  status: string;
  description: string | null;
  standard: string | null;
  filePath: string | null;
  effectiveDate: Date | null;
  reviewDate: Date | null;
  tags: string | null;
  category: { id: string; name: string };
  uploadedBy: { name: string; position: string | null };
  approvedBy: { name: string; position: string | null } | null;
};

type Props = {
  initialDocuments: Document[];
  canDelete: boolean;
};

export function DocumentsList({ initialDocuments, canDelete }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return initialDocuments;

    const query = searchQuery.toLowerCase();
    return initialDocuments.filter((doc) =>
      doc.title.toLowerCase().includes(query) ||
      doc.documentNumber.toLowerCase().includes(query) ||
      doc.type.toLowerCase().includes(query) ||
      doc.category.name.toLowerCase().includes(query) ||
      (doc.tags && doc.tags.toLowerCase().includes(query)) ||
      (doc.description && doc.description.toLowerCase().includes(query))
    );
  }, [initialDocuments, searchQuery]);

  const handleDelete = async (documentId: string) => {
    setDeleting(documentId);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('An error occurred');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Under Review':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Draft':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'Superseded':
        return <FileText className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Under Review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Superseded':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents by title, number, tags, or category..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-muted-foreground mt-2">
            Found {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Documents List */}
      <div className="grid gap-4">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No documents found' : 'No Documents Found'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Get started by uploading your first document'}
              </p>
              {!searchQuery && (
                <Link href="/documents/upload">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload First Document
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {doc.documentNumber}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Rev. {doc.revision}
                      </span>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        {doc.status}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium">Category:</span> {doc.category.name}
                      </p>
                      <p>
                        <span className="font-medium">Type:</span> {doc.type}
                      </p>
                      {doc.standard && (
                        <p>
                          <span className="font-medium">Standard:</span> {doc.standard}
                        </p>
                      )}
                      {doc.description && (
                        <p className="mt-2">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <Link href={`/documents/${doc.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/documents/${doc.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={deleting === doc.id}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(doc.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    {doc.filePath && (
                      <a href={doc.filePath} download target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Uploaded By</p>
                    <p className="font-medium">{doc.uploadedBy.name}</p>
                    {doc.uploadedBy.position && (
                      <p className="text-xs text-muted-foreground">{doc.uploadedBy.position}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Approved By</p>
                    <p className="font-medium">
                      {doc.approvedBy?.name || 'Pending'}
                    </p>
                    {doc.approvedBy?.position && (
                      <p className="text-xs text-muted-foreground">{doc.approvedBy.position}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Effective Date</p>
                    <p className="font-medium">
                      {doc.effectiveDate
                        ? new Date(doc.effectiveDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Review Date</p>
                    <p className="font-medium">
                      {doc.reviewDate
                        ? new Date(doc.reviewDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                {doc.tags && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {doc.tags.split(',').map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-muted text-xs rounded-md"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
