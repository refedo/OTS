import { AppSidebar } from '@/components/app-sidebar';

export default function RolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 lg:pl-64">
        {children}
      </div>
    </div>
  );
}
