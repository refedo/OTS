'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function PTSSyncLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
