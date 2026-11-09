'use client';

import { useTransition } from 'react';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { setStudyStatusAction } from '../actions';
import { STUDY_STATUS_LABELS, STUDY_STATUSES, type StudyStatus } from '../schema';

export function StudyStatusControls({ id, status }: { id: string; status: StudyStatus }) {
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      key={status}
      aria-label="Status"
      defaultValue={status}
      disabled={pending}
      className="w-auto"
      onChange={(e) => {
        const fd = new FormData();
        fd.set('id', id);
        fd.set('status', e.target.value);
        start(() => setStudyStatusAction(fd));
      }}
    >
      {STUDY_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STUDY_STATUS_LABELS[s]}
        </option>
      ))}
    </NativeSelect>
  );
}
