import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { PrintButton } from '@/features/meals/components/grocery-forms';
import { formatQuantity } from '@/features/meals/consolidate';
import { getGroceryList } from '@/features/meals/queries';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Print grocery list' };
export const dynamic = 'force-dynamic';

/** A plain checklist for paper or PDF. The app shell is hidden when printing. */
export default async function PrintGroceryListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const list = await getGroceryList(user.id, id);
  if (!list) notFound();
  const groups = new Map<string, typeof list.items>();
  for (const item of list.items) {
    const key = item.category ?? 'other';
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <div className="mx-auto max-w-2xl">
      <style>{`@media print { aside, header, .no-print { display: none !important; } main { padding: 0 !important; } }`}</style>
      <div className="no-print mb-4 flex items-center gap-2">
        <PrintButton />
        <Link href={`/groceries/${list.id}`} className="text-primary text-sm underline">
          Back to the list
        </Link>
      </div>
      <h1 className="font-heading text-2xl">{list.name}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{format(new Date(), 'd MMMM yyyy')}</p>
      {[...groups.entries()].map(([group, items]) => (
        <section key={group} className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-xs font-semibold tracking-wide uppercase">{group}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex items-baseline gap-2">
                <span
                  aria-hidden
                  className="mt-0.5 inline-block size-3 shrink-0 rounded-sm border border-current"
                />
                <span className={item.isPurchased ? 'line-through' : ''}>{item.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatQuantity(item.quantity)} {item.unit ?? ''}
                </span>
                {item.store && <span className="text-muted-foreground">({item.store})</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
