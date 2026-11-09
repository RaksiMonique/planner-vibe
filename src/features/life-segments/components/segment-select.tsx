'use client';

import { SegmentDot } from '@/components/shared/segment-badge';
import type { SegmentRef } from '../types';
import { ChoiceSelect } from './choice-select';

export function SegmentSelect({
  segments,
  name = 'lifeSegmentId',
  id,
  defaultValue,
  required = true,
}: {
  segments: SegmentRef[];
  name?: string;
  id?: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <ChoiceSelect
      name={name}
      id={id}
      required={required}
      placeholder="Choose a Life Segment"
      defaultValue={defaultValue ?? segments[0]?.id ?? null}
      options={segments.map((s) => ({
        value: s.id,
        label: (
          <span className="flex items-center gap-2">
            <SegmentDot accent={s.accent} />
            {s.name}
          </span>
        ),
      }))}
    />
  );
}
