import Link from 'next/link';
import { ShoppingBasketIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { getGroceryList, listGroceryLists } from '../queries';
import { GroceryTick } from './grocery-tick';

const PREVIEW = 8;

/** What is still to buy on the newest open grocery list, with ticks. */
export async function GroceriesDashboardCard({ userId }: { userId: string }) {
  const lists = await listGroceryLists(userId);
  const open = lists.find((l) => l.status === 'open');
  const list = open ? await getGroceryList(userId, open.id) : null;
  // Already in the list page's default order: aisle, then the list's own order.
  const toBuy = list?.items.filter((i) => !i.isPurchased) ?? [];
  const shown = toBuy.slice(0, PREVIEW);
  const more = toBuy.length - shown.length;

  return (
    <DashboardCard title="Groceries" icon={ShoppingBasketIcon} href="/groceries" release={6}>
      {!list ? (
        <EmptyNote>
          The list is clear.{' '}
          <Link href="/groceries" className="text-primary link">
            Start one or generate it from the meal plan.
          </Link>
        </EmptyNote>
      ) : toBuy.length === 0 ? (
        <EmptyNote>
          Everything on{' '}
          <Link href={`/groceries/${list.id}`} className="text-primary link">
            {list.name}
          </Link>{' '}
          is bought.
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {toBuy.length} left to buy on{' '}
            <Link href={`/groceries/${list.id}`} className="link">
              {list.name}
            </Link>
            .
          </p>
          <ul className="flex flex-col gap-1.5">
            {shown.map((item) => (
              <GroceryTick key={`${item.id}:${item.isPurchased}`} item={item} />
            ))}
          </ul>
          {more > 0 && (
            <Link href={`/groceries/${list.id}`} className="text-primary link text-xs">
              {more} more on the list page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
