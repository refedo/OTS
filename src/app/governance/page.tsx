import type { Metadata } from 'next';
import { Suspense } from 'react';
import GovernancePage from './_page-client';

export const metadata: Metadata = { title: 'Governance' };

export default function Page() {
  return (
    <Suspense>
      <GovernancePage />
    </Suspense>
  );
}
