'use client';

import { useActionState, useState } from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { deleteAllDataAction } from '../actions';

export function DeleteDataDialog() {
  const [state, action] = useActionState(deleteAllDataAction, null);
  const [typed, setTyped] = useState('');
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete all planner data
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="contents">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TriangleAlertIcon className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete every planner record?</AlertDialogTitle>
            <AlertDialogDescription>
              Segments, goals, projects, tasks, events, habits, routines and imports are removed
              permanently. Your login is not affected. Export first if you might want this back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="confirm-delete">Type DELETE to confirm</FieldLabel>
            <Input
              id="confirm-delete"
              name="confirm"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
            <FieldError errors={state && !state.ok ? [{ message: state.error }] : undefined} />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my data</AlertDialogCancel>
            <SubmitButton
              variant="destructive"
              disabled={typed !== 'DELETE'}
              pendingLabel="Deleting…"
            >
              Delete everything
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
