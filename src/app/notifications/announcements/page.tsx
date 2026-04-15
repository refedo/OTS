import { Suspense } from 'react';
import { Megaphone } from 'lucide-react';
import { AnnouncementsClient } from './_page-client';

export const metadata = { title: 'Announcements' };

export default function AnnouncementsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
            <Megaphone className="h-5 w-5 animate-pulse" />
            <span>Loading announcements…</span>
          </div>
        </div>
      }
    >
      <AnnouncementsClient />
    </Suspense>
  );
}
