'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { LayoutTemplateIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { applyTemplateAction, deleteTemplateAction, saveTemplateAction } from '../actions';
import { TEMPLATE_KINDS } from '../schema';
import type { SegmentOption } from './block-dialog';

export type TemplateView = { id: string; name: string; kind: 'day' | 'week'; blockCount: number };

export function TemplatesPanel({
  templates,
  segments,
  visibleDate,
  visibleKind,
  onChanged,
}: {
  templates: TemplateView[];
  segments: SegmentOption[];
  /** yyyy-MM-dd of the first visible day. */
  visibleDate: string;
  visibleKind: 'day' | 'week';
  onChanged: () => void;
}) {
  const [saveState, saveAction] = useActionState(saveTemplateAction, null);
  const [applyState, applyAction] = useActionState(applyTemplateAction, null);
  const [applying, setApplying] = useState<string | null>(null);
  const handledSave = useRef<typeof saveState>(null);
  const handledApply = useRef<typeof applyState>(null);
  const saveForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (saveState?.ok && handledSave.current !== saveState) {
      handledSave.current = saveState;
      saveForm.current?.reset();
      onChanged();
    }
  }, [saveState, onChanged]);
  useEffect(() => {
    if (applyState?.ok && handledApply.current !== applyState) {
      handledApply.current = applyState;
      setApplying(null);
      onChanged();
    }
  }, [applyState, onChanged]);

  async function remove(id: string) {
    const result = await deleteTemplateAction(id);
    if (result.ok) onChanged();
  }

  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <h3 className="font-heading flex items-center gap-2 text-lg">
        <LayoutTemplateIcon className="text-primary size-4" aria-hidden />
        Templates
      </h3>

      <form ref={saveForm} action={saveAction} className="flex flex-col gap-2">
        <input type="hidden" name="date" value={visibleDate} />
        <div className="flex gap-2">
          <Input
            name="name"
            placeholder="Save the visible plan as…"
            aria-label="Template name"
            required
          />
          <NativeSelect
            name="kind"
            defaultValue={visibleKind}
            aria-label="Template kind"
            className="w-24"
          >
            {TEMPLATE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k === 'day' ? 'Day' : 'Week'}
              </option>
            ))}
          </NativeSelect>
        </div>
        <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
          Save as template
        </SubmitButton>
        {saveState && !saveState.ok && (
          <p role="alert" className="text-destructive text-xs">
            {saveState.error}
          </p>
        )}
      </form>

      {templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Save a day or week you like and reuse it later.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                <span className="text-muted-foreground text-xs">
                  {t.kind === 'day' ? 'Day' : 'Week'} · {t.blockCount} blocks
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => remove(t.id)}
                >
                  <Trash2Icon />
                </Button>
              </div>
              {applying === t.id ? (
                <form action={applyAction} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <Input
                    name="date"
                    type="date"
                    defaultValue={visibleDate}
                    aria-label="Apply on"
                    required
                  />
                  <NativeSelect
                    name="lifeSegmentId"
                    defaultValue={segments[0]?.id ?? ''}
                    aria-label="Segment for unassigned blocks"
                  >
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <div className="flex gap-2">
                    <SubmitButton size="sm" pendingLabel="Applying…">
                      Apply
                    </SubmitButton>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setApplying(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                  {applyState && !applyState.ok && (
                    <p role="alert" className="text-destructive text-xs">
                      {applyState.error}
                    </p>
                  )}
                </form>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setApplying(t.id)}
                >
                  Apply to {t.kind === 'day' ? 'a day' : 'a week'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {applyState?.ok && (
        <p className="text-muted-foreground text-xs">Added {applyState.data.created} blocks.</p>
      )}
    </section>
  );
}
