import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { LoginForm } from '@/components/login-form';

export const dynamic = 'force-dynamic';

async function getSession() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  return token ? verifySession(token) : null;
}

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  }
  return <LoginForm />;
}
