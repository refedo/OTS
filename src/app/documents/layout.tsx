import { AppSidebar } from '@/components/app-sidebar';

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
