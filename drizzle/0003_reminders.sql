CREATE TYPE "planner"."notification_kind" AS ENUM('reminder', 'system');--> statement-breakpoint
CREATE TYPE "planner"."reminder_entity" AS ENUM('task', 'event', 'habit', 'routine', 'time_block');--> statement-breakpoint
CREATE TABLE "planner"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "planner"."notification_kind" DEFAULT 'reminder' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"reminder_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" "planner"."reminder_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."notifications" ADD CONSTRAINT "notifications_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "planner"."reminders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."reminders" ADD CONSTRAINT "reminders_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "planner"."notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_reminder_idx" ON "planner"."notifications" USING btree ("reminder_id");--> statement-breakpoint
CREATE INDEX "reminders_user_remind_idx" ON "planner"."reminders" USING btree ("user_id","remind_at");--> statement-breakpoint
CREATE INDEX "reminders_entity_idx" ON "planner"."reminders" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE POLICY "notifications_select" ON "planner"."notifications" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "notifications_insert" ON "planner"."notifications" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "notifications_update" ON "planner"."notifications" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "notifications_delete" ON "planner"."notifications" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reminders_select" ON "planner"."reminders" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reminders_insert" ON "planner"."reminders" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reminders_update" ON "planner"."reminders" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reminders_delete" ON "planner"."reminders" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);