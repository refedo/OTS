'use client';

import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { Bell } from 'lucide-react';

export default function NotificationSettingsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-4xl max-lg:pt-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notification Settings</h1>
            <p className="text-muted-foreground text-sm">
              Manage your push notifications and notification preferences
            </p>
          </div>
        </div>

        <NotificationPreferences />
      </div>
    </main>
  );
}
