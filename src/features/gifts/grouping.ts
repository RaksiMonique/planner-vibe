/** Pure helpers for the gifts page: dates, grouping by occasion and money. */

const DAY = 86_400_000;

function utc(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Calendar days from today to a yyyy-MM-dd date; negative when past. */
export function daysUntil(dateKey: string, todayKey: string): number {
  return Math.round((utc(dateKey) - utc(todayKey)) / DAY);
}

/** The next anniversary of a yyyy-MM-dd date on or after today (29 February falls back to 28). */
export function nextAnniversary(dateKey: string, todayKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  const [ty] = todayKey.split('-').map(Number);
  const build = (year: number) => {
    const day = m === 2 && d === 29 && !isLeap(year) ? 28 : d;
    return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  const thisYear = build(ty);
  return thisYear >= todayKey ? thisYear : build(ty + 1);
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export type GiftLike = {
  occasion: string | null;
  occasionDate: string | null;
  budget: string | number | null;
  price: string | number | null;
};

export type OccasionGroup<T extends GiftLike> = {
  key: string;
  label: string;
  dateKey: string | null;
  gifts: T[];
  budget: number;
  price: number;
};

const num = (v: string | number | null) => (v === null ? 0 : Number(v));

/** Groups gifts by occasion and date: dated upcoming first (soonest first), then undated, then past (latest first). */
export function groupGiftsByOccasion<T extends GiftLike>(
  gifts: T[],
  todayKey: string
): { upcoming: OccasionGroup<T>[]; undated: OccasionGroup<T>[]; past: OccasionGroup<T>[] } {
  const groups = new Map<string, OccasionGroup<T>>();
  for (const g of gifts) {
    const key = `${g.occasionDate ?? ''}|${(g.occasion ?? '').trim().toLowerCase()}`;
    const group =
      groups.get(key) ??
      ({
        key,
        label: g.occasion?.trim() || 'No occasion',
        dateKey: g.occasionDate,
        gifts: [],
        budget: 0,
        price: 0,
      } satisfies OccasionGroup<T>);
    group.gifts.push(g);
    group.budget += num(g.budget);
    group.price += num(g.price);
    groups.set(key, group);
  }
  const all = [...groups.values()];
  const upcoming = all
    .filter((g) => g.dateKey && g.dateKey >= todayKey)
    .sort((a, b) => a.dateKey!.localeCompare(b.dateKey!));
  const undated = all.filter((g) => !g.dateKey).sort((a, b) => a.label.localeCompare(b.label));
  const past = all
    .filter((g) => g.dateKey && g.dateKey < todayKey)
    .sort((a, b) => b.dateKey!.localeCompare(a.dateKey!));
  return { upcoming, undated, past };
}

export function formatMoney(value: string | number | null | undefined, currency: string): string {
  if (value === null || value === undefined || value === '') return '';
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}
