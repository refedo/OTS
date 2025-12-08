'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 lg:pl-64 p-6">{children}</main>
      </div>
    </NotificationProvider>
  );
}
