'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function WPSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
