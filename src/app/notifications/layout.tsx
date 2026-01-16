'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
