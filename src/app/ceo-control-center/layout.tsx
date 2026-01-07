'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function CEOControlCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
