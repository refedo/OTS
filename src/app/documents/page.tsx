import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FileText } from 'lucide-react';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { DocumentsList } from '@/components/documents-list';

async function getDocuments() {
  const documents = await prisma.document.findMany({
    include: {
      category: {
        select: { id: true, name: true },
      },
      uploadedBy: {
        select: { name: true, position: true },
      },
      approvedBy: {
        select: { name: true, position: true },
      },
    },
    orderBy: [
      { status: 'asc' },
      { documentNumber: 'asc' },
    ],
  });
  return documents;
}

async function getCategories() {
  const categories = await prisma.documentCategory.findMany({
    include: {
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { order: 'asc' },
  });
  return categories;
}

export default async function DocumentsPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const documents = await getDocuments();
  const categories = await getCategories();

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Library</h1>
            <p className="text-muted-foreground mt-1">
              ISO Procedures, Quality Manual, Work Instructions & Forms
            </p>
          </div>
          <Link href="/documents/upload">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </Link>
        </div>

        {/* Categories Overview */}
        {categories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {categories.slice(0, 4).map((category) => (
              <Card key={category.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{category.name}</p>
                      <p className="text-2xl font-bold">{category._count.documents}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DocumentsList 
          initialDocuments={documents} 
          canDelete={['Admin', 'Manager'].includes(session.role)}
        />
      </div>
    </main>
  );
}
