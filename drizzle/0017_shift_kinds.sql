CREATE TABLE "planner"."shift_kinds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"counts_as" "planner"."shift_kind" DEFAULT 'work' NOT NULL,
	"accent" "planner"."accent" DEFAULT 'burgundy' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."shift_kinds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."shifts" ADD COLUMN "kind_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."shift_kinds" ADD CONSTRAINT "shift_kinds_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shift_kinds_user_name_idx" ON "planner"."shift_kinds" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "planner"."shifts" ADD CONSTRAINT "shifts_kind_id_shift_kinds_id_fk" FOREIGN KEY ("kind_id") REFERENCES "planner"."shift_kinds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "shift_kinds_select" ON "planner"."shift_kinds" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shift_kinds_insert" ON "planner"."shift_kinds" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shift_kinds_update" ON "planner"."shift_kinds" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "shift_kinds_delete" ON "planner"."shift_kinds" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);