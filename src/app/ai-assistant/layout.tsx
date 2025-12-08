'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto lg:ml-64">
          {children}
        </main>
      </div>
    </NotificationProvider>
  );
}
