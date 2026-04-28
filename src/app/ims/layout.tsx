'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function ImsLayout({ children }: { children: React.ReactNode }) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
