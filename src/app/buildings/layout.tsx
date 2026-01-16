'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function BuildingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
