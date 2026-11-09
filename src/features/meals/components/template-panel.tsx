'use client';

import { useActionState } from 'react';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { applyTemplateAction, deleteTemplateAction, saveTemplateAction } from '../actions';
import type { MealTemplate } from '../queries';

/** Save the visible week as a template, apply one to it, or delete one. */
export function TemplatePanel({
  weekStart,
  templates,
}: {
  weekStart: string;
  templates: MealTemplate[];
}) {
  const [saveState, saveAction] = useActionState(saveTemplateAction, null as ActionResult | null);
  const [applyState, applyAction] = useActionState(
    applyTemplateAction,
    null as ActionResult<{ applied: number }> | null
  );
  return (
    <div className="flex flex-col gap-4 text-sm">
      <form action={saveAction} className="flex flex-col gap-2">
        <input type="hidden" name="date" value={weekStart} />
        <div className="flex gap-2">
          <Input
            name="name"
            placeholder="Save this week as…"
            aria-label="Template name"
            required
            maxLength={80}
          />
          <NativeSelect
            name="kind"
            aria-label="Template covers"
            defaultValue="week"
            className="w-28"
          >
            <option value="week">Week</option>
            <option value="day">First day</option>
          </NativeSelect>
        </div>
        <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
          Save as template
        </SubmitButton>
        {saveState && !saveState.ok && (
          <p role="alert" className="text-destructive">
            {saveState.error}
          </p>
        )}
        {saveState?.ok && <p className="text-muted-foreground text-xs">Template saved.</p>}
      </form>
      {templates.length > 0 && (
        <form action={applyAction} className="flex flex-col gap-2">
          <input type="hidden" name="date" value={weekStart} />
          <div className="flex gap-2">
            <NativeSelect name="templateId" aria-label="Template to apply" required defaultValue="">
              <option value="" disabled>
                Choose a template…
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.kind}, {t.entries.length} meals)
                </option>
              ))}
            </NativeSelect>
            <SubmitButton size="sm" pendingLabel="Applying…">
              Apply to this week
            </SubmitButton>
          </div>
          {applyState && !applyState.ok && (
            <p role="alert" className="text-destructive">
              {applyState.error}
            </p>
          )}
          {applyState?.ok && (
            <p className="text-muted-foreground text-xs">{applyState.data.applied} meals placed.</p>
          )}
        </form>
      )}
      {templates.length > 0 && (
        <ul className="flex flex-col gap-1">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <span className="flex-1 truncate">{t.name}</span>
              <form action={deleteTemplateAction}>
                <input type="hidden" name="id" value={t.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Delete template ${t.name}`}
                >
                  <Trash2Icon />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
