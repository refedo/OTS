'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { RouteGuard } from '@/components/RouteGuard';
import TopBar from '@/components/TopBar';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <TopBar />
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'} pt-14 print:!ml-0 print:!pt-0`}>
        <RouteGuard>{children}</RouteGuard>
      </main>
    </div>
  );
}

export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <NotificationProvider>
        <PermissionsProvider>
          <LayoutContent>{children}</LayoutContent>
        </PermissionsProvider>
      </NotificationProvider>
    </SidebarProvider>
  );
}
