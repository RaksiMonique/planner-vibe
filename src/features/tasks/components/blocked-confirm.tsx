'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Blocker } from '../dependencies';

/**
 * Asked before a blocked task is completed. Life does not always run in
 * order, so the answer can be yes; the point is that it is a choice.
 */
export function BlockedConfirm({
  open,
  onOpenChange,
  blockedBy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockedBy: Blocker[];
  onConfirm: () => void;
}) {
  const names = blockedBy.map((b) => `“${b.title}”`).join(', ');
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete a blocked task?</AlertDialogTitle>
          <AlertDialogDescription>
            It is still waiting on {names}. You can complete it anyway.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it open</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Complete anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
