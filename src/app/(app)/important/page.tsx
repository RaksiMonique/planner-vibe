import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { RecordCard } from '@/features/important/components/record-card';
import { RecordFormDialog } from '@/features/important/components/record-form-dialog';
import {
  IMPORTANT_KIND_META,
  IMPORTANT_KINDS,
  type ImportantKind,
} from '@/features/important/kinds';
import { listRecords } from '@/features/important/queries';
import { requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Important information' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function ImportantPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = str(params.q)?.trim() ?? '';
  const kindParam = str(params.kind);
  const kind = IMPORTANT_KINDS.includes(kindParam as ImportantKind)
    ? (kindParam as ImportantKind)
    : undefined;
  const records = await listRecords(user.id, { kind, q });
  const byKind = IMPORTANT_KINDS.map((k) => ({
    kind: k,
    records: records.filter((r) => r.kind === k),
  })).filter((g) => g.records.length > 0);
  const href = (next: { q?: string; kind?: string }) => {
    const p = new URLSearchParams();
    if (next.q) p.set('q', next.q);
    if (next.kind) p.set('kind', next.kind);
    const s = p.toString();
    return s ? `/important?${s}` : '/important';
  };

  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Important information"
        description="Emergency contacts, key dates, insurance, medical and household facts, and where documents live."
        actions={
          <RecordFormDialog
            defaultKind={kind}
            trigger={
              <>
                <PlusIcon data-icon="inline-start" />
                New record
              </>
            }
          />
        }
      />
      <p className="bg-secondary text-secondary-foreground mb-4 rounded-lg px-3 py-2 text-sm">
        Passwords, PINs and card numbers never go here. Keep those in a password manager and, if
        useful, add a document reference that says which one.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form action="/important" className="flex items-center gap-2">
          {kind && <input type="hidden" name="kind" value={kind} />}
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search records"
            aria-label="Search records"
            className="w-56"
          />
          <Button type="submit" variant="outline" size="sm">
            <SearchIcon data-icon="inline-start" />
            Search
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={href({ q })}
            className={cn(buttonVariants({ variant: kind ? 'ghost' : 'secondary', size: 'xs' }))}
          >
            All
          </Link>
          {IMPORTANT_KINDS.map((k) => (
            <Link
              key={k}
              href={href({ q, kind: k })}
              className={cn(
                buttonVariants({ variant: kind === k ? 'secondary' : 'ghost', size: 'xs' })
              )}
            >
              {IMPORTANT_KIND_META[k].plural}
            </Link>
          ))}
        </div>
      </div>
      {byKind.length === 0 ? (
        <EmptyState
          title={q || kind ? 'Nothing matches' : 'Nothing recorded yet'}
          description={
            q || kind
              ? 'Try another word or clear the filter.'
              : 'Start with the people to call in an emergency.'
          }
          action={
            q || kind ? (
              <Link
                href="/important"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Clear
              </Link>
            ) : (
              <RecordFormDialog trigger="Add an emergency contact" />
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {byKind.map((g) => (
            <section key={g.kind} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="font-heading text-xl">{IMPORTANT_KIND_META[g.kind].plural}</h2>
                <span className="text-muted-foreground text-xs">{g.records.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.records.map((r) => (
                  <RecordCard key={r.id} record={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
