'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import type { ActionResult } from '@/lib/action-result';
import { autosaveReviewAnswer, saveReviewAction } from '../actions';
import type { ReviewPrompt } from '../templates';

export function ReviewForm({
  review,
  prompts,
}: {
  review: {
    id: string;
    answers: Record<string, string>;
    summary: string | null;
    completedAt: Date | null;
  };
  prompts: ReviewPrompt[];
}) {
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => saveReviewAction(prev, formData),
    null
  );
  const [saved, setSaved] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [, startTransition] = useTransition();

  function autosave(promptId: string, value: string) {
    if ((review.answers[promptId] ?? '') === value) return;
    setSaved((s) => ({ ...s, [promptId]: 'saving' }));
    startTransition(async () => {
      const result = await autosaveReviewAnswer(review.id, promptId, value);
      setSaved((s) => ({ ...s, [promptId]: result.ok ? 'saved' : 'error' }));
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={review.id} />
      {prompts.map((p) => (
        <Field key={p.id}>
          <FieldLabel htmlFor={`answer-${p.id}`} className="font-heading text-base">
            {p.label}
          </FieldLabel>
          <Textarea
            id={`answer-${p.id}`}
            name={`answer:${p.id}`}
            rows={3}
            defaultValue={review.answers[p.id] ?? ''}
            onBlur={(e) => autosave(p.id, e.currentTarget.value)}
          />
          {p.hint && <FieldDescription>{p.hint}</FieldDescription>}
          {saved[p.id] && (
            <span
              className={
                saved[p.id] === 'error'
                  ? 'text-destructive text-xs'
                  : 'text-muted-foreground text-xs'
              }
            >
              {saved[p.id] === 'saving'
                ? 'Saving…'
                : saved[p.id] === 'saved'
                  ? 'Saved'
                  : 'Not saved'}
            </span>
          )}
        </Field>
      ))}
      <Field>
        <FieldLabel htmlFor="review-summary" className="font-heading text-base">
          In a sentence
        </FieldLabel>
        <Textarea
          id="review-summary"
          name="summary"
          rows={2}
          defaultValue={review.summary ?? ''}
          placeholder="Optional summary to remember this period by."
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton variant="outline">Save</SubmitButton>
        {review.completedAt ? (
          <Button type="submit" name="complete" value="0" variant="ghost">
            Reopen
          </Button>
        ) : (
          <Button type="submit" name="complete" value="1">
            Mark complete
          </Button>
        )}
        {state?.ok && <span className="text-muted-foreground text-xs">Saved.</span>}
        {state && !state.ok && (
          <span role="alert" className="text-destructive text-sm">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
