'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function MeetingsLayout({ children }: { children: React.ReactNode }) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
