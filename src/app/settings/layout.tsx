'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
