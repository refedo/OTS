import { AppSidebar } from '@/components/app-sidebar';

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 ml-64 p-4">
        {children}
      </main>
    </div>
  );
}
