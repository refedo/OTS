'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, MoreVertical, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'chrome-android' | 'samsung' | 'firefox-android' | 'safari-ios' | 'other';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Firefox/i.test(ua) && /Android/i.test(ua)) return 'firefox-android';
  if (/CriOS|Chrome/i.test(ua) && /Android/i.test(ua)) return 'chrome-android';
  if (/Safari/i.test(ua) && /iPhone|iPad/i.test(ua)) return 'safari-ios';
  return 'other';
}

function ManualInstallGuide({ browser, onDismiss, onDismissPermanently }: { browser: BrowserType; onDismiss: () => void; onDismissPermanently: () => void }) {
  const steps: Record<BrowserType, { icon: React.ReactNode; steps: string[] }> = {
    'chrome-android': {
      icon: <MoreVertical className="h-4 w-4" />,
      steps: [
        'Tap the ⋮ menu button (top-right)',
        'Select "Add to Home screen" or "Install app"',
        'Tap "Install" to confirm',
      ],
    },
    'samsung': {
      icon: <MoreVertical className="h-4 w-4" />,
      steps: [
        'Tap the ≡ menu button (bottom-right)',
        'Select "Add page to" → "Home screen"',
        'Tap "Add" to confirm',
      ],
    },
    'firefox-android': {
      icon: <MoreVertical className="h-4 w-4" />,
      steps: [
        'Tap the ⋮ menu button (top-right)',
        'Select "Install"',
        'Tap "Add" to confirm',
      ],
    },
    'safari-ios': {
      icon: <Share className="h-4 w-4" />,
      steps: [
        'Tap the Share button (bottom center)',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to confirm',
      ],
    },
    'other': {
      icon: <MoreVertical className="h-4 w-4" />,
      steps: [
        'Open your browser menu',
        'Look for "Add to Home Screen" or "Install App"',
        'Confirm the installation',
      ],
    },
  };

  const guide = steps[browser];

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-card border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Install OTS App</h3>
          <p className="text-xs text-muted-foreground mt-1">
            To install, follow these steps:
          </p>
          <ol className="text-xs text-muted-foreground mt-2 space-y-1.5 list-decimal list-inside">
            {guide.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Got it
            </Button>
            <Button size="sm" variant="link" className="text-xs text-muted-foreground" onClick={onDismissPermanently}>
              Don't show again
            </Button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [promptChecked, setPromptChecked] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      return;
    }
    // Permanent dismissal check (persists across sessions)
    if (localStorage.getItem('pwa-install-dismissed-permanently')) {
      setDismissed(true);
      return;
    }
    // Session dismissal check
    if (sessionStorage.getItem('pwa-install-dismissed')) {
      setDismissed(true);
      return;
    }

    let promptFired = false;

    const handler = (e: Event) => {
      e.preventDefault();
      promptFired = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPromptChecked(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If beforeinstallprompt doesn't fire within 15s, show manual guide
    const timeout = setTimeout(() => {
      if (!promptFired) {
        setPromptChecked(true);
        setShowManualGuide(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timeout);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowManualGuide(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleDismissPermanently = () => {
    setDismissed(true);
    setShowManualGuide(false);
    localStorage.setItem('pwa-install-dismissed-permanently', 'true');
  };

  if (isStandalone || dismissed) return null;

  // Show manual guide for browsers that don't support beforeinstallprompt
  if (showManualGuide && !deferredPrompt) {
    const browser = detectBrowser();
    return <ManualInstallGuide browser={browser} onDismiss={handleDismiss} onDismissPermanently={handleDismissPermanently} />;
  }

  // Native install prompt available
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-card border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install OTS App</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Install Hexa Steel OTS on your device for quick access and push notifications.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" onClick={handleInstall}>
                Install
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Not now
              </Button>
              <Button size="sm" variant="link" className="text-xs text-muted-foreground" onClick={handleDismissPermanently}>
                Don't show again
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Still waiting for prompt check
  if (!promptChecked) return null;

  return null;
}
