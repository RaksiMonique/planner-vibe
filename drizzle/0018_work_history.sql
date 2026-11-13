ALTER TABLE "planner"."shift_patterns" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "planner"."shift_patterns" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "planner"."shifts" ADD COLUMN "deleted_at" timestamp with time zone;