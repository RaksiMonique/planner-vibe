'use client';

import { useActionState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { SubmitButton } from '@/components/shared/submit-button';
import { importDeferredAction } from '../actions';
import { ImportSummaryTable } from './import-summary';

/** Imports the sections earlier releases kept raw, from the stored export. */
export function ImportDeferredForm({
  file,
}: {
  file: { fileName: string | null; importedAt: string; alreadyDone: boolean };
}) {
  const [state, action] = useActionState(importDeferredAction, null);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Stored export: {file.fileName ?? 'unnamed file'}, uploaded {file.importedAt}.
        {file.alreadyDone && ' The rest was already imported; running again adds nothing new.'}
      </p>
      <form action={action} className="flex items-center gap-3">
        <SubmitButton size="sm" variant="outline" pendingLabel="Importing…">
          <RefreshCwIcon data-icon="inline-start" />
          Import deferred sections
        </SubmitButton>
        {state && !state.ok && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
      </form>
      {state?.ok && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Import finished.</p>
          <ImportSummaryTable summary={state.data} />
        </div>
      )}
    </div>
  );
}
