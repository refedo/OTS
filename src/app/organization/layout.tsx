'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
