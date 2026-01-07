'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function BacklogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
