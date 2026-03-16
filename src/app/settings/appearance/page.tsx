import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Appearance',
};


export default function AppearanceSettingsPage() {
  redirect('/settings');
}
