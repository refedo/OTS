'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function QCLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 ml-64 p-4">
          {children}
        </main>
      </div>
    </NotificationProvider>
  );
}
