-- Event categories become free text: the five built-in keys stay as values, and
-- users may add labels of their own. Postgres needs the enum default gone and an
-- explicit cast before the column can change type.
ALTER TABLE "planner"."events" ALTER COLUMN "category" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "planner"."events" ALTER COLUMN "category" SET DATA TYPE text USING "category"::text;--> statement-breakpoint
ALTER TABLE "planner"."events" ALTER COLUMN "category" SET DEFAULT 'general';--> statement-breakpoint
DROP TYPE "planner"."event_category";
