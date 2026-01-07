'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
