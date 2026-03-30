'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function ProjectTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
