import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Governance Quick Guide | OTS',
  description: 'Enterprise audit trail, version history, and data recovery guide for OTS',
};

export default function GovernanceQuickGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
