'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ActionResult } from '@/lib/action-result';
import { createVehicleAction, updateVehicleAction } from '../actions';
import type { Vehicle } from '../queries';

export function VehicleFormDialog({
  segments,
  vehicle,
  defaultSegmentId,
  trigger,
  variant = 'default',
  size = 'sm',
}: {
  segments: SegmentRef[];
  vehicle?: Vehicle;
  defaultSegmentId?: string;
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
            {vehicle ? 'Edit vehicle' : 'New vehicle'}
          </DialogTitle>
          <DialogDescription>
            The vehicle itself. Its papers and their dates go on the card afterwards.
          </DialogDescription>
        </DialogHeader>
        <VehicleForm
          segments={segments}
          vehicle={vehicle}
          defaultSegmentId={defaultSegmentId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function VehicleForm({
  segments,
  vehicle,
  defaultSegmentId,
  onDone,
}: {
  segments: SegmentRef[];
  vehicle?: Vehicle;
  defaultSegmentId?: string;
  onDone: () => void;
}) {
  const action = vehicle ? updateVehicleAction : createVehicleAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'make')}>
            <FieldLabel htmlFor="vehicle-make">Make</FieldLabel>
            <Input
              id="vehicle-make"
              name="make"
              required
              maxLength={80}
              autoFocus
              defaultValue={vehicle?.make}
              placeholder="Toyota"
            />
            <FieldError errors={fieldErrors(state, 'make')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'model')}>
            <FieldLabel htmlFor="vehicle-model">Model</FieldLabel>
            <Input
              id="vehicle-model"
              name="model"
              required
              maxLength={80}
              defaultValue={vehicle?.model}
              placeholder="Aqua"
            />
            <FieldError errors={fieldErrors(state, 'model')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={hasFieldError(state, 'year')}>
            <FieldLabel htmlFor="vehicle-year">Year</FieldLabel>
            <Input
              id="vehicle-year"
              name="year"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              defaultValue={vehicle?.year ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'year')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-colour">Colour</FieldLabel>
            <Input
              id="vehicle-colour"
              name="colour"
              maxLength={40}
              defaultValue={vehicle?.colour ?? ''}
              placeholder="Blue"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-plate">Licence plate</FieldLabel>
            <Input
              id="vehicle-plate"
              name="licensePlate"
              maxLength={20}
              defaultValue={vehicle?.licensePlate ?? ''}
              className="uppercase"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="vehicle-name">Name</FieldLabel>
            <Input
              id="vehicle-name"
              name="name"
              maxLength={80}
              defaultValue={vehicle?.name ?? ''}
              placeholder="The blue one"
            />
            <FieldDescription>
              Optional. Otherwise it goes by year, make and model.
            </FieldDescription>
          </Field>
          <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
            <FieldLabel htmlFor="vehicle-segment">Life Segment</FieldLabel>
            <SegmentSelect
              id="vehicle-segment"
              segments={segments}
              defaultValue={vehicle?.lifeSegmentId ?? defaultSegmentId}
            />
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="vehicle-notes">Notes</FieldLabel>
          <Textarea
            id="vehicle-notes"
            name="notes"
            rows={2}
            maxLength={2000}
            defaultValue={vehicle?.notes ?? ''}
            placeholder="Chassis number, where the spare key lives, the mechanic's name"
          />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{vehicle ? 'Save changes' : 'Add vehicle'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
