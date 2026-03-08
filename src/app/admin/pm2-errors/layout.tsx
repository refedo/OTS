import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PM2 Errors | OTS Admin',
  description: 'Monitor system errors, API failures, and PM2 process issues',
};

export default function PM2ErrorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
