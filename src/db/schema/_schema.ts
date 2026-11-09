import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * Every planner table and enum is created through this schema object, so
 * nothing lands in `public`, and drizzle.config.ts filters drizzle-kit to this
 * schema. Defence in depth for the isolation rule in docs/decisions/0002.
 */
export const planner = pgSchema('planner');
