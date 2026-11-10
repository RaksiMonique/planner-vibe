'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePassword, type NewPasswordState } from '@/features/auth/actions';

const initial: NewPasswordState = { status: 'idle' };

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Repeat it</Label>
        <Input
          id="confirm-password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      {state.status === 'saved' && (
        <p className="text-muted-foreground text-sm">Saved. You can sign in with it from now on.</p>
      )}
      <Button type="submit" disabled={pending} variant="outline" className="self-start">
        {pending ? 'Saving…' : 'Set password'}
      </Button>
    </form>
  );
}
