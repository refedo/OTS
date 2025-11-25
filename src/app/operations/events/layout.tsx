import { AppSidebar } from '@/components/app-sidebar';

export default function EventManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 lg:pl-64">
        {children}
      </main>
    </div>
  );
}
