ALTER TABLE "planner"."shifts" ADD COLUMN "repeat_every" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."shifts" ADD COLUMN "repeat_unit" text DEFAULT 'week' NOT NULL;--> statement-breakpoint
UPDATE "planner"."shifts" SET "repeat_every" = "repeat_weeks";
