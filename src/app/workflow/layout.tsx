'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
