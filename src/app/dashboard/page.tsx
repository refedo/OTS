import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { Sparkles } from 'lucide-react';
import WidgetContainer from '@/components/dashboard/WidgetContainer';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Dashboard',
};


export default async function DashboardPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full p-4 lg:p-6 space-y-6 max-lg:pt-16">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="size-6 lg:size-7 text-primary" />
            Welcome back, {session?.name || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Your personalized dashboard with real-time insights
          </p>
        </div>

        {/* Widget Container */}
        <WidgetContainer />
      </div>
    </main>
  );
}
