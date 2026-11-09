'use client';

import Link from 'next/link';
import { buildHabitsHref } from '../hrefs';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { cn } from '@/lib/utils';

/** Month stepper and habit picker for the calendar; navigation only. */
export function MonthNav({
  title,
  prevHref,
  nextHref,
  habits,
  selectedId,
  params,
}: {
  title: string;
  prevHref: string;
  nextHref: string;
  habits: Array<{ id: string; name: string }>;
  selectedId?: string;
  params: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const icon = cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={prevHref} className={icon} aria-label="Previous month">
        <ChevronLeftIcon />
      </Link>
      <Link href={nextHref} className={icon} aria-label="Next month">
        <ChevronRightIcon />
      </Link>
      <h3 className="font-heading min-w-28 text-lg">{title}</h3>
      {habits.length > 1 && (
        <NativeSelect
          aria-label="Habit"
          className="ml-auto w-auto"
          value={selectedId ?? ''}
          onChange={(e) => router.push(buildHabitsHref({ ...params, habit: e.target.value }))}
        >
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </NativeSelect>
      )}
    </div>
  );
}
