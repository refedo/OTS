'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
