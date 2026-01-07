'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
