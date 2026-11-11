'use client';

import { useActionState } from 'react';
import { UploadIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/shared/submit-button';
import { importPlannerAction } from '../actions';

/** Uploads a planner export from another project; rows already imported are skipped. */
export function PlannerImportForm() {
  const [state, action] = useActionState(importPlannerAction, null);
  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="planner-export-file">Planner export (JSON)</Label>
          <Input
            id="planner-export-file"
            name="file"
            type="file"
            accept="application/json,.json"
            required
          />
        </div>
        <SubmitButton size="sm" pendingLabel="Importing…">
          <UploadIcon data-icon="inline-start" />
          Import planner export
        </SubmitButton>
      </form>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Import finished ({state.data.format}).</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th className="py-1 pr-3 font-medium">Table</th>
                <th className="py-1 pr-3 font-medium">Imported</th>
                <th className="py-1 font-medium">Skipped</th>
              </tr>
            </thead>
            <tbody>
              {state.data.tables.map((t) => (
                <tr key={t.key} className="border-t">
                  <td className="py-1 pr-3">{t.key}</td>
                  <td className="py-1 pr-3 tabular-nums">{t.inserted}</td>
                  <td className="py-1 tabular-nums">{t.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {state.data.warnings.length > 0 && (
            <ul className="text-muted-foreground flex flex-col gap-0.5 text-xs">
              {state.data.warnings.slice(0, 12).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {state.data.warnings.length > 12 && (
                <li>and {state.data.warnings.length - 12} more</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
