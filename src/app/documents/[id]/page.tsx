import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Edit, CheckCircle, Clock, Eye, Check, X } from 'lucide-react';
import { DocumentApprovalButtons } from '@/components/document-approval-buttons';

export default async function DocumentDetailsPage({ params }: { params: { id: string } }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      category: {
        select: { id: true, name: true },
      },
      uploadedBy: {
        select: { id: true, name: true, email: true, position: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true, position: true },
      },
      referencesFrom: {
        include: {
          referencedDocument: {
            select: {
              id: true,
              documentNumber: true,
              title: true,
              type: true,
              status: true,
              filePath: true,
              content: true,
            },
          },
        },
      },
    },
  });

  if (!document) {
    notFound();
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Under Review':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'Draft':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
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
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-full max-lg:pt-20">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
              <span className="text-lg text-muted-foreground">{document.documentNumber}</span>
              <span className="text-lg text-muted-foreground">Rev. {document.revision}</span>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm font-medium ${getStatusColor(document.status)}`}>
                {getStatusIcon(document.status)}
                {document.status}
              </div>
            </div>
            <p className="text-muted-foreground">
              {document.type} - {document.category.name}
            </p>
          </div>
          <div className="flex gap-2">
            <DocumentApprovalButtons 
              documentId={document.id}
              status={document.status}
              canApprove={['CEO', 'Admin', 'Manager'].includes(session.role)}
            />
            <Link href={`/documents/${document.id}/edit`}>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Manage References
              </Button>
            </Link>
            {document.filePath && (
              <a href={document.filePath} download target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex gap-6">
          {/* Main Content - Left Side */}
          <div className="flex-1 min-w-0 space-y-6">
          {/* Document Information */}
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Document Number</p>
                <p className="font-medium">{document.documentNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revision</p>
                <p className="font-medium">{document.revision}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{document.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{document.category.name}</p>
              </div>
              {document.standard && (
                <div>
                  <p className="text-sm text-muted-foreground">Related Standard</p>
                  <p className="font-medium">{document.standard}</p>
                </div>
              )}
              {document.effectiveDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Effective Date</p>
                  <p className="font-medium">
                    {new Date(document.effectiveDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {document.reviewDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Next Review Date</p>
                  <p className="font-medium">
                    {new Date(document.reviewDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {document.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{document.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Document Content - Main Feature */}
          {document.content && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Document Content
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  Print
                </Button>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="bg-white p-8 rounded-lg border shadow-sm">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {document.content}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Information */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Uploaded By</p>
                <p className="font-medium">{document.uploadedBy.name}</p>
                {document.uploadedBy.position && (
                  <p className="text-xs text-muted-foreground">{document.uploadedBy.position}</p>
                )}
                <p className="text-xs text-muted-foreground">{document.uploadedBy.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved By</p>
                <p className="font-medium">{document.approvedBy?.name || 'Pending Approval'}</p>
                {document.approvedBy?.position && (
                  <p className="text-xs text-muted-foreground">{document.approvedBy.position}</p>
                )}
                {document.approvedBy?.email && (
                  <p className="text-xs text-muted-foreground">{document.approvedBy.email}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(document.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {new Date(document.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {document.tags && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {document.tags.split(',').map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-muted text-sm rounded-md"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>

          {/* Reference Forms - Right Side */}
          {document.referencesFrom && document.referencesFrom.length > 0 && (
            <div className="w-96 flex-shrink-0">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Reference Forms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {document.referencesFrom.map((ref) => (
                    <div key={ref.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{ref.referencedDocument.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ref.referencedDocument.documentNumber}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                            {ref.referencedDocument.type}
                          </span>
                        </div>
                      </div>
                      {ref.referencedDocument.content && (
                        <div className="mt-3 p-3 bg-muted/30 rounded text-xs max-h-40 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-sans text-xs">
                            {ref.referencedDocument.content.substring(0, 200)}...
                          </pre>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Link href={`/documents/${ref.referencedDocument.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="mr-2 h-3 w-3" />
                            View Full
                          </Button>
                        </Link>
                        {ref.referencedDocument.filePath && (
                          <a href={ref.referencedDocument.filePath} download target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <Download className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
