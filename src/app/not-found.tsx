import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <FileQuestion className="size-10 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-xl font-semibold">Page not found</h2>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
