'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function DocumentTimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
