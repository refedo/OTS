'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
