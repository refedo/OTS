'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function EventManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
