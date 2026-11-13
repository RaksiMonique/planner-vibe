import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { ShoppingBasketIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { NewGroceryListForm } from '@/features/meals/components/grocery-forms';
import { listGroceryLists } from '@/features/meals/queries';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Groceries' };
export const dynamic = 'force-dynamic';

export default async function GroceriesPage() {
  const user = await requireUser();
  const lists = await listGroceryLists(user.id);
  const open = lists.filter((l) => l.status === 'open');
  const done = lists.filter((l) => l.status === 'done');

  const ListCard = ({ list }: { list: (typeof lists)[number] }) => (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/groceries/${list.id}`}
            className="font-heading min-w-0 flex-1 truncate text-lg hover:underline"
          >
            {list.name}
          </Link>
          {list.planId && <Badge variant="outline">From the meal plan</Badge>}
        </div>
        <ProgressBar
          value={list.itemCount ? Math.round((list.purchasedCount / list.itemCount) * 100) : 0}
          valueText={`${list.purchasedCount} of ${list.itemCount} bought`}
        />
        <p className="text-muted-foreground text-xs">
          Created {format(list.createdAt, 'd MMM yyyy')}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Groceries"
        description="Lists built from the meal plan, plus anything you add by hand. Print one before you shop."
        actions={<NewGroceryListForm />}
      />
      {lists.length === 0 ? (
        <EmptyState
          icon={ShoppingBasketIcon}
          title="No lists yet"
          description="Generate one from the meal planner, or start an empty list above."
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="font-heading mb-2 text-xl">Open</h2>
            {open.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing to buy right now.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {open.map((l) => (
                  <ListCard key={l.id} list={l} />
                ))}
              </div>
            )}
          </section>
          {done.length > 0 && (
            <section>
              <h2 className="font-heading mb-2 text-xl">Done</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {done.map((l) => (
                  <ListCard key={l.id} list={l} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
