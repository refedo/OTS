import { AppSidebar } from '@/components/app-sidebar';

export default function DocumentTimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppSidebar />
      <div className="lg:pl-64">{children}</div>
    </>
  );
}
