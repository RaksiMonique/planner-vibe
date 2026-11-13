import type { Metadata } from 'next';
import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { listEventsBetween } from '@/features/calendar/queries';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { listRoutinesWithCompletions } from '@/features/routines/queries';
import { removeWellnessEntryAction } from '@/features/wellness/actions';
import { formatPrice, ProductCard } from '@/features/wellness/components/product-card';
import { ProductFormDialog } from '@/features/wellness/components/product-form-dialog';
import {
  TreatmentPlanner,
  TreatmentToggle,
} from '@/features/wellness/components/treatment-planner';
import { getWellnessPrefs, listProducts, listWellnessBetween } from '@/features/wellness/queries';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone, weekDays } from '@/lib/dates';
import { signedImageUrls } from '@/lib/storage';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Self-care' };
export const dynamic = 'force-dynamic';

export default async function SelfCarePage() {
  const user = await requireUser();
  const prefs = await getWellnessPrefs(user.id);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);
  const weekKeys = weekDays(today, prefs.weekStartsOn).map(toDateKey);
  const now = new Date();

  const [routines, treatments, events, products] = await Promise.all([
    listRoutinesWithCompletions(user.id, todayKey),
    listWellnessBetween(user.id, weekKeys[0], weekKeys[6], ['treatment']),
    listEventsBetween(user.id, now, addDays(now, 30)),
    listProducts(user.id),
  ]);
  const careRoutines = routines.filter((r) => r.kind === 'skincare' || r.kind === 'haircare');
  const appointments = events
    .filter((e) => e.category === 'self_care' && !e.rrule)
    .sort((a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0))
    .slice(0, 6);
  const urls = await signedImageUrls(products.map((p) => p.imagePath));
  const inventory = products.filter((p) => p.inInventory);
  const favourites = products.filter((p) => p.isFavourite);
  const wishlist = products.filter((p) => p.onWishlist);
  const wishlistTotal = wishlist.reduce((n, p) => n + Number(p.price ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Self-care"
        description="Skincare and haircare, treatments for the week, appointments, and the products behind them."
        actions={
          <ProductFormDialog
            currency={prefs.currency}
            trigger={
              <>
                <PlusIcon data-icon="inline-start" />
                New product
              </>
            }
          />
        }
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader className="items-center">
            <CardTitle className="font-heading text-lg">
              <h2>Skincare and haircare today</h2>
            </CardTitle>
            <Link
              href="/routines"
              className="text-primary col-start-2 row-start-1 justify-self-end text-xs hover:underline"
            >
              Routines
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {careRoutines.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No skincare or haircare routine is scheduled today.{' '}
                <Link href="/routines" className="text-primary hover:underline">
                  Create one as a routine
                </Link>{' '}
                with kind skincare or haircare.
              </p>
            ) : (
              careRoutines.map((r) => {
                const done = r.completion?.completedStepIds.length ?? 0;
                return (
                  <div key={r.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {done}/{r.steps.length} steps
                      </span>
                    </div>
                    <ProgressBar
                      value={r.steps.length ? Math.round((done / r.steps.length) * 100) : 0}
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>Treatments this week</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-1.5">
              {treatments.length === 0 && (
                <li className="text-muted-foreground text-sm">Nothing planned yet.</li>
              )}
              {treatments.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <TreatmentToggle
                    id={t.id}
                    done={t.value !== null}
                    label={t.label ?? 'treatment'}
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate',
                      t.value !== null && 'text-muted-foreground line-through'
                    )}
                  >
                    {t.label}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {format(parseISO(t.date), 'EEE d')}
                  </span>
                  <ConfirmActionButton
                    action={removeWellnessEntryAction}
                    fields={{ id: t.id }}
                    title="Remove this treatment?"
                    trigger={<Trash2Icon aria-label="Remove treatment" />}
                    variant="ghost"
                    size="icon-xs"
                  />
                </li>
              ))}
            </ul>
            <TreatmentPlanner weekDayKeys={weekKeys} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader className="items-center">
            <CardTitle className="font-heading text-lg">
              <h2>Appointments</h2>
            </CardTitle>
            <Link
              href="/calendar?new=1"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'xs' }),
                'col-start-2 row-start-1 justify-self-end'
              )}
            >
              Book one
            </Link>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No self-care appointments in the next 30 days. Events with the category self-care
                show here.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {appointments.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-20 shrink-0 text-xs">
                      {e.isAllDay && e.allDayDate
                        ? format(parseISO(e.allDayDate), 'EEE d MMM')
                        : e.startsAt
                          ? formatInTimeZone(e.startsAt, prefs.timeZone, 'EEE d MMM HH:mm')
                          : ''}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3 lg:col-span-12">
          <h2 className="font-heading text-2xl">Products</h2>
          {products.length === 0 ? (
            <EmptyState
              title="No products yet"
              description="Keep what you own, what you love, and what you want, with prices in your currency."
              action={
                <ProductFormDialog
                  currency={prefs.currency}
                  trigger={
                    <>
                      <PlusIcon data-icon="inline-start" />
                      Add a product
                    </>
                  }
                />
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-5">
                <CardHeader className="items-center">
                  <CardTitle className="font-heading text-lg">
                    <h3>Inventory ({inventory.length})</h3>
                  </CardTitle>
                  <ProductFormDialog
                    currency={prefs.currency}
                    variant="outline"
                    size="xs"
                    defaults={{ inInventory: true }}
                    trigger="Add"
                  />
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {inventory.length === 0 && (
                    <p className="text-muted-foreground text-sm">Nothing in the inventory.</p>
                  )}
                  {inventory.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      imageUrl={urls[p.imagePath ?? ''] ?? null}
                      currency={prefs.currency}
                    />
                  ))}
                </CardContent>
              </Card>
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">
                    <h3>Favourites ({favourites.length})</h3>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {favourites.length === 0 && (
                    <p className="text-muted-foreground col-span-2 text-sm">
                      Mark the ones you love.
                    </p>
                  )}
                  {favourites.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      imageUrl={urls[p.imagePath ?? ''] ?? null}
                      currency={prefs.currency}
                      showImage
                    />
                  ))}
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader className="items-center">
                  <CardTitle className="font-heading text-lg">
                    <h3>Wishlist ({wishlist.length})</h3>
                  </CardTitle>
                  <ProductFormDialog
                    currency={prefs.currency}
                    variant="outline"
                    size="xs"
                    defaults={{ inInventory: false, onWishlist: true }}
                    trigger="Add"
                  />
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {wishlist.length === 0 && (
                    <p className="text-muted-foreground text-sm">Nothing on the wishlist.</p>
                  )}
                  {wishlist.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      imageUrl={urls[p.imagePath ?? ''] ?? null}
                      currency={prefs.currency}
                    />
                  ))}
                  {wishlist.length > 0 && (
                    <p className="text-muted-foreground border-t pt-2 text-xs">
                      Total {formatPrice(wishlistTotal.toFixed(2), prefs.currency)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
