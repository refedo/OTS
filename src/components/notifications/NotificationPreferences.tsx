'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Bell, BellOff, Smartphone } from 'lucide-react';

interface NotificationPref {
  notificationType: string;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

const TYPE_LABELS: Record<string, { label: string; description: string }> = {
  TASK_ASSIGNED: {
    label: 'Task Assigned',
    description: 'When a new task is assigned to you',
  },
  TASK_COMPLETED: {
    label: 'Task Completed',
    description: 'When a task you created is completed',
  },
  APPROVAL_REQUIRED: {
    label: 'Approval Required',
    description: 'When something needs your approval',
  },
  DEADLINE_WARNING: {
    label: 'Deadline Warning',
    description: 'When a deadline is approaching',
  },
  APPROVED: {
    label: 'Approved',
    description: 'When your submission is approved',
  },
  REJECTED: {
    label: 'Rejected',
    description: 'When your submission is rejected',
  },
  SYSTEM: {
    label: 'System',
    description: 'System announcements and updates',
  },
};

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notification-preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch {
      // Silently fail - defaults will apply
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPushStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushSupported(false);
      return;
    }
    setPushSupported(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setPushSubscribed(!!subscription);
    } catch {
      setPushSubscribed(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
    checkPushStatus();
  }, [fetchPreferences, checkPushStatus]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }
    } catch {
      alert('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (type: string, field: 'pushEnabled' | 'inAppEnabled') => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.notificationType === type ? { ...p, [field]: !p[field] } : p
      )
    );
  };

  const handleSubscribePush = async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Please allow notifications in your browser settings to receive push notifications.');
        return;
      }

      const vapidRes = await fetch('/api/push/vapid-key');
      if (!vapidRes.ok) {
        alert('Push notifications are not configured on this server yet.');
        return;
      }
      const { publicKey } = await vapidRes.json();

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      const subJson = subscription.toJSON();
      const res = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        }),
      });

      if (res.ok) {
        setPushSubscribed(true);
      }
    } catch {
      alert('Failed to enable push notifications. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribePush = async () => {
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push-subscription', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushSubscribed(false);
    } catch {
      alert('Failed to disable push notifications');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notification Subscription */}
      {pushSupported && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile Push Notifications
            </CardTitle>
            <CardDescription>
              {pushSubscribed
                ? 'Push notifications are enabled on this device. You will receive notifications even when the app is closed.'
                : 'Enable push notifications to receive alerts on this device even when OTS is not open.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={pushSubscribed ? handleUnsubscribePush : handleSubscribePush}
              disabled={subscribing}
              variant={pushSubscribed ? 'outline' : 'default'}
            >
              {subscribing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : pushSubscribed ? (
                <BellOff className="mr-2 h-4 w-4" />
              ) : (
                <Bell className="mr-2 h-4 w-4" />
              )}
              {subscribing
                ? 'Processing...'
                : pushSubscribed
                  ? 'Disable Push Notifications'
                  : 'Enable Push Notifications'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Per-type Preferences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>
              Choose which notifications you want to receive in-app and as push notifications
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[1fr,80px,80px] gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
              <span>Type</span>
              <span className="text-center">In-App</span>
              <span className="text-center">Push</span>
            </div>

            {preferences.map((pref) => {
              const typeInfo = TYPE_LABELS[pref.notificationType] || {
                label: pref.notificationType,
                description: '',
              };
              return (
                <div
                  key={pref.notificationType}
                  className="grid grid-cols-[1fr,80px,80px] gap-4 items-center py-3 border-b last:border-0"
                >
                  <div>
                    <Label className="font-medium">{typeInfo.label}</Label>
                    <p className="text-xs text-muted-foreground">{typeInfo.description}</p>
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.inAppEnabled}
                      onCheckedChange={() => togglePref(pref.notificationType, 'inAppEnabled')}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.pushEnabled}
                      onCheckedChange={() => togglePref(pref.notificationType, 'pushEnabled')}
                      disabled={!pushSubscribed}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
