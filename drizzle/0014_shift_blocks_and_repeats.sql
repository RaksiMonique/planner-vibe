ALTER TABLE "planner"."shifts" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "planner"."shifts" ADD COLUMN "repeat_weeks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."shifts" ADD COLUMN "repeat_until" date;