import type { Metadata } from 'next';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { GoalFormDialog } from '@/features/goals/components/goal-form-dialog';
import { listGoalOptions } from '@/features/goals/queries';
import { LifelongView } from '@/features/horizons/components/lifelong-view';
import { getLifelongData } from '@/features/horizons/queries';
import { listSegments } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Lifelong goals' };
export const dynamic = 'force-dynamic';

export default async function LifelongPage() {
  const user = await requireUser();
  const [data, segments, goalOptions, projectOptions] = await Promise.all([
    getLifelongData(user.id),
    listSegments(user.id),
    listGoalOptions(user.id),
    listProjectOptions(user.id),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Life Segments"
        title="Lifelong goals"
        description="Long-term aspirations, the milestones on the way, and the shorter goals that serve them."
        actions={
          <GoalFormDialog
            segments={segments}
            goalOptions={goalOptions}
            projectOptions={projectOptions}
            defaults={{ horizon: 'lifelong' }}
            trigger={
              <>
                <PlusIcon data-icon="inline-start" />
                New lifelong goal
              </>
            }
          />
        }
      />
      <LifelongView
        data={data}
        segments={segments}
        goalOptions={goalOptions}
        projectOptions={projectOptions}
      />
    </>
  );
}
