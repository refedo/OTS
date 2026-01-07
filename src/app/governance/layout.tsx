'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function GovernanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
