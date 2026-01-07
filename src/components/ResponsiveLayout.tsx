'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className={`flex-1 p-4 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        {children}
      </main>
    </div>
  );
}

export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <NotificationProvider>
        <LayoutContent>{children}</LayoutContent>
      </NotificationProvider>
    </SidebarProvider>
  );
}
