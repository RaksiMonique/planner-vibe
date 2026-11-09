'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/** A dialog whose body receives a `close` callback, for create and edit forms. */
export function FormDialog({
  title,
  description,
  trigger,
  variant = 'default',
  size = 'sm',
  className = 'sm:max-w-lg',
  children,
}: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  className?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

/** Runs a form action and closes the dialog when it succeeds. */
export function useClosingAction<
  T extends (
    prev: import('@/lib/action-result').ActionResult | null,
    fd: FormData
  ) => Promise<import('@/lib/action-result').ActionResult>,
>(action: T, close: () => void) {
  return async (
    prev: import('@/lib/action-result').ActionResult | null,
    formData: FormData
  ): Promise<import('@/lib/action-result').ActionResult> => {
    const result = await action(prev, formData);
    if (result.ok) close();
    return result;
  };
}
