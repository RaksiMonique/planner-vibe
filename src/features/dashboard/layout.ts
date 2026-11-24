import type { DashboardLayout } from '@/db/schema';

/**
 * Customisable dashboard (instructions.md 7.5, Release 6): the cards in a
 * fixed registry, the user's order and hidden set in user_preferences. Pure,
 * so the rules are unit-tested; the dashboard applies them when rendering.
 */

export type DashboardCardKey =
  // The original twelve, shown by default.
  | 'routines'
  | 'habits'
  | 'time'
  | 'faith'
  | 'journal'
  | 'mood'
  | 'week'
  | 'goals'
  | 'someday'
  | 'inbox'
  | 'quote'
  | 'segments'
  | 'job'
  // Optional cards, added from Customise or Settings.
  | 'projects'
  | 'month'
  | 'quarter'
  | 'waiting'
  | 'completed'
  | 'countdowns'
  | 'spotlight'
  | 'prayer'
  | 'study'
  | 'reading'
  | 'scripture'
  | 'self-care'
  | 'fitness'
  | 'wellness-journal'
  | 'mood-trend'
  | 'meals'
  | 'groceries'
  | 'media'
  | 'gifts'
  | 'vision'
  | 'work-projects'
  | 'work-tasks'
  | 'work-hours'
  | 'review'
  | 'journal-streak'
  | 'notes'
  | 'finance'
  | 'important'
  | 'stats';

export const CARD_GROUPS = [
  'Planning',
  'Life Segments',
  'Faith and learning',
  'Wellness',
  'Lifestyle',
  'Work',
  'Reviews and reflection',
  'Resources',
  'General',
] as const;
export type CardGroup = (typeof CARD_GROUPS)[number];

export type CardDefinition = {
  key: DashboardCardKey;
  label: string;
  /** One line for the Add a card row and Settings. */
  description: string;
  group: CardGroup;
  /** Settings module that hides the card when switched off. */
  module?: string;
  /** Hidden until the user adds it, so the default page stays the original twelve. */
  optional?: boolean;
};

/** Default order, top to bottom. The optional cards follow, hidden until added. */
export const DASHBOARD_CARDS: CardDefinition[] = [
  {
    key: 'week',
    label: 'Weekly schedule',
    description: 'The seven days ahead',
    group: 'Planning',
    module: 'planning',
  },
  {
    key: 'job',
    label: 'Job schedule',
    description: 'Shifts over the next week',
    group: 'Work',
    module: 'work',
  },
  {
    key: 'routines',
    label: 'Routines',
    description: "Today's routines with their steps",
    group: 'Planning',
    module: 'routines',
  },
  {
    key: 'habits',
    label: 'Habits today',
    description: 'Tick off the day',
    group: 'Wellness',
    module: 'habits',
  },
  {
    key: 'time',
    label: 'Time this week',
    description: 'Blocked hours against the plan',
    group: 'Planning',
    module: 'time',
  },
  {
    key: 'faith',
    label: 'Bible study',
    description: 'Reading plan and current study',
    group: 'Faith and learning',
    module: 'faith',
  },
  {
    key: 'mood',
    label: 'Mood and energy',
    description: "Today's check-in",
    group: 'Wellness',
    module: 'wellness',
  },
  {
    key: 'goals',
    label: 'Active goals',
    description: 'Progress on live goals',
    group: 'Life Segments',
    module: 'life-segments',
  },
  {
    key: 'someday',
    label: 'Someday',
    description: 'One undated goal or project a week, asking if you still want it',
    group: 'Life Segments',
    module: 'life-segments',
  },
  {
    key: 'inbox',
    label: 'Inbox',
    description: 'Captures waiting to be filed',
    group: 'Planning',
    module: 'planning',
  },
  {
    key: 'quote',
    label: 'Quote of the day',
    description: 'One of your saved quotes',
    group: 'Resources',
    module: 'notes',
  },
  {
    key: 'journal',
    label: 'Journal',
    description: "Today's entry or a prompt",
    group: 'Reviews and reflection',
    module: 'journal',
  },
  {
    key: 'segments',
    label: 'Life Segments',
    description: 'Open work in each segment',
    group: 'Life Segments',
    module: 'life-segments',
  },

  {
    key: 'projects',
    label: 'Projects',
    description: 'Active projects with progress and the next task',
    group: 'Life Segments',
    module: 'life-segments',
    optional: true,
  },
  {
    key: 'spotlight',
    label: 'Segment spotlight',
    description: 'One Life Segment a day with its open items',
    group: 'Life Segments',
    module: 'life-segments',
    optional: true,
  },
  {
    key: 'month',
    label: 'Month at a glance',
    description: 'A mini month with busy days marked',
    group: 'Planning',
    module: 'planning',
    optional: true,
  },
  {
    key: 'quarter',
    label: 'Quarter focus',
    description: "This quarter's goals and milestones",
    group: 'Planning',
    module: 'planning',
    optional: true,
  },
  {
    key: 'waiting',
    label: 'Waiting on',
    description: 'Tasks blocked by another task',
    group: 'Planning',
    module: 'planning',
    optional: true,
  },
  {
    key: 'completed',
    label: 'Recently completed',
    description: 'The last tasks ticked off',
    group: 'Planning',
    module: 'planning',
    optional: true,
  },
  {
    key: 'countdowns',
    label: 'Coming up',
    description: 'Days until dated events and deadlines',
    group: 'Planning',
    module: 'planning',
    optional: true,
  },
  {
    key: 'prayer',
    label: 'Prayer',
    description: "Today's intentions",
    group: 'Faith and learning',
    module: 'faith',
    optional: true,
  },
  {
    key: 'scripture',
    label: 'Scripture of the day',
    description: 'A favourite or bookmarked verse',
    group: 'Faith and learning',
    module: 'faith',
    optional: true,
  },
  {
    key: 'study',
    label: 'Study planner',
    description: 'The next study session due',
    group: 'Faith and learning',
    module: 'study',
    optional: true,
  },
  {
    key: 'reading',
    label: 'Reading',
    description: 'The book in progress and the next in line',
    group: 'Faith and learning',
    module: 'media',
    optional: true,
  },
  {
    key: 'self-care',
    label: 'Self-care',
    description: "This week's plan and today's item",
    group: 'Wellness',
    module: 'wellness',
    optional: true,
  },
  {
    key: 'fitness',
    label: 'Fitness',
    description: "This week's workouts, done and planned",
    group: 'Wellness',
    module: 'wellness',
    optional: true,
  },
  {
    key: 'wellness-journal',
    label: 'Wellness journal',
    description: 'The latest entry or a prompt to log one',
    group: 'Wellness',
    module: 'wellness',
    optional: true,
  },
  {
    key: 'mood-trend',
    label: 'Mood trend',
    description: 'The last seven days of mood and energy',
    group: 'Wellness',
    module: 'wellness',
    optional: true,
  },
  {
    key: 'meals',
    label: 'Meals',
    description: "Today's planned meals",
    group: 'Lifestyle',
    module: 'meals',
    optional: true,
  },
  {
    key: 'groceries',
    label: 'Groceries',
    description: 'Open items on the list',
    group: 'Lifestyle',
    module: 'meals',
    optional: true,
  },
  {
    key: 'media',
    label: 'Media',
    description: 'What you are watching and reading now',
    group: 'Lifestyle',
    module: 'media',
    optional: true,
  },
  {
    key: 'gifts',
    label: 'Gifts',
    description: 'Occasions coming up with gifts to buy',
    group: 'Lifestyle',
    module: 'gifts',
    optional: true,
  },
  {
    key: 'vision',
    label: 'Vision board',
    description: 'A glimpse of your current board',
    group: 'Lifestyle',
    module: 'vision-boards',
    optional: true,
  },
  {
    key: 'work-projects',
    label: 'Work projects',
    description: 'Active work projects with progress',
    group: 'Work',
    module: 'work',
    optional: true,
  },
  {
    key: 'work-tasks',
    label: 'Work tasks',
    description: 'Due this week in the Work segment',
    group: 'Work',
    module: 'work',
    optional: true,
  },
  {
    key: 'work-hours',
    label: 'Hours this week',
    description: 'Shifts worked against the pattern',
    group: 'Work',
    module: 'work',
    optional: true,
  },
  {
    key: 'review',
    label: 'Weekly review',
    description: 'A nudge while the review is open',
    group: 'Reviews and reflection',
    module: 'reviews',
    optional: true,
  },
  {
    key: 'journal-streak',
    label: 'Journal streak',
    description: 'Days in a row with an entry',
    group: 'Reviews and reflection',
    module: 'journal',
    optional: true,
  },
  {
    key: 'notes',
    label: 'Notes',
    description: 'Pinned and recent notes',
    group: 'Resources',
    module: 'notes',
    optional: true,
  },
  {
    key: 'finance',
    label: 'Financial snapshot',
    description: 'The latest snapshot figures',
    group: 'Resources',
    module: 'finance',
    optional: true,
  },
  {
    key: 'important',
    label: 'Important information',
    description: 'Pinned details within reach',
    group: 'Resources',
    module: 'important-info',
    optional: true,
  },
  {
    key: 'stats',
    label: 'This week in numbers',
    description: 'Tasks done, habits kept, hours blocked',
    group: 'General',
    optional: true,
  },
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  order: DASHBOARD_CARDS.map((c) => c.key),
  hidden: DASHBOARD_CARDS.filter((c) => c.optional).map((c) => c.key),
};

/**
 * A stored layout made whole: unknown keys dropped, new cards appended,
 * nothing lost. A card the layout has never seen joins hidden when it is
 * optional, so adding cards to the app never changes a page someone arranged.
 */
export function normaliseLayout(stored: DashboardLayout | null | undefined): DashboardLayout {
  const known = new Set<string>(DASHBOARD_CARDS.map((c) => c.key));
  const order = (stored?.order ?? []).filter((k, i, arr) => known.has(k) && arr.indexOf(k) === i);
  const hidden = (stored?.hidden ?? []).filter((k, i, arr) => known.has(k) && arr.indexOf(k) === i);
  for (const card of DASHBOARD_CARDS) {
    if (order.includes(card.key)) continue;
    order.push(card.key);
    if (card.optional && !hidden.includes(card.key)) hidden.push(card.key);
  }
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

/**
 * Moves a card one step. With `among` (the keys currently shown), the step is
 * taken past the next shown card, so hidden cards in between are skipped and
 * the result on the page is always visible.
 */
export function moveCard(
  layout: DashboardLayout,
  key: string,
  direction: -1 | 1,
  among?: string[]
): DashboardLayout {
  const { order, hidden } = normaliseLayout(layout);
  const lane = among ? order.filter((k) => among.includes(k)) : order;
  const i = lane.indexOf(key);
  const target = lane[i + direction];
  if (i === -1 || !target) return { order, hidden };
  const next = order.filter((k) => k !== key);
  const j = next.indexOf(target);
  next.splice(direction === -1 ? j : j + 1, 0, key);
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
