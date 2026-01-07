'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function BusinessPlanningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
