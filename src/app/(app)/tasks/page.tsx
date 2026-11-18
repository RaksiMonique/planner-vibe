import type { Metadata } from 'next';
import { TasksWorkspace } from '@/features/tasks/components/tasks-workspace';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Tasks' };
export const dynamic = 'force-dynamic';

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  const user = await requireUser();
  return (
    <TasksWorkspace
      userId={user.id}
      searchParams={await searchParams}
      basePath="/tasks"
      title="Tasks"
      description="Everything actionable, grouped by when it is due. Mark what is important and the matrix sorts itself."
    />
  );
}
