'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon, BellOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type State = 'checking' | 'unsupported' | 'subscribed' | 'unsubscribed' | 'denied' | 'error';

function keyToBytes(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Subscribes this browser to push reminders through the service worker at /sw.js. */
export function PushSubscribeButton({ publicKey }: { publicKey: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>('checking');

  useEffect(() => {
    let cancelled = false;
    const check = async (): Promise<State> => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.getSubscription();
      return sub ? 'subscribed' : 'unsubscribed';
    };
    check()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToBytes(publicKey) as BufferSource,
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error('save failed');
      setState('subscribed');
      router.refresh();
    } catch {
      setState('error');
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState('unsubscribed');
      router.refresh();
    } catch {
      setState('error');
    }
  }

  if (state === 'checking')
    return <p className="text-muted-foreground text-xs">Checking this device…</p>;
  if (state === 'unsupported') {
    return (
      <p className="text-muted-foreground text-xs">
        This browser does not support push notifications.
      </p>
    );
  }
  if (state === 'denied') {
    return (
      <p className="text-muted-foreground text-xs">
        Notifications are blocked for this site in the browser settings.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === 'subscribed' ? (
        <Button type="button" size="sm" variant="outline" onClick={unsubscribe}>
          <BellOffIcon data-icon="inline-start" />
          Stop push on this device
        </Button>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={subscribe}>
          <BellIcon data-icon="inline-start" />
          Allow push on this device
        </Button>
      )}
      {state === 'error' && (
        <span role="alert" className="text-destructive text-xs">
          That did not work. Try again.
        </span>
      )}
    </div>
  );
}
