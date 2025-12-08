'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function DocumentTimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <>
        <AppSidebar />
        <div className="lg:pl-64">{children}</div>
      </>
    </NotificationProvider>
  );
}
