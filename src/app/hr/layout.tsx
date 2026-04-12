'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
