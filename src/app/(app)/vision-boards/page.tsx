import type { Metadata } from 'next';
import { ImagesIcon, PlusIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { listGoalOptions } from '@/features/goals/queries';
import { listSegments } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { BoardCard } from '@/features/vision/components/board-card';
import { BoardFormDialog } from '@/features/vision/components/board-form-dialog';
import { listBoards } from '@/features/vision/queries';
import { VISION_CATEGORIES } from '@/features/vision/schema';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Vision boards' };
export const dynamic = 'force-dynamic';

export default async function VisionBoardsPage() {
  const user = await requireUser();
  const [segments, goals, projects, boards] = await Promise.all([
    listSegments(user.id),
    listGoalOptions(user.id),
    listProjectOptions(user.id),
    listBoards(user.id),
  ]);
  const createDialog = (
    <BoardFormDialog
      segments={segments}
      goals={goals}
      projects={projects}
      trigger={
        <>
          <PlusIcon data-icon="inline-start" />
          New board
        </>
      }
    />
  );
  const categories = [...new Set(boards.map((b) => b.category).filter(Boolean))] as string[];

  return (
    <>
      <PageHeader
        eyebrow="Lifestyle"
        title="Vision boards"
        description="Pictures, quotes and links for the life you are building, one board per theme, linked to the goals and projects they inspire."
        actions={createDialog}
      />
      {boards.length === 0 ? (
        <EmptyState
          icon={ImagesIcon}
          title="No boards yet"
          description={`Start with something concrete: ${VISION_CATEGORIES.slice(0, 4).join(', ').toLowerCase()}.`}
          action={createDialog}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {(categories.length > 1 ? categories : [null]).map((category) => {
            const group = category ? boards.filter((b) => b.category === category) : boards;
            return (
              <section key={category ?? 'all'} className="flex flex-col gap-3">
                {category && <h2 className="font-heading text-xl">{category}</h2>}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.map((b) => (
                    <BoardCard key={b.id} board={b} />
                  ))}
                </div>
              </section>
            );
          })}
          {categories.length > 1 && boards.some((b) => !b.category) && (
            <section className="flex flex-col gap-3">
              <h2 className="font-heading text-xl">Other</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {boards
                  .filter((b) => !b.category)
                  .map((b) => (
                    <BoardCard key={b.id} board={b} />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
