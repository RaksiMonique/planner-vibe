'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { cn } from '@/lib/utils';
import {
  DEFAULT_RECURRENCE,
  WEEKDAY_CODES,
  WEEKDAY_LABELS,
  describeRecurrence,
  weekdayOf,
  type MonthlyMode,
  type RecurrenceEnd,
  type RecurrenceFields as Fields,
  type WeekdayCode,
} from '../recurrence';
import { RECURRENCE_LABELS, RECURRENCE_PRESETS, type RecurrencePreset } from '../schema';

const ORDINAL = ['first', 'second', 'third', 'fourth', 'last'];

const fieldErrors = (state: ActionResult<unknown> | null, name: string) =>
  state && !state.ok ? state.fieldErrors?.[name]?.map((message) => ({ message })) : undefined;

/**
 * How an event repeats: a frequency, every N, weekdays for weekly, the same
 * day or weekday for monthly, and an end. Reads back in one line underneath.
 */
export function RecurrenceFields({
  initial,
  start,
  state,
}: {
  initial?: Partial<Fields>;
  /** Local yyyy-MM-dd (or yyyy-MM-ddTHH:mm) of the event's start. */
  start: string;
  state: ActionResult<unknown> | null;
}) {
  const [recurrence, setRecurrence] = useState<RecurrencePreset>(
    initial?.recurrence ?? DEFAULT_RECURRENCE.recurrence
  );
  const [interval, setInterval] = useState(String(initial?.recurrenceInterval ?? 1));
  const [days, setDays] = useState<WeekdayCode[]>(initial?.recurrenceDays ?? []);
  const [monthly, setMonthly] = useState<MonthlyMode>(initial?.recurrenceMonthly ?? 'day');
  const [end, setEnd] = useState<RecurrenceEnd>(initial?.recurrenceEnd ?? 'never');
  const [until, setUntil] = useState(initial?.recurrenceUntil ?? '');
  const [count, setCount] = useState(String(initial?.recurrenceCount ?? 3));

  const startKey = start ? start.slice(0, 10) : '';
  const startWeekday = startKey ? weekdayOf(startKey) : undefined;
  const chosenDays = days.length > 0 ? days : startWeekday ? [startWeekday] : [];
  const repeats = recurrence !== 'none';
  const fields: Fields = {
    recurrence,
    recurrenceInterval: Math.max(1, Number(interval) || 1),
    recurrenceDays: chosenDays,
    recurrenceMonthly: monthly,
    recurrenceEnd: end,
    recurrenceUntil: until || undefined,
    recurrenceCount: Number(count) || undefined,
  };
  const summary = startKey ? describeRecurrence(fields, startKey) : '';
  const startDate = startKey ? parseISO(startKey) : null;
  const unit = { daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' } as const;

  const toggleDay = (code: WeekdayCode) =>
    setDays((current) => {
      const base = current.length > 0 ? current : chosenDays;
      const next = base.includes(code) ? base.filter((d) => d !== code) : [...base, code];
      return WEEKDAY_CODES.filter((d) => next.includes(d));
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="event-recurrence">Repeats</FieldLabel>
          <NativeSelect
            id="event-recurrence"
            name="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as RecurrencePreset)}
          >
            {RECURRENCE_PRESETS.map((p) => (
              <option key={p} value={p}>
                {RECURRENCE_LABELS[p]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {repeats && (
          <Field data-invalid={Boolean(fieldErrors(state, 'recurrenceInterval'))}>
            <FieldLabel htmlFor="event-recurrence-interval">Every</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id="event-recurrence-interval"
                name="recurrenceInterval"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-20"
              />
              <span className="text-muted-foreground text-sm">
                {Number(interval) === 1 ? unit[recurrence].slice(0, -1) : unit[recurrence]}
              </span>
            </div>
            <FieldError errors={fieldErrors(state, 'recurrenceInterval')} />
          </Field>
        )}
      </div>

      {repeats && recurrence === 'weekly' && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium">On</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_CODES.map((code) => {
              const on = chosenDays.includes(code);
              return (
                <label
                  key={code}
                  className={cn(
                    'cursor-pointer rounded-full border px-2.5 py-1 text-xs select-none',
                    on ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'
                  )}
                >
                  <input
                    type="checkbox"
                    name="recurrenceDays[]"
                    value={code}
                    checked={on}
                    onChange={() => toggleDay(code)}
                    className="sr-only"
                  />
                  {WEEKDAY_LABELS[code]}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {repeats && recurrence === 'monthly' && startDate && (
        <Field>
          <FieldLabel htmlFor="event-recurrence-monthly">On</FieldLabel>
          <NativeSelect
            id="event-recurrence-monthly"
            name="recurrenceMonthly"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value as MonthlyMode)}
          >
            <option value="day">Day {startDate.getDate()} of the month</option>
            <option value="weekday">
              The {ORDINAL[Math.min(Math.ceil(startDate.getDate() / 7), 5) - 1]}{' '}
              {format(startDate, 'EEEE')} of the month
            </option>
          </NativeSelect>
        </Field>
      )}

      {repeats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="event-recurrence-end">Repeat ends</FieldLabel>
            <NativeSelect
              id="event-recurrence-end"
              name="recurrenceEnd"
              value={end}
              onChange={(e) => setEnd(e.target.value as RecurrenceEnd)}
            >
              <option value="never">Never</option>
              <option value="until">On a date</option>
              <option value="count">After a number of times</option>
            </NativeSelect>
          </Field>
          {end === 'until' && (
            <Field data-invalid={Boolean(fieldErrors(state, 'recurrenceUntil'))}>
              <FieldLabel htmlFor="event-recurrence-until">Last day</FieldLabel>
              <Input
                id="event-recurrence-until"
                name="recurrenceUntil"
                type="date"
                value={until}
                min={startKey || undefined}
                onChange={(e) => setUntil(e.target.value)}
                required
              />
              <FieldError errors={fieldErrors(state, 'recurrenceUntil')} />
            </Field>
          )}
          {end === 'count' && (
            <Field data-invalid={Boolean(fieldErrors(state, 'recurrenceCount'))}>
              <FieldLabel htmlFor="event-recurrence-count">Times</FieldLabel>
              <Input
                id="event-recurrence-count"
                name="recurrenceCount"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                required
              />
              <FieldError errors={fieldErrors(state, 'recurrenceCount')} />
            </Field>
          )}
        </div>
      )}
      {summary && <FieldDescription>{summary}</FieldDescription>}
    </div>
  );
}
