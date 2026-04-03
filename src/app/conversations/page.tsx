import type { Metadata } from 'next';
import ConversationsPage from './_page-client';

export const metadata: Metadata = { title: 'Task Conversations' };

export default function Page() {
  return <ConversationsPage />;
}
