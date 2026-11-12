'use client';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { GoalForm } from '@/features/goals/components/goal-form-dialog';
import type { GoalOption } from '@/features/goals/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import { linkGoalAction } from '../actions';

/** Creates a goal and links it to the project in one go. */
export function NewLinkedGoal({
  projectId,
  lifeSegmentId,
  segments,
  goalOptions,
}: {
  projectId: string;
  lifeSegmentId: string;
  segments: SegmentRef[];
  goalOptions: GoalOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        New goal
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">New goal</DialogTitle>
          <DialogDescription>
            A measurable outcome this project works towards. It is linked to the project as soon as
            it is saved.
          </DialogDescription>
        </DialogHeader>
        <GoalForm
          segments={segments}
          goalOptions={goalOptions}
          defaults={{ lifeSegmentId }}
          onDone={async (saved) => {
            const link = new FormData();
            link.set('goalId', saved.id);
            link.set('projectId', projectId);
            await linkGoalAction(link);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
