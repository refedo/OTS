'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function RiskDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
