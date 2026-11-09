import {
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  getQuarter,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from 'date-fns';
import { weekRange, type WeekStartsOn } from '@/lib/dates';

export const REVIEW_KINDS = ['weekly', 'monthly', 'quarterly', 'annual', 'goal'] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];
export type PeriodKind = Exclude<ReviewKind, 'goal'>;
export const PERIOD_KINDS: PeriodKind[] = ['weekly', 'monthly', 'quarterly', 'annual'];

export type ReviewPrompt = { id: string; label: string; hint?: string };

/** The spec's six prompts (instructions.md 8.20), shared by every period review. */
export const CORE_PROMPTS: ReviewPrompt[] = [
  { id: 'went_well', label: 'What went well?' },
  { id: 'not_well', label: 'What did not go well?' },
  { id: 'accomplished', label: 'What did I accomplish?' },
  { id: 'improve', label: 'What needs improvement?' },
  { id: 'goals_progressed', label: 'Which goals progressed?' },
  { id: 'prioritise', label: 'What should I prioritise next?' },
];

export type ReviewTemplate = { title: string; description: string; prompts: ReviewPrompt[] };

export const REVIEW_TEMPLATES: Record<ReviewKind, ReviewTemplate> = {
  weekly: {
    title: 'Weekly reset',
    description: 'Close the week, clear the deck, choose what matters next.',
    prompts: [
      ...CORE_PROMPTS,
      { id: 'energy', label: 'How were my energy and mood this week?' },
      { id: 'next_three', label: 'What are the three things that matter most next week?' },
    ],
  },
  monthly: {
    title: 'Monthly review',
    description: 'Habits, balance across Life Segments, and the month ahead.',
    prompts: [
      ...CORE_PROMPTS,
      { id: 'habits', label: 'Which habits held, and which slipped?' },
      { id: 'balance', label: 'Which Life Segments got too little attention?' },
    ],
  },
  quarterly: {
    title: 'Quarterly review',
    description: 'Milestones reached, goals to adjust, the next quarter’s focus.',
    prompts: [
      ...CORE_PROMPTS,
      { id: 'milestones', label: 'Which milestones were reached, and which moved?' },
      { id: 'adjust', label: 'Which quarterly goals need changing or dropping?' },
    ],
  },
  annual: {
    title: 'Annual reflection',
    description: 'The year in one honest look, and what next year is about.',
    prompts: [
      ...CORE_PROMPTS,
      { id: 'year_word', label: 'What word sums up this year?' },
      { id: 'lifelong', label: 'How did this year move my lifelong goals?' },
      { id: 'next_year', label: 'What does next year need to be about?' },
    ],
  },
  goal: {
    title: 'Goal review',
    description: 'A check-in on one goal: progress, obstacles, the next step.',
    prompts: [
      CORE_PROMPTS[0],
      CORE_PROMPTS[1],
      { id: 'progress', label: 'How far along is this goal, honestly?' },
      { id: 'obstacles', label: 'What is in the way?' },
      { id: 'next_step', label: 'What is the very next step?' },
    ],
  },
};

export function periodFor(
  kind: PeriodKind,
  date: Date,
  weekStartsOn: WeekStartsOn
): { start: Date; end: Date } {
  switch (kind) {
    case 'weekly':
      return weekRange(date, weekStartsOn);
    case 'monthly':
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case 'quarterly':
      return { start: startOfQuarter(date), end: endOfQuarter(date) };
    case 'annual':
      return { start: startOfYear(date), end: endOfYear(date) };
  }
}

/** The start of the period `by` periods away (negative for earlier). */
export function shiftPeriod(kind: PeriodKind, start: Date, by: number): Date {
  switch (kind) {
    case 'weekly':
      return addWeeks(start, by);
    case 'monthly':
      return addMonths(start, by);
    case 'quarterly':
      return addQuarters(start, by);
    case 'annual':
      return addYears(start, by);
  }
}

export function periodLabel(kind: ReviewKind, start: Date, end: Date): string {
  switch (kind) {
    case 'weekly':
      return `Week of ${format(start, 'd MMM yyyy')}`;
    case 'monthly':
      return format(start, 'MMMM yyyy');
    case 'quarterly':
      return `Q${getQuarter(start)} ${format(start, 'yyyy')}`;
    case 'annual':
      return format(start, 'yyyy');
    case 'goal':
      return format(end, 'd MMM yyyy');
  }
}

export function answeredCount(answers: Record<string, string>, prompts: ReviewPrompt[]): number {
  return prompts.filter((p) => (answers[p.id] ?? '').trim().length > 0).length;
}

export type ReviewStatus = 'not_started' | 'in_progress' | 'complete';

export function reviewStatus(
  review: { answers: Record<string, string>; completedAt: Date | null } | null,
  prompts: ReviewPrompt[]
): ReviewStatus {
  if (!review) return 'not_started';
  if (review.completedAt) return 'complete';
  return answeredCount(review.answers, prompts) > 0 ? 'in_progress' : 'not_started';
}
