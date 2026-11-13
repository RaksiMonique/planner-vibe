import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, ImagesIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { listGoalOptions } from '@/features/goals/queries';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { listSegments } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { clearBoardCoverAction, deleteBoardAction } from '@/features/vision/actions';
import { BoardFormDialog } from '@/features/vision/components/board-form-dialog';
import { ItemCard } from '@/features/vision/components/item-card';
import { ItemFormDialog } from '@/features/vision/components/item-form-dialog';
import { getBoard, listBoardItems } from '@/features/vision/queries';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Vision board' };
export const dynamic = 'force-dynamic';

export default async function VisionBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const board = await getBoard(user.id, id);
  if (!board) notFound();
  const [segments, goals, projects, items] = await Promise.all([
    listSegments(user.id),
    listGoalOptions(user.id),
    listProjectOptions(user.id),
    listBoardItems(user.id, id),
  ]);
  const addItem = (
    <ItemFormDialog
      boardId={board.id}
      goals={goals}
      projects={projects}
      trigger={
        <>
          <PlusIcon data-icon="inline-start" />
          Add item
        </>
      }
    />
  );

  return (
    <>
      <Link
        href="/vision-boards"
        className="text-muted-foreground mb-3 inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden /> All boards
      </Link>
      <PageHeader
        eyebrow={board.category ?? undefined}
        title={board.name}
        description={board.description ?? undefined}
        actions={
          <>
            {addItem}
            <BoardFormDialog
              board={board}
              segments={segments}
              goals={goals}
              projects={projects}
              variant="outline"
              trigger={
                <>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </>
              }
            />
            <ConfirmActionButton
              action={deleteBoardAction}
              fields={{ id: board.id }}
              title={`Delete "${board.name}"?`}
              description="Every image on it is removed from storage."
              variant="outline"
              trigger={
                <>
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </>
              }
            />
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <SegmentBadge name={board.segment.name} accent={board.segment.accent} />
        {board.goalTitle && board.goalId && (
          <Link href={`/goals/${board.goalId}`}>
            <Badge variant="outline">Goal: {board.goalTitle}</Badge>
          </Link>
        )}
        {board.projectTitle && board.projectId && (
          <Link href={`/projects/${board.projectId}`}>
            <Badge variant="outline">Project: {board.projectTitle}</Badge>
          </Link>
        )}
        <span className="text-muted-foreground ml-auto">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
        {board.coverPath && (
          <form action={clearBoardCoverAction}>
            <input type="hidden" name="id" value={board.id} />
            <Button type="submit" size="xs" variant="ghost">
              Remove cover
            </Button>
          </form>
        )}
      </div>
      {board.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={board.coverUrl} alt="" className="mb-6 max-h-72 w-full rounded-xl object-cover" />
      )}
      {items.length === 0 ? (
        <EmptyState
          icon={ImagesIcon}
          title="An empty board"
          description="Add an image, a quote or a link to begin."
          action={addItem}
        />
      ) : (
        <div className="columns-2 gap-3 md:columns-3 xl:columns-4">
          {items.map((item, i) => (
            <ItemCard key={item.id} item={item} isFirst={i === 0} isLast={i === items.length - 1} />
          ))}
        </div>
      )}
    </>
  );
}
