'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Settings,
  Bell,
  LogOut,
  Key,
  ChevronDown,
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

interface UserData {
  id: string;
  name: string;
  email: string;
  role?: {
    name: string;
  };
}

// Cache user data to avoid refetching on every mount
let cachedUser: UserData | null = null;

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const { unreadCount } = useNotifications();
  const hasFetched = useRef(false);

  useEffect(() => {
    // Skip if already cached or already fetching
    if (cachedUser || hasFetched.current) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    hasFetched.current = true;

    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          const userData: UserData = {
            id: data.id,
            name: data.name,
            email: data.email,
            role: { name: data.role }
          };
          cachedUser = userData;
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      // Stop session activity tracker immediately
      const tracker = (window as any).__sessionActivityTracker;
      if (tracker) {
        tracker.stop();
        delete (window as any).__sessionActivityTracker;
      }
      
      // Clear any pending timeouts/intervals
      const highestTimeoutId = setTimeout(() => {});
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
      
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear all local storage and session storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Force full page redirect to login with cache busting
      const loginUrl = process.env.NODE_ENV === 'production' 
        ? 'https://ots.hexasteel.sa/login?t=' + Date.now()
        : '/login?t=' + Date.now();
      
      window.location.replace(loginUrl);
    } catch (error) {
      console.error('Error logging out:', error);
      // Force redirect even on error
      const loginUrl = process.env.NODE_ENV === 'production' 
        ? 'https://ots.hexasteel.sa/login?t=' + Date.now()
        : '/login?t=' + Date.now();
      
      window.location.replace(loginUrl);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 py-1.5 h-auto"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start text-left">
            <span className="text-sm font-medium leading-none">{user.name}</span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5">
              {user.role?.name || 'User'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => router.push('/notifications')}
          className="cursor-pointer"
        >
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => router.push('/settings/profile')}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => router.push('/settings/change-password')}
          className="cursor-pointer"
        >
          <Key className="mr-2 h-4 w-4" />
          <span>Change Password</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => router.push('/settings')}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
