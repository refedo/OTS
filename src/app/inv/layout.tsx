'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function InvLayout({ children }: { children: React.ReactNode }) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
