'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function KnowledgeCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
