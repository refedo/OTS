'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function ProjectsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
