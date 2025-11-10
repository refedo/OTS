import { redirect } from 'next/navigation';

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
          <h1 className="text-xl font-semibold mb-4 text-gray-900">Invalid reset link</h1>
          <p className="text-gray-600">Missing token.</p>
        </div>
      </div>
    );
  }

  async function action(formData: FormData) {
    'use server';
    const password = String(formData.get('password') || '');
    const res = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    if (res.ok) redirect('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-4 text-gray-900">Reset password</h1>
        <form className="space-y-4" action={action}>
          <div>
            <label className="block text-sm font-medium text-gray-700">New password</label>
            <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Reset</button>
        </form>
      </div>
    </div>
  );
}
