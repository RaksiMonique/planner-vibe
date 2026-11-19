import Link from 'next/link';
import { ImagesIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { listBoardItems, listBoards } from '../queries';

const THUMBS = 6;
const TEXT_ITEMS = 3;

/** The most recently updated vision board: its name and a few of its images. */
export async function VisionDashboardCard({ userId }: { userId: string }) {
  const boards = await listBoards(userId);
  const board = [...boards].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  const items = board ? await listBoardItems(userId, board.id) : [];
  // Signed URLs last a week (lib/storage), so the browser caches each thumbnail.
  const images = items.filter((i) => i.kind === 'image' && i.imageUrl).slice(0, THUMBS);
  const texts = items.filter((i) => i.kind !== 'image').slice(0, TEXT_ITEMS);
  const others = boards.length - 1;

  return (
    <DashboardCard title="Vision board" icon={ImagesIcon} href="/vision-boards" release={6}>
      {!board ? (
        <EmptyNote>
          No board yet.{' '}
          <Link href="/vision-boards" className="text-primary link">
            Start a vision board.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="flex items-baseline gap-2 text-sm">
            <Link
              href={`/vision-boards/${board.id}`}
              className="link min-w-0 flex-1 truncate font-medium"
            >
              {board.name}
            </Link>
            <span className="text-muted-foreground shrink-0 text-xs">
              {board.itemCount} {board.itemCount === 1 ? 'item' : 'items'}
            </span>
          </p>
          {images.length > 0 ? (
            <Link
              href={`/vision-boards/${board.id}`}
              className="grid grid-cols-3 gap-1.5"
              aria-label={`Open ${board.name}`}
            >
              {images.map((item) => (
                <span
                  key={item.id}
                  className="bg-blush block aspect-square overflow-hidden rounded-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl!}
                    alt={item.caption ?? ''}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </span>
              ))}
            </Link>
          ) : texts.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {texts.map((item) => (
                <li key={item.id} className="text-muted-foreground line-clamp-2 text-xs">
                  {item.kind === 'quote' ? `“${item.quoteText}”` : (item.caption ?? item.url)}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>This board is empty so far.</EmptyNote>
          )}
          {others > 0 && (
            <Link href="/vision-boards" className="text-primary link text-xs">
              {others} more on the Vision boards page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
