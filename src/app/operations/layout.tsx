import { AppSidebar } from '@/components/app-sidebar';

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 lg:pl-64 p-6">{children}</main>
    </div>
  );
}
