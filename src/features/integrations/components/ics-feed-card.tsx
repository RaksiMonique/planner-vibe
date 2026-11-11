'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon, LinkIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/shared/submit-button';
import { disableIcsFeedAction, enableIcsFeedAction, rotateIcsFeedAction } from '../actions';

export function IcsFeedCard({ feedUrl }: { feedUrl: string | null }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  if (!feedUrl) {
    return (
      <form action={enableIcsFeedAction} className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Switching the feed on creates a private address that calendar apps can subscribe to.
          Anyone with the address can read your calendar, so treat it like a password.
        </p>
        <SubmitButton size="sm" pendingLabel="Switching on…">
          <LinkIcon data-icon="inline-start" />
          Switch the feed on
        </SubmitButton>
      </form>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Subscription address</span>
        <input
          readOnly
          value={feedUrl}
          aria-label="Subscription address"
          onFocus={(e) => e.currentTarget.select()}
          className="bg-muted/40 w-full rounded-md border px-2 py-1.5 font-mono text-xs"
        />
      </label>
      <p className="text-muted-foreground text-xs">
        In Apple Calendar choose File, New Calendar Subscription; in Google Calendar choose Other
        calendars, From URL; in Outlook choose Add calendar, Subscribe from web. Calendar apps
        refresh a subscription every few hours.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? 'Copied' : 'Copy address'}
        </Button>
        <form action={rotateIcsFeedAction}>
          <SubmitButton size="sm" variant="outline" pendingLabel="Rotating…">
            <RefreshCwIcon data-icon="inline-start" />
            New address
          </SubmitButton>
        </form>
        <form action={disableIcsFeedAction}>
          <SubmitButton size="sm" variant="ghost" pendingLabel="Switching off…">
            <XIcon data-icon="inline-start" />
            Switch the feed off
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
