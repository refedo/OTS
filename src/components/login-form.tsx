'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const remember = formData.get('remember') === 'on';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, remember }),
      });

      if (!response.ok) {
        // Try to parse JSON error, but handle HTML responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Login failed');
        } else {
          // Server returned HTML (likely an error page)
          const text = await response.text();
          console.error('Server error:', text);
          throw new Error('Server error. Please check the console and try again.');
        }
      }

      // Successful login - redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Branding Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/uploads/company-logo/logo.png"
              alt="Hexa Steel Logo"
              width={180}
              height={60}
              className="h-16 w-auto"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Operations Tracking System
          </h1>
          <p className="mt-2 text-lg text-slate-300 italic">
            Hexa Steel<sup>®</sup> — <span className="font-semibold">"Forward Thinking"</span>
          </p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center">Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {error}
                </div>
              )}
              
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    name="remember" 
                    className="rounded" 
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
