import type { Metadata } from 'next';
import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { BookOpenTextIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { GenerateGroceryButton } from '@/features/meals/components/grocery-forms';
import { MealCellDialog } from '@/features/meals/components/meal-cell-dialog';
import { TemplatePanel } from '@/features/meals/components/template-panel';
import { getMealsBetween, listRecipeOptions, listTemplates } from '@/features/meals/queries';
import { MEAL_SLOTS, SLOT_LABELS } from '@/features/meals/schema';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone, weekDays } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Meal planner' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function MealsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const prefs = await getPreferences(user.id);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);
  const weekParam = str(params.week);
  const anchor = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? parseISO(weekParam) : today;
  const days = weekDays(anchor, prefs.weekStartsOn);
  const startKey = toDateKey(days[0]);
  const endKey = toDateKey(days[6]);

  const [{ entries }, recipes, templates] = await Promise.all([
    getMealsBetween(user.id, startKey, endKey),
    listRecipeOptions(user.id),
    listTemplates(user.id),
  ]);
  const entryFor = (date: string, slot: (typeof MEAL_SLOTS)[number]) =>
    entries.find((e) => e.date === date && e.slot === slot) ?? null;
  const weekHref = (offset: number) => `/meals?week=${toDateKey(addDays(days[0], offset))}`;

  return (
    <>
      <PageHeader
        title="Meal planner"
        description="A week of meals from your recipes. The grocery list follows from it."
        actions={
          <>
            <Link
              href="/meals/recipes"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <BookOpenTextIcon data-icon="inline-start" />
              Recipes
            </Link>
            <GenerateGroceryButton weekStart={startKey} />
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={weekHref(-7)}
          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
          aria-label="Previous week"
        >
          <ChevronLeftIcon />
        </Link>
        <Link href="/meals" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          This week
        </Link>
        <Link
          href={weekHref(7)}
          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
          aria-label="Next week"
        >
          <ChevronRightIcon />
        </Link>
        <h2 className="font-heading text-lg">
          {format(days[0], 'd MMM')} – {format(days[6], 'd MMM yyyy')}
        </h2>
        <span className="text-muted-foreground ml-auto text-sm">
          {entries.length} meals planned
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
          {days.map((day) => {
            const key = toDateKey(day);
            const isToday = key === todayKey;
            return (
              <Card key={key} size="sm" className={cn(isToday && 'ring-primary')}>
                <CardHeader>
                  <CardTitle
                    className={cn(
                      'text-xs font-medium',
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {format(day, 'EEE d')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {MEAL_SLOTS.map((slot) => (
                    <div key={slot}>
                      <p className="text-muted-foreground tracking-eyebrow text-[10px] uppercase">
                        {SLOT_LABELS[slot]}
                      </p>
                      <MealCellDialog
                        date={key}
                        slot={slot}
                        entry={entryFor(key, slot)}
                        recipes={recipes}
                        dayLabel={format(day, 'EEEE d MMM')}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card size="sm" className="h-fit">
          <CardHeader>
            <CardTitle className="font-heading text-base">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplatePanel weekStart={startKey} templates={templates} />
          </CardContent>
        </Card>
      </div>
      {recipes.length === 0 && (
        <p className="text-muted-foreground mt-4 text-sm">
          No recipes yet.{' '}
          <Link href="/meals/recipes" className="text-primary underline">
            Add some
          </Link>{' '}
          and they will appear in each meal picker; custom meals work without them.
        </p>
      )}
    </>
  );
}
