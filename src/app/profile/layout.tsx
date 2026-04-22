'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
