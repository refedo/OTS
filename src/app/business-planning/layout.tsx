'use client';

import { AppSidebar } from "@/components/app-sidebar";
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function BusinessPlanningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <>
        <AppSidebar />
        <main className="lg:pl-64 min-h-screen bg-gray-50">
          {children}
        </main>
      </>
    </NotificationProvider>
  );
}
