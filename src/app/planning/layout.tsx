'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function PlanningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
