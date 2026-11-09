import { z } from 'zod';

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

/** Suggested dietary tags; free text is allowed too. */
export const DIET_TAGS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'low-carb',
  'high-protein',
  'quick',
  'budget',
] as const;

/** Grocery aisles used to group a list. */
export const AISLES = [
  'produce',
  'meat & fish',
  'dairy & eggs',
  'bakery',
  'pantry',
  'frozen',
  'drinks',
  'household',
  'other',
] as const;

export const dateKeyValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : v),
  z.coerce.number().min(0).max(100000).optional()
);

export const ingredientInput = z.object({
  name: z.string().trim().min(1, 'Name the ingredient.').max(120),
  quantity: optionalNumber,
  unit: optionalText(30),
  category: optionalText(60),
  note: optionalText(200),
});
export type IngredientInput = z.infer<typeof ingredientInput>;

/** The ingredient editor submits its rows as one JSON field. */
export const ingredientsJson = z
  .string()
  .default('[]')
  .transform((raw, ctx) => {
    try {
      const parsed = JSON.parse(raw);
      const result = z.array(ingredientInput).max(100).safeParse(parsed);
      if (result.success) return result.data.filter((i) => i.name.length > 0);
      ctx.addIssue({ code: 'custom', message: 'Check the ingredient rows.' });
      return z.NEVER;
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Check the ingredient rows.' });
      return z.NEVER;
    }
  });

/** Comma-separated tags from the chip picker. */
export const tagsCsv = z
  .string()
  .default('')
  .transform((raw) =>
    [
      ...new Set(
        raw
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      ),
    ].slice(0, 20)
  );

export const recipeInput = z.object({
  title: z.string().trim().min(1, 'Give the recipe a title.').max(160),
  description: optionalText(500),
  instructions: optionalText(10000),
  servings: z.coerce.number().int().min(1, 'At least one serving.').max(99).default(2),
  prepMinutes: optionalNumber,
  cookMinutes: optionalNumber,
  category: optionalText(60),
  dietaryTags: tagsCsv,
  rating: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().min(1).max(5).optional()
  ),
  notes: optionalText(2000),
  isFavourite: z.coerce.boolean().default(false),
  ingredients: ingredientsJson,
});
export type RecipeInput = z.infer<typeof recipeInput>;

const optionalUuid = z.preprocess(
  (v) => (v === '' || v === undefined || v === null || v === 'custom' ? undefined : v),
  z.uuid().optional()
);

export const mealEntryInput = z
  .object({
    date: dateKeyValue,
    slot: z.enum(MEAL_SLOTS),
    recipeId: optionalUuid,
    customMeal: optionalText(160),
    servings: z.coerce.number().int().min(1).max(50).default(1),
    note: optionalText(300),
  })
  .refine((v) => v.recipeId || v.customMeal, {
    message: 'Pick a recipe or type a meal.',
    path: ['customMeal'],
  });
export type MealEntryInput = z.infer<typeof mealEntryInput>;

export const templateInput = z.object({
  name: z.string().trim().min(1, 'Name the template.').max(80),
  kind: z.enum(['day', 'week']).default('week'),
  /** First day covered: the week start, or the chosen day. */
  date: dateKeyValue,
});
export type TemplateInput = z.infer<typeof templateInput>;

export const applyTemplateInput = z.object({
  templateId: z.uuid('Choose a template.'),
  date: dateKeyValue,
});

export const groceryListInput = z.object({
  name: z.string().trim().min(1, 'Name the list.').max(120),
});

export const groceryItemInput = z.object({
  listId: z.uuid(),
  name: z.string().trim().min(1, 'Name the item.').max(120),
  quantity: optionalNumber,
  unit: optionalText(30),
  category: optionalText(60),
  store: optionalText(60),
});
export type GroceryItemInput = z.infer<typeof groceryItemInput>;

export const groceryItemUpdate = z.object({
  id: z.uuid(),
  quantity: optionalNumber,
  unit: optionalText(30),
  store: optionalText(60),
});

export const generateGroceryInput = z.object({
  week: dateKeyValue,
  name: optionalText(120),
});
