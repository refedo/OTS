'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function OperationsControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
