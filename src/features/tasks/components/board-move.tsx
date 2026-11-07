'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setTaskStatusAction } from '../actions';
import { BOARD_COLUMNS, type BoardColumn } from '../grouping';

export function BoardMove({ id, status }: { id: string; status: BoardColumn }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-1">
      {BOARD_COLUMNS.filter((c) => c.key !== status).map((c) => (
        <Button
          key={c.key}
          type="button"
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => start(async () => void (await setTaskStatusAction(id, c.key)))}
        >
          → {c.label}
        </Button>
      ))}
    </div>
  );
}
