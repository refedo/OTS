'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Lock } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginLogo, setLoginLogo] = useState<string | null>(null);
  const [version, setVersion] = useState<string>('');

  // Fetch login logo and version from settings
  useEffect(() => {
    // Clear any stale session data when login page loads
    localStorage.clear();
    sessionStorage.clear();
    
    const fetchLoginLogo = async () => {
      try {
        const res = await fetch('/api/settings/login-logo');
        if (res.ok) {
          const data = await res.json();
          if (data.logoUrl) {
            setLoginLogo(data.logoUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching login logo:', error);
      }
    };
    
    const fetchVersion = async () => {
      try {
        const res = await fetch('/api/system/latest-version?t=' + Date.now(), {
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          setVersion(data.version || '13.5.0');
        }
      } catch (error) {
        setVersion('13.4.7');
      }
    };
    
    fetchLoginLogo();
    fetchVersion();
  }, []);

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
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Login failed');
        } else {
          const text = await response.text();
          console.error('Server error:', text);
          throw new Error('Server error. Please check the console and try again.');
        }
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#2c3e50' }}>
      {/* System Header */}
      <div className="text-center py-3">
        <span className="text-slate-300 text-base font-medium">Hexa Steel® OTS - Operations Tracking System</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* White Card - Dolibarr Style */}
          <div className="bg-white rounded-lg shadow-2xl p-8">
            {/* Logo inside card */}
            <div className="flex justify-center mb-6">
              {loginLogo ? (
                <Image
                  src={loginLogo}
                  alt="Company Logo"
                  width={200}
                  height={70}
                  className="h-16 w-auto object-contain"
                  priority
                />
              ) : (
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800">HEXA STEEL<sup className="text-xs">®</sup></h2>
                  <p className="text-xs text-slate-500 tracking-widest">THRIVE DIFFERENT</p>
                </div>
              )}
            </div>

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {error}
                </div>
              )}
              
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="Email"
                  required 
                  disabled={loading}
                  autoComplete="email"
                  className="pl-10 h-11 border-slate-300"
                />
              </div>
              
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="Password"
                  required 
                  disabled={loading}
                  autoComplete="current-password"
                  className="pl-10 h-11 border-slate-300"
                />
              </div>
              
              <div className="flex items-center justify-center pt-2">
                <Button 
                  type="submit" 
                  variant="outline"
                  className="px-8 border-slate-400 hover:bg-slate-100"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'LOGIN'}
                </Button>
              </div>

              <div className="text-center pt-2">
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-blue-600 hover:underline"
                >
                  Password forgotten?
                </Link>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  name="remember" 
                  id="remember"
                  className="rounded border-slate-300" 
                  disabled={loading}
                />
                <label htmlFor="remember" className="text-sm text-slate-600">
                  Remember me
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer with Slogan */}
      <div className="text-center py-6 space-y-2">
        <p className="text-slate-300 text-sm">
          Keep Motivated, Keep Up, Stay Tuned
        </p>
        <p className="text-slate-400 text-sm">
          Don't confuse movement with progress.
        </p>
        <p className="text-white font-medium mt-4">
          Hexa Steel<sup>®</sup> — <span className="italic">"Forward Thinking"</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {version ? `Version ${version}` : 'Loading...'}
        </p>
      </div>
    </div>
  );
}
