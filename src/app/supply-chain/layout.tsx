'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function SupplyChainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
