import type { Metadata } from 'next';
import Link from 'next/link';
import { GiftIcon, PlusIcon, UserPlusIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { GiftFormDialog } from '@/features/gifts/components/gift-form-dialog';
import { GiftRow } from '@/features/gifts/components/gift-row';
import { RecipientCard } from '@/features/gifts/components/recipient-card';
import { RecipientFormDialog } from '@/features/gifts/components/recipient-form-dialog';
import { WishlistPanel } from '@/features/gifts/components/wishlist-panel';
import {
  daysUntil,
  formatMoney,
  groupGiftsByOccasion,
  type OccasionGroup,
} from '@/features/gifts/grouping';
import {
  getCurrency,
  listGifts,
  listRecipients,
  listWishlist,
  type GiftRow as GiftRowData,
} from '@/features/gifts/queries';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Gifts' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const TABS = [
  ['upcoming', 'Upcoming'],
  ['ideas', 'Ideas'],
  ['history', 'History'],
] as const;

export default async function GiftsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const tab =
    typeof params.tab === 'string' && TABS.some(([t]) => t === params.tab)
      ? params.tab
      : 'upcoming';
  const recipientId = typeof params.recipient === 'string' ? params.recipient : undefined;
  const [segments, prefs, currency, recipients, gifts, wishlist] = await Promise.all([
    listSegments(user.id),
    getPreferences(user.id),
    getCurrency(user.id),
    listRecipients(user.id),
    listGifts(user.id, { recipientId }),
    listWishlist(user.id),
  ]);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const recipientOptions = recipients.map((r) => ({ id: r.id, name: r.name }));
  const committed = gifts.filter((g) => g.status !== 'idea' && g.status !== 'given');
  const ideas = gifts.filter((g) => g.status === 'idea');
  const given = gifts.filter((g) => g.status === 'given');
  const { upcoming, undated, past } = groupGiftsByOccasion(committed, todayKey);
  const history = groupGiftsByOccasion(given, todayKey);
  const activeRecipient = recipients.find((r) => r.id === recipientId);
  const tabHref = (t: string) => `/gifts?tab=${t}${recipientId ? `&recipient=${recipientId}` : ''}`;

  const addGift = (
    <GiftFormDialog
      recipients={recipientOptions}
      segments={segments}
      currency={currency}
      defaultRecipientId={recipientId}
      trigger={
        <>
          <PlusIcon data-icon="inline-start" />
          New gift
        </>
      }
    />
  );

  const renderGroup = (group: OccasionGroup<GiftRowData>, past = false) => (
    <section key={group.key} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="font-heading text-lg">{group.label}</h3>
        {group.dateKey && (
          <span className={cn('text-xs', past ? 'text-muted-foreground' : 'text-primary')}>
            {group.dateKey}
            {!past && ` · in ${daysUntil(group.dateKey, todayKey)} days`}
          </span>
        )}
        <span className="text-muted-foreground ml-auto text-xs">
          {group.price > 0 || group.budget > 0
            ? `${formatMoney(group.price, currency) || formatMoney(0, currency)} of ${formatMoney(group.budget, currency) || 'no budget'}`
            : `${group.gifts.length} gift${group.gifts.length === 1 ? '' : 's'}`}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {group.gifts.map((g) => (
          <GiftRow
            key={g.id}
            gift={g}
            recipients={recipientOptions}
            segments={segments}
            currency={currency}
          />
        ))}
      </ul>
    </section>
  );

  return (
    <>
      <PageHeader
        eyebrow="Lifestyle"
        title="Gifts"
        description="Who, which occasion, what it costs, and whether it is bought, wrapped and given."
        actions={
          <>
            <RecipientFormDialog
              variant="outline"
              trigger={
                <>
                  <UserPlusIcon data-icon="inline-start" />
                  Add person
                </>
              }
            />
            {recipients.length > 0 && addGift}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-xl">
              People{' '}
              {activeRecipient && (
                <Link href="/gifts" className="text-primary text-sm hover:underline">
                  show everyone
                </Link>
              )}
            </h2>
            {recipients.length === 0 ? (
              <EmptyState
                icon={GiftIcon}
                title="No one on the list yet"
                description="Add the people you give to; birthdays get a countdown."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {recipients.map((r) => (
                  <RecipientCard
                    key={r.id}
                    recipient={r}
                    todayKey={todayKey}
                    active={r.id === recipientId}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <nav aria-label="Gifts view" className="bg-card flex w-fit rounded-lg border p-0.5">
              {TABS.map(([t, label]) => (
                <Link
                  key={t}
                  href={tabHref(t)}
                  aria-current={tab === t ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm',
                    tab === t
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                  <span className="text-muted-foreground ml-1 text-xs">
                    {t === 'upcoming'
                      ? committed.length
                      : t === 'ideas'
                        ? ideas.length
                        : given.length}
                  </span>
                </Link>
              ))}
            </nav>
            {tab === 'upcoming' &&
              (committed.length === 0 ? (
                <EmptyState
                  icon={GiftIcon}
                  title="Nothing planned"
                  description="Move an idea to planned, or add a gift with an occasion and date."
                  action={recipients.length > 0 ? addGift : undefined}
                />
              ) : (
                <>
                  {upcoming.map((g) => renderGroup(g))}
                  {undated.map((g) => renderGroup(g))}
                  {past.length > 0 && (
                    <details className="text-sm">
                      <summary className="text-muted-foreground cursor-pointer">
                        Past occasions still open ({past.length})
                      </summary>
                      <div className="mt-3 flex flex-col gap-4">
                        {past.map((g) => renderGroup(g, true))}
                      </div>
                    </details>
                  )}
                </>
              ))}
            {tab === 'ideas' &&
              (ideas.length === 0 ? (
                <EmptyState
                  icon={GiftIcon}
                  title="No ideas yet"
                  description="Jot ideas as they come; they wait here until an occasion."
                />
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {ideas.map((g) => (
                    <GiftRow
                      key={g.id}
                      gift={g}
                      recipients={recipientOptions}
                      segments={segments}
                      currency={currency}
                    />
                  ))}
                </ul>
              ))}
            {tab === 'history' &&
              (given.length === 0 ? (
                <EmptyState
                  icon={GiftIcon}
                  title="Nothing given yet"
                  description="Gifts marked given collect here, by occasion."
                />
              ) : (
                <>
                  {[...history.past, ...history.upcoming, ...history.undated].map((g) =>
                    renderGroup(g, true)
                  )}
                </>
              ))}
          </section>
        </div>
        <aside className="flex flex-col gap-3">
          <h2 className="font-heading text-xl">My wishlist</h2>
          <WishlistPanel items={wishlist} currency={currency} />
        </aside>
      </div>
    </>
  );
}
