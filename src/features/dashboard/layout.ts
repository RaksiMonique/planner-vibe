import type { DashboardLayout } from '@/db/schema';

/**
 * Customisable dashboard (instructions.md 7.5, Release 6): the cards in a
 * fixed registry, the user's order and hidden set in user_preferences. Pure,
 * so the rules are unit-tested; the dashboard applies them when rendering.
 */

export type DashboardCardKey =
  | 'routines'
  | 'habits'
  | 'time'
  | 'faith'
  | 'journal'
  | 'mood'
  | 'week'
  | 'priorities'
  | 'due'
  | 'overdue'
  | 'goals'
  | 'appointments'
  | 'inbox'
  | 'quote'
  | 'segments'
  | 'job';

export type CardDefinition = {
  key: DashboardCardKey;
  label: string;
  /** Settings module that hides the card when switched off. */
  module?: string;
};

/** Default order, top to bottom, matching the dashboard before customisation. */
export const DASHBOARD_CARDS: CardDefinition[] = [
  { key: 'week', label: 'Weekly schedule', module: 'planning' },
  { key: 'job', label: 'Job schedule', module: 'work' },
  { key: 'routines', label: 'Routines', module: 'routines' },
  { key: 'habits', label: 'Habits today', module: 'habits' },
  { key: 'time', label: 'Time this week', module: 'time' },
  { key: 'faith', label: 'Bible study', module: 'faith' },
  { key: 'journal', label: 'Journal', module: 'journal' },
  { key: 'mood', label: 'Mood and energy', module: 'wellness' },
  { key: 'priorities', label: "Today's priorities", module: 'planning' },
  { key: 'due', label: 'Due this week', module: 'planning' },
  { key: 'overdue', label: 'Overdue', module: 'planning' },
  { key: 'goals', label: 'Active goals', module: 'life-segments' },
  { key: 'appointments', label: 'Upcoming appointments', module: 'planning' },
  { key: 'inbox', label: 'Inbox', module: 'planning' },
  { key: 'quote', label: 'Quote of the day', module: 'notes' },
  { key: 'segments', label: 'Life Segments', module: 'life-segments' },
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  order: DASHBOARD_CARDS.map((c) => c.key),
  hidden: [],
};

/** A stored layout made whole: unknown keys dropped, new cards appended, nothing lost. */
export function normaliseLayout(stored: DashboardLayout | null | undefined): DashboardLayout {
  const known = new Set<string>(DASHBOARD_CARDS.map((c) => c.key));
  const order = (stored?.order ?? []).filter((k, i, arr) => known.has(k) && arr.indexOf(k) === i);
  for (const card of DASHBOARD_CARDS) if (!order.includes(card.key)) order.push(card.key);
  const hidden = (stored?.hidden ?? []).filter((k, i, arr) => known.has(k) && arr.indexOf(k) === i);
  return { order, hidden };
}

/** The cards to render, in order, skipping hidden ones and disabled modules. */
export function visibleCards(
  layout: DashboardLayout | null | undefined,
  enabledModules: Record<string, boolean>
): CardDefinition[] {
  const { order, hidden } = normaliseLayout(layout);
  const byKey = new Map(DASHBOARD_CARDS.map((c) => [c.key, c]));
  return order
    .map((k) => byKey.get(k as DashboardCardKey)!)
    .filter((c) => !hidden.includes(c.key))
    .filter((c) => !c.module || enabledModules[c.module] !== false);
}

export function moveCard(layout: DashboardLayout, key: string, direction: -1 | 1): DashboardLayout {
  const { order, hidden } = normaliseLayout(layout);
  const i = order.indexOf(key);
  const j = i + direction;
  if (i === -1 || j < 0 || j >= order.length) return { order, hidden };
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return { order: next, hidden };
}

export function toggleCard(
  layout: DashboardLayout,
  key: string,
  visible: boolean
): DashboardLayout {
  const { order, hidden } = normaliseLayout(layout);
  const set = new Set(hidden);
  if (visible) set.delete(key);
  else set.add(key);
  return { order, hidden: [...set] };
}
