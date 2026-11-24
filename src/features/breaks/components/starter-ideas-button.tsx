'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addStarterBreakIdeasAction } from '../actions';

/** Fills an empty list with the starter ideas, then re-reads the page. */
export function StarterIdeasButton({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await addStarterBreakIdeasAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (onChanged) onChanged();
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={add} disabled={pending}>
        <SparklesIcon data-icon="inline-start" />
        {pending ? 'Adding…' : 'Add starter ideas'}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
