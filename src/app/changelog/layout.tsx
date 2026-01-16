'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
