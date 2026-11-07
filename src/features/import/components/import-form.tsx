'use client';

import { useActionState } from 'react';
import { UploadIcon } from 'lucide-react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SubmitButton } from '@/components/shared/submit-button';
import { importLegacyAction } from '../actions';

const LABELS: Record<string, string> = {
  tasks: 'Tasks',
  captures: 'Tasks without a segment (sent to the Inbox)',
  habits: 'Habits',
  checkIns: 'Habit check-ins',
  goals: 'Goals (annual)',
  routines: 'Routines',
  steps: 'Routine steps',
  bibleStudies: 'Bible studies (Release 3)',
  studies: 'Studies (Release 3)',
  recipes: 'Recipes (Release 4)',
  mealPlan: 'Meal plan days (Release 4)',
  journal: 'Journal entries (Release 3)',
  quotes: 'Quotes (Release 3)',
};

export function ImportForm() {
  const [state, action] = useActionState(importLegacyAction, null);
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="legacy-file">JSON export from the old planner</FieldLabel>
          <Input
            id="legacy-file"
            name="file"
            type="file"
            accept=".json,application/json"
            required
          />
          <FieldDescription>
            Tasks, habits, goals and routines are imported now. Bible studies, studies, recipes,
            meal plans, journal entries and quotes are kept for the releases that add those modules.
            Importing the same file twice adds nothing.
          </FieldDescription>
        </Field>
        <div className="flex items-center gap-3">
          <SubmitButton size="sm" pendingLabel="Importing…">
            <UploadIcon data-icon="inline-start" />
            Import
          </SubmitButton>
          {state && !state.ok && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
        </div>
      </form>

      {state?.ok && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Import finished.</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead className="text-right">Imported</TableHead>
                <TableHead className="text-right">Skipped</TableHead>
                <TableHead className="text-right">Deferred</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.keys(state.data.imported).map((key) => (
                <TableRow key={key}>
                  <TableCell>{LABELS[key] ?? key}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {state.data.imported[key]}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {state.data.skipped[key] ?? '–'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">–</TableCell>
                </TableRow>
              ))}
              {Object.entries(state.data.deferred).map(([key, count]) => (
                <TableRow key={key}>
                  <TableCell>{LABELS[key] ?? key}</TableCell>
                  <TableCell className="text-right tabular-nums">–</TableCell>
                  <TableCell className="text-right tabular-nums">–</TableCell>
                  <TableCell className="text-right tabular-nums">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {state.data.problems.length > 0 && (
            <ul className="text-destructive list-disc pl-5 text-sm">
              {state.data.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
