'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
