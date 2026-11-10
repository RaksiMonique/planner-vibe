'use client';

import { useActionState } from 'react';
import { KeyRoundIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInWithPassword, type PasswordState } from '@/features/auth/actions';

const initial: PasswordState = { status: 'idle' };

export function PasswordForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInWithPassword, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-email">Email</Label>
        <Input
          id="password-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          defaultValue={state.status === 'error' ? state.email : (state.email ?? '')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.status === 'error' || undefined}
        />
      </div>
      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        <KeyRoundIcon data-icon="inline-start" />
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
