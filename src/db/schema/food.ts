import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  smallint,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { softDelete, timestamps, searchColumn } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { lifeSegments } from './organisation';
import { ownerId } from './profiles';
import { templateKindEnum } from './scheduling';

export const mealSlotEnum = planner.enum('meal_slot', ['breakfast', 'lunch', 'dinner', 'snack']);
export const groceryStatusEnum = planner.enum('grocery_status', ['open', 'done']);

/** A library record, so no Life Segment (instructions.md 5.3). */
export const recipes = planner.table(
  'recipes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    title: text('title').notNull(),
    description: text('description'),
    instructions: text('instructions'),
    servings: smallint('servings').notNull().default(2),
    prepMinutes: integer('prep_minutes'),
    cookMinutes: integer('cook_minutes'),
    category: text('category'),
    dietaryTags: jsonb('dietary_tags').$type<string[]>().notNull().default([]),
    rating: smallint('rating'),
    imagePath: text('image_path'),
    notes: text('notes'),
    isFavourite: boolean('is_favourite').notNull().default(false),
    ...softDelete(),
    search: searchColumn(['title', 'description', 'notes']),
    ...timestamps(),
  },
  (t) => [
    index('recipes_search_idx').using('gin', t.search),
    index('recipes_user_idx').on(t.userId, t.title),
    ...ownerPolicies('recipes'),
  ]
);

export const ingredients = planner.table(
  'ingredients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }),
    unit: text('unit'),
    /** Grocery aisle such as produce, dairy, pantry. */
    category: text('category'),
    sortOrder: integer('sort_order').notNull().default(0),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [
    index('ingredients_recipe_idx').on(t.recipeId, t.sortOrder),
    ...ownerPolicies('ingredients'),
  ]
);

export type MealTemplateEntry = {
  dayOffset: number;
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId: string | null;
  customMeal: string | null;
  servings: number;
};

/** A reusable day or week of meals. */
export const mealTemplates = planner.table(
  'meal_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    kind: templateKindEnum('kind').notNull().default('week'),
    entries: jsonb('entries').$type<MealTemplateEntry[]>().notNull().default([]),
    ...timestamps(),
  },
  (t) => [index('meal_templates_user_idx').on(t.userId, t.name), ...ownerPolicies('meal_templates')]
);

/** A planned stretch of days, usually a week. */
export const mealPlans = planner.table(
  'meal_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    name: text('name'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    notes: text('notes'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('meal_plans_user_start_idx').on(t.userId, t.startDate),
    ...ownerPolicies('meal_plans'),
  ]
);

export const mealPlanEntries = planner.table(
  'meal_plan_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => mealPlans.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    slot: mealSlotEnum('slot').notNull(),
    recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
    customMeal: text('custom_meal'),
    servings: smallint('servings').notNull().default(1),
    note: text('note'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index('meal_plan_entries_plan_date_idx').on(t.planId, t.date, t.slot),
    ...ownerPolicies('meal_plan_entries'),
  ]
);

export const groceryLists = planner.table(
  'grocery_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    planId: uuid('plan_id').references(() => mealPlans.id, { onDelete: 'set null' }),
    status: groceryStatusEnum('status').notNull().default('open'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [index('grocery_lists_user_idx').on(t.userId, t.status), ...ownerPolicies('grocery_lists')]
);

export const groceryItems = planner.table(
  'grocery_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    listId: uuid('list_id')
      .notNull()
      .references(() => groceryLists.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }),
    unit: text('unit'),
    category: text('category'),
    store: text('store'),
    isPurchased: boolean('is_purchased').notNull().default(false),
    recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index('grocery_items_list_idx').on(t.listId, t.category),
    ...ownerPolicies('grocery_items'),
  ]
);

export type Recipe = typeof recipes.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type MealTemplate = typeof mealTemplates.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type MealPlanEntry = typeof mealPlanEntries.$inferSelect;
export type GroceryList = typeof groceryLists.$inferSelect;
export type GroceryItem = typeof groceryItems.$inferSelect;
