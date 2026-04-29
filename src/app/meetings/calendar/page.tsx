import { Metadata } from 'next';
import CalendarPageClient from './_page-client';

export const metadata: Metadata = {
  title: 'Meeting Calendar — Hexa Steel OTS',
  description: 'Team meeting calendar grid view',
};

export default function CalendarPage() {
  return <CalendarPageClient />;
}
