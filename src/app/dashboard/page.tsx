import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Sparkles } from 'lucide-react';
import WidgetContainer from '@/components/dashboard/WidgetContainer';

export default async function DashboardPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  async function logout() {
    'use server';
    const cookieStore = await cookies();
    const secure = process.env.COOKIE_SECURE === 'true';
    const domain = process.env.COOKIE_DOMAIN || undefined;
    cookieStore.set(cookieName, '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure,
      domain,
      maxAge: 0
    });
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="size-7 text-primary" />
              Welcome back, {session?.name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Your personalized dashboard with real-time insights
            </p>
          </div>
          <form action={logout}>
            <Button variant="outline" size="default">
              <LogOut className="size-4" />
              Logout
            </Button>
          </form>
        </div>

        {/* Widget Container */}
        <WidgetContainer />
      </div>
    </main>
  );
}
