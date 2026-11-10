'use client';

import { useActionState } from 'react';
import { MailIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendMagicLink, type MagicLinkState } from '@/features/auth/actions';

const initial: MagicLinkState = { status: 'idle' };

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === 'sent') {
    return (
      <p className="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-sm">
        We sent a sign-in link to <span className="font-medium">{state.email}</span>. Open it on
        this device to continue.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          defaultValue={state.status === 'error' ? state.email : (state.email ?? '')}
          aria-invalid={state.status === 'error' || undefined}
        />
      </div>
      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        <MailIcon data-icon="inline-start" />
        {pending ? 'Sending link…' : 'Email me a sign-in link'}
      </Button>
    </form>
  );
}
