'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function IdentityReconciliationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
