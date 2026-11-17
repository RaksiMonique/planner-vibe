-- The approved palette changed (instructions.md 2.1, 2026-11-17). Renaming the
-- enum labels keeps every segment, calendar, habit, subject, shift kind and
-- pattern on the closest new colour.
ALTER TYPE "planner"."accent" RENAME VALUE 'burgundy' TO 'plum';--> statement-breakpoint
ALTER TYPE "planner"."accent" RENAME VALUE 'terracotta' TO 'crimson';--> statement-breakpoint
ALTER TYPE "planner"."accent" RENAME VALUE 'coral' TO 'raspberry';--> statement-breakpoint
ALTER TYPE "planner"."accent" RENAME VALUE 'peach' TO 'gold';--> statement-breakpoint
ALTER TYPE "planner"."accent" RENAME VALUE 'sage' TO 'rose';--> statement-breakpoint
ALTER TYPE "planner"."accent" RENAME VALUE 'beige' TO 'blush';
