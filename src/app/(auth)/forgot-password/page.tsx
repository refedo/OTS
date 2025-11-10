export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  async function action(formData: FormData) {
    'use server';
    const email = String(formData.get('email') || '');
    await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email })
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-4 text-gray-900">Forgot password</h1>
        <form className="space-y-4" action={action}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Send reset link</button>
        </form>
      </div>
    </div>
  );
}
