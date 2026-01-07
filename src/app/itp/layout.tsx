'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function ITPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
