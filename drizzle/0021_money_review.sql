CREATE TABLE "planner"."budget_months" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"month" date NOT NULL,
	"limit_amount" numeric(14, 2) NOT NULL,
	"spent_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."budget_months" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."finance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" date NOT NULL,
	"note" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."finance_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD COLUMN "budget_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."budget_months" ADD CONSTRAINT "budget_months_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."budget_months" ADD CONSTRAINT "budget_months_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "planner"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."finance_reviews" ADD CONSTRAINT "finance_reviews_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "budget_months_budget_month_idx" ON "planner"."budget_months" USING btree ("budget_id","month");--> statement-breakpoint
CREATE INDEX "budget_months_user_month_idx" ON "planner"."budget_months" USING btree ("user_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "finance_reviews_user_month_idx" ON "planner"."finance_reviews" USING btree ("user_id","month");--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "planner"."budgets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "budget_months_select" ON "planner"."budget_months" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "budget_months_insert" ON "planner"."budget_months" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "budget_months_update" ON "planner"."budget_months" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "budget_months_delete" ON "planner"."budget_months" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "finance_reviews_select" ON "planner"."finance_reviews" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "finance_reviews_insert" ON "planner"."finance_reviews" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "finance_reviews_update" ON "planner"."finance_reviews" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "finance_reviews_delete" ON "planner"."finance_reviews" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);