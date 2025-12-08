'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 lg:pl-64">
          {children}
        </div>
      </div>
    </NotificationProvider>
  );
}
