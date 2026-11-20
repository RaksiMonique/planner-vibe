import { z } from 'zod';

export const BUDGET_PERIODS = ['monthly', 'annual'] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];
export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
};

const MAX_AMOUNT = 99_999_999;
const toNumber = (v: unknown) =>
  v === '' || v === undefined || v === null ? undefined : Number(v);

/** A money amount typed by hand. `message` is shown when it is missing or not a number. */
const amount = (message: string) =>
  z.preprocess(
    toNumber,
    z
      .number({ error: message })
      .min(0, 'Use a positive amount.')
      .max(MAX_AMOUNT, 'That amount is too large.')
  );
const optionalAmount = z.preprocess(
  toNumber,
  z
    .number()
    .min(0, 'Use a positive amount.')
    .max(MAX_AMOUNT, 'That amount is too large.')
    .optional()
);
const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a three-letter currency code.');

export const budgetInput = z.object({
  name: z.string().trim().min(1, 'Give the budget a name.').max(120),
  category: z.string().trim().max(80).optional(),
  period: z.enum(BUDGET_PERIODS).default('monthly'),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  limitAmount: amount('Give the budget a limit.').refine(
    (v) => v > 0,
    'The limit must be above zero.'
  ),
  spentAmount: optionalAmount,
  currency: currencyCode.optional(),
  note: z.string().trim().max(1000).optional(),
});
export type BudgetInput = z.infer<typeof budgetInput>;

export const spendingInput = z.object({
  id: z.uuid(),
  amount: amount('Enter the amount spent.').refine((v) => v > 0, 'Enter an amount above zero.'),
});
export type SpendingInput = z.infer<typeof spendingInput>;

const monthKey = z.string().regex(/^\d{4}-\d{2}$/, 'Use a month like 2026-11.');
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');

/** Monthly money review (instructions.md 8.22). */
export const reviewFigureInput = z.object({
  id: z.uuid(),
  month: monthKey,
  amount: amount('Enter what was spent.'),
});
export const reviewNoteInput = z.object({
  id: z.uuid(),
  month: monthKey,
  note: z.string().trim().max(1000).optional(),
});
export const finishReviewInput = z.object({
  month: monthKey,
  note: z.string().trim().max(5000).optional(),
  reset: z.coerce.boolean().default(false),
});
export const budgetTaskInput = z.object({
  id: z.uuid(),
  month: monthKey,
  title: z.string().trim().min(1, 'Give the task a title.').max(200),
  dueDate: dateKey.optional(),
  monthly: z.coerce.boolean().default(false),
});
export type BudgetTaskInput = z.infer<typeof budgetTaskInput>;

export const goalProgressInput = z.object({
  id: z.uuid(),
  currentValue: amount('Enter the current value.'),
});
export type GoalProgressInput = z.infer<typeof goalProgressInput>;
