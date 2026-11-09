'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import type { ActionResult } from '@/lib/action-result';
import { createRecordAction, updateRecordAction } from '../actions';
import { IMPORTANT_KIND_META, IMPORTANT_KINDS, fieldsForKind, type ImportantKind } from '../kinds';
import type { ImportantRecord } from '../queries';

export function RecordFormDialog({
  record,
  defaultKind = 'emergency_contact',
  trigger,
  variant = 'default',
  size = 'sm',
}: {
  record?: ImportantRecord;
  defaultKind?: ImportantKind;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {record ? 'Edit record' : 'New record'}
          </DialogTitle>
          <DialogDescription>
            Facts you need in a hurry. Never passwords or card numbers: keep those in a password
            manager.
          </DialogDescription>
        </DialogHeader>
        <RecordForm record={record} defaultKind={defaultKind} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RecordForm({
  record,
  defaultKind,
  onDone,
}: {
  record?: ImportantRecord;
  defaultKind: ImportantKind;
  onDone: () => void;
}) {
  const action = record ? updateRecordAction : createRecordAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null
  );
  const [kind, setKind] = useState<ImportantKind>(record?.kind ?? defaultKind);
  const fields = fieldsForKind(kind);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {record && <input type="hidden" name="id" value={record.id} />}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="record-kind">Kind</FieldLabel>
            <ChoiceSelect
              id="record-kind"
              name="kind"
              value={kind}
              onValueChange={(v) => setKind(v as ImportantKind)}
              options={IMPORTANT_KINDS.map((k) => ({
                value: k,
                label: IMPORTANT_KIND_META[k].label,
              }))}
            />
            <FieldDescription>{IMPORTANT_KIND_META[kind].description}</FieldDescription>
          </Field>
          <Field data-invalid={hasFieldError(state, 'title')}>
            <FieldLabel htmlFor="record-title">Title</FieldLabel>
            <Input
              id="record-title"
              name="title"
              required
              maxLength={160}
              autoFocus
              defaultValue={record?.title}
              placeholder="Mum, GP, car insurance"
            />
            <FieldError errors={fieldErrors(state, 'title')} />
          </Field>
        </div>
        {fields.map((def) => {
          const name = `field_${def.key}`;
          const id = `record-${def.key}`;
          const current = record?.kind === kind ? (record.fields[def.key] ?? '') : '';
          return (
            <Field key={`${kind}:${def.key}`} data-invalid={hasFieldError(state, name)}>
              <FieldLabel htmlFor={id}>{def.label}</FieldLabel>
              {def.type === 'textarea' ? (
                <Textarea
                  id={id}
                  name={name}
                  rows={4}
                  required={def.required}
                  maxLength={2000}
                  defaultValue={current}
                  placeholder={def.placeholder}
                />
              ) : (
                <Input
                  id={id}
                  name={name}
                  type={def.type}
                  required={def.required}
                  maxLength={2000}
                  defaultValue={current}
                  placeholder={def.placeholder}
                />
              )}
              <FieldError errors={fieldErrors(state, name)} />
            </Field>
          );
        })}
        <Field>
          <FieldLabel htmlFor="record-notes">Notes</FieldLabel>
          <Textarea
            id="record-notes"
            name="notes"
            rows={2}
            maxLength={4000}
            defaultValue={record?.notes ?? ''}
          />
        </Field>
        <Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="isSensitive" defaultChecked={record?.isSensitive ?? true} />
            Sensitive: keep out of exports unless I ask
          </label>
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{record ? 'Save changes' : 'Add record'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
