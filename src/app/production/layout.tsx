'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function ProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
