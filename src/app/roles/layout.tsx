'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function RolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
