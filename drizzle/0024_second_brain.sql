ALTER TYPE "planner"."activity_type" ADD VALUE 'fun' BEFORE 'custom';--> statement-breakpoint
ALTER TYPE "planner"."activity_type" ADD VALUE 'admin' BEFORE 'custom';--> statement-breakpoint
CREATE TABLE "planner"."break_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"is_movement" boolean DEFAULT false NOT NULL,
	"habit_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."break_ideas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD COLUMN "why" text;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."journal_entries" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."notes" ADD COLUMN "media_item_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."notes" ADD COLUMN "why" text;--> statement-breakpoint
ALTER TABLE "planner"."notes" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."break_ideas" ADD CONSTRAINT "break_ideas_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."break_ideas" ADD CONSTRAINT "break_ideas_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "planner"."habits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "break_ideas_user_idx" ON "planner"."break_ideas" USING btree ("user_id","sort_order");--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD CONSTRAINT "habits_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "planner"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."journal_entries" ADD CONSTRAINT "journal_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "planner"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."notes" ADD CONSTRAINT "notes_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "planner"."media_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_tags_idx" ON "planner"."notes" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "notes_media_item_idx" ON "planner"."notes" USING btree ("media_item_id");--> statement-breakpoint
CREATE POLICY "break_ideas_select" ON "planner"."break_ideas" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "break_ideas_insert" ON "planner"."break_ideas" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "break_ideas_update" ON "planner"."break_ideas" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "break_ideas_delete" ON "planner"."break_ideas" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);