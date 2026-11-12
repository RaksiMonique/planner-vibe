'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setTaskStatusAction } from '../actions';
import type { Blocker } from '../dependencies';
import { BOARD_COLUMNS, type BoardColumn } from '../grouping';
import { BlockedConfirm } from './blocked-confirm';

export function BoardMove({
  id,
  status,
  blockedBy = [],
}: {
  id: string;
  status: BoardColumn;
  blockedBy?: Blocker[];
}) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const move = (to: BoardColumn) => start(async () => void (await setTaskStatusAction(id, to)));
  return (
    <div className="flex flex-wrap gap-1">
      {BOARD_COLUMNS.filter((c) => c.key !== status).map((c) => (
        <Button
          key={c.key}
          type="button"
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (c.key === 'done' && blockedBy.length > 0) setConfirming(true);
            else move(c.key);
          }}
        >
          → {c.label}
        </Button>
      ))}
      {blockedBy.length > 0 && (
        <BlockedConfirm
          open={confirming}
          onOpenChange={setConfirming}
          blockedBy={blockedBy}
          onConfirm={() => {
            setConfirming(false);
            move('done');
          }}
        />
      )}
    </div>
  );
}
