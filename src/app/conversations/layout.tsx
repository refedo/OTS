'use client';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
