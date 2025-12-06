import { AppSidebar } from "@/components/app-sidebar";

export default function BusinessPlanningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppSidebar />
      <main className="lg:pl-64 min-h-screen bg-gray-50">
        {children}
      </main>
    </>
  );
}
