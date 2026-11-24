CREATE TABLE "planner"."habit_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_id" uuid NOT NULL,
	"title" text NOT NULL,
	"planned_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."habit_plan_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD COLUMN "details" text;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD COLUMN "bible_study_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD COLUMN "reading_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD COLUMN "routine_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."habit_plan_items" ADD CONSTRAINT "habit_plan_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."habit_plan_items" ADD CONSTRAINT "habit_plan_items_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "planner"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "habit_plan_items_habit_idx" ON "planner"."habit_plan_items" USING btree ("habit_id","sort_order");--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD CONSTRAINT "habits_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "planner"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD CONSTRAINT "habits_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "planner"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD CONSTRAINT "habits_bible_study_id_bible_studies_id_fk" FOREIGN KEY ("bible_study_id") REFERENCES "planner"."bible_studies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD CONSTRAINT "habits_reading_plan_id_reading_plans_id_fk" FOREIGN KEY ("reading_plan_id") REFERENCES "planner"."reading_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD CONSTRAINT "habits_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "planner"."routines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "habit_plan_items_select" ON "planner"."habit_plan_items" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habit_plan_items_insert" ON "planner"."habit_plan_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habit_plan_items_update" ON "planner"."habit_plan_items" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habit_plan_items_delete" ON "planner"."habit_plan_items" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);