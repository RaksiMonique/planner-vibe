CREATE TYPE "planner"."leave_kind" AS ENUM('annual', 'sick', 'unpaid', 'other');--> statement-breakpoint
CREATE TYPE "planner"."leave_status" AS ENUM('planned', 'approved', 'taken');--> statement-breakpoint
CREATE TYPE "planner"."shift_kind" AS ENUM('work', 'on_call', 'off');--> statement-breakpoint
CREATE TYPE "planner"."budget_period" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TABLE "planner"."leave_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"kind" "planner"."leave_kind" DEFAULT 'annual' NOT NULL,
	"status" "planner"."leave_status" DEFAULT 'planned' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"note" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."leave_periods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."public_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."public_holidays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."shift_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"anchor_date" date NOT NULL,
	"cycle" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accent" "planner"."accent" DEFAULT 'burgundy' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."shift_patterns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"pattern_id" uuid,
	"date" date NOT NULL,
	"kind" "planner"."shift_kind" DEFAULT 'work' NOT NULL,
	"label" text,
	"start_time" time,
	"end_time" time,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."shifts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"period" "planner"."budget_period" DEFAULT 'monthly' NOT NULL,
	"limit_amount" numeric(14, 2) NOT NULL,
	"spent_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."leave_periods" ADD CONSTRAINT "leave_periods_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."leave_periods" ADD CONSTRAINT "leave_periods_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."public_holidays" ADD CONSTRAINT "public_holidays_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."shift_patterns" ADD CONSTRAINT "shift_patterns_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."shift_patterns" ADD CONSTRAINT "shift_patterns_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."shifts" ADD CONSTRAINT "shifts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."shifts" ADD CONSTRAINT "shifts_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."shifts" ADD CONSTRAINT "shifts_pattern_id_shift_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "planner"."shift_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."budgets" ADD CONSTRAINT "budgets_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."budgets" ADD CONSTRAINT "budgets_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leave_periods_user_start_idx" ON "planner"."leave_periods" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "public_holidays_user_date_idx" ON "planner"."public_holidays" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "shift_patterns_user_idx" ON "planner"."shift_patterns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shifts_user_date_idx" ON "planner"."shifts" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "budgets_user_idx" ON "planner"."budgets" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "leave_periods_select" ON "planner"."leave_periods" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "leave_periods_insert" ON "planner"."leave_periods" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "leave_periods_update" ON "planner"."leave_periods" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "leave_periods_delete" ON "planner"."leave_periods" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "public_holidays_select" ON "planner"."public_holidays" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "public_holidays_insert" ON "planner"."public_holidays" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "public_holidays_update" ON "planner"."public_holidays" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "public_holidays_delete" ON "planner"."public_holidays" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shift_patterns_select" ON "planner"."shift_patterns" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shift_patterns_insert" ON "planner"."shift_patterns" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shift_patterns_update" ON "planner"."shift_patterns" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shift_patterns_delete" ON "planner"."shift_patterns" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shifts_select" ON "planner"."shifts" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shifts_insert" ON "planner"."shifts" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shifts_update" ON "planner"."shifts" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shifts_delete" ON "planner"."shifts" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "budgets_select" ON "planner"."budgets" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "budgets_insert" ON "planner"."budgets" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "budgets_update" ON "planner"."budgets" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "budgets_delete" ON "planner"."budgets" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);