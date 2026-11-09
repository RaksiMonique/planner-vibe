import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2Icon, PrinterIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { deleteGroceryListAction, setGroceryListStatusAction } from '@/features/meals/actions';
import { AddGroceryItemForm, GroceryItemRow } from '@/features/meals/components/grocery-forms';
import { getGroceryList } from '@/features/meals/queries';
import { requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Grocery list' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;

export default async function GroceryListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { by } = await searchParams;
  const list = await getGroceryList(user.id, id);
  if (!list) notFound();
  const groupBy = by === 'store' ? 'store' : 'category';
  const groups = new Map<string, typeof list.items>();
  for (const item of list.items) {
    const key =
      (groupBy === 'store' ? item.store : item.category) ??
      (groupBy === 'store' ? 'Any store' : 'other');
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const bought = list.items.filter((i) => i.isPurchased).length;

  return (
    <>
      <PageHeader
        eyebrow="Groceries"
        title={list.name}
        description={`${bought} of ${list.items.length} bought`}
        actions={
          <>
            <Link
              href={`/groceries/${list.id}/print`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <PrinterIcon data-icon="inline-start" />
              Print
            </Link>
            <form action={setGroceryListStatusAction}>
              <input type="hidden" name="id" value={list.id} />
              <input type="hidden" name="status" value={list.status === 'open' ? 'done' : 'open'} />
              <Button type="submit" variant="outline" size="sm">
                {list.status === 'open' ? (
                  <>
                    <CheckCircle2Icon data-icon="inline-start" />
                    Mark done
                  </>
                ) : (
                  <>
                    <RotateCcwIcon data-icon="inline-start" />
                    Reopen
                  </>
                )}
              </Button>
            </form>
            <ConfirmActionButton
              action={deleteGroceryListAction}
              fields={{ id: list.id }}
              title="Delete this list?"
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
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Group by</span>
        <Link
          href={`/groceries/${list.id}`}
          className={cn(
            'rounded-full border px-2 py-0.5',
            groupBy === 'category' && 'border-primary bg-secondary'
          )}
        >
          aisle
        </Link>
        <Link
          href={`/groceries/${list.id}?by=store`}
          className={cn(
            'rounded-full border px-2 py-0.5',
            groupBy === 'store' && 'border-primary bg-secondary'
          )}
        >
          store
        </Link>
      </div>
      <Card className="mb-4">
        <CardContent>
          <AddGroceryItemForm listId={list.id} />
        </CardContent>
      </Card>
      {list.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing on the list yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {[...groups.entries()].map(([group, items]) => (
            <Card key={group} size="sm">
              <CardHeader>
                <CardTitle className="tracking-eyebrow text-muted-foreground text-xs uppercase">
                  {group}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <GroceryItemRow key={item.id} item={item} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
