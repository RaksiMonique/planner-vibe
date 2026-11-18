import type { Metadata } from 'next';
import Link from 'next/link';
import { ListChecksIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { TasksWorkspace } from '@/features/tasks/components/tasks-workspace';
import { getWorkSegment } from '@/features/work/queries';
import { requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Work tasks' };
export const dynamic = 'force-dynamic';

/** The Tasks workspace locked to the work segment: list, board and matrix, and the task sheet. */
export default async function WorkTasksPage({ searchParams }: PageProps<'/work/tasks'>) {
  const user = await requireUser();
  const segment = await getWorkSegment(user.id);
  return (
    <TasksWorkspace
      userId={user.id}
      searchParams={await searchParams}
      basePath="/work/tasks"
      lockedSegment={segment}
      title="Work tasks"
      description={`Tasks in your ${segment.name} segment, with the same list, board and matrix views. New tasks start in that segment.`}
      actions={
        <Link
          href={`/tasks?segment=${segment.slug}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <ListChecksIcon data-icon="inline-start" />
          See among all tasks
        </Link>
      }
    />
  );
}
