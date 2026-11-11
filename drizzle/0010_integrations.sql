CREATE TYPE "planner"."calendar_provider" AS ENUM('google');--> statement-breakpoint
CREATE TYPE "planner"."connection_status" AS ENUM('connected', 'error', 'revoked');--> statement-breakpoint
CREATE TABLE "planner"."calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "planner"."calendar_provider" DEFAULT 'google' NOT NULL,
	"account_email" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"calendar_id" text,
	"calendar_name" text,
	"sync_token" text,
	"last_synced_at" timestamp with time zone,
	"status" "planner"."connection_status" DEFAULT 'connected' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."calendar_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."external_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"all_day_date" date,
	"all_day_end" date,
	"html_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."external_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ADD COLUMN "dashboard_layout" jsonb;--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ADD COLUMN "ics_token" text;--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ADD COLUMN "email_reminders" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ADD COLUMN "push_reminders" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ADD COLUMN "digest_hour" smallint DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."goals" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."projects" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."events" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "planner"."events" ADD COLUMN "external_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "planner"."events" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", '') || ' ' || coalesce("location", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."bible_studies" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."prayer_entries" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("content", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."courses" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."journal_entries" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("content", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."media_items" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("creator", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."notes" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("content", '') || ' ' || coalesce("author", '') || ' ' || coalesce("source", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."products" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."recipes" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."gifts" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."vision_boards" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("description", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."important_records" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "planner"."calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."external_events" ADD CONSTRAINT "external_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."external_events" ADD CONSTRAINT "external_events_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "planner"."calendar_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_user_provider_idx" ON "planner"."calendar_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "external_events_connection_external_idx" ON "planner"."external_events" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "external_events_user_start_idx" ON "planner"."external_events" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_idx" ON "planner"."push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "planner"."push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goals_search_idx" ON "planner"."goals" USING gin ("search");--> statement-breakpoint
CREATE INDEX "projects_search_idx" ON "planner"."projects" USING gin ("search");--> statement-breakpoint
CREATE INDEX "tasks_search_idx" ON "planner"."tasks" USING gin ("search");--> statement-breakpoint
CREATE INDEX "events_search_idx" ON "planner"."events" USING gin ("search");--> statement-breakpoint
CREATE INDEX "habits_search_idx" ON "planner"."habits" USING gin ("search");--> statement-breakpoint
CREATE INDEX "routines_search_idx" ON "planner"."routines" USING gin ("search");--> statement-breakpoint
CREATE INDEX "bible_studies_search_idx" ON "planner"."bible_studies" USING gin ("search");--> statement-breakpoint
CREATE INDEX "prayer_entries_search_idx" ON "planner"."prayer_entries" USING gin ("search");--> statement-breakpoint
CREATE INDEX "courses_search_idx" ON "planner"."courses" USING gin ("search");--> statement-breakpoint
CREATE INDEX "journal_entries_search_idx" ON "planner"."journal_entries" USING gin ("search");--> statement-breakpoint
CREATE INDEX "media_items_search_idx" ON "planner"."media_items" USING gin ("search");--> statement-breakpoint
CREATE INDEX "notes_search_idx" ON "planner"."notes" USING gin ("search");--> statement-breakpoint
CREATE INDEX "products_search_idx" ON "planner"."products" USING gin ("search");--> statement-breakpoint
CREATE INDEX "recipes_search_idx" ON "planner"."recipes" USING gin ("search");--> statement-breakpoint
CREATE INDEX "gifts_search_idx" ON "planner"."gifts" USING gin ("search");--> statement-breakpoint
CREATE INDEX "vision_boards_search_idx" ON "planner"."vision_boards" USING gin ("search");--> statement-breakpoint
CREATE INDEX "important_records_search_idx" ON "planner"."important_records" USING gin ("search");--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ADD CONSTRAINT "user_preferences_ics_token_unique" UNIQUE("ics_token");--> statement-breakpoint
CREATE POLICY "calendar_connections_select" ON "planner"."calendar_connections" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "calendar_connections_insert" ON "planner"."calendar_connections" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "calendar_connections_update" ON "planner"."calendar_connections" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "calendar_connections_delete" ON "planner"."calendar_connections" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "external_events_select" ON "planner"."external_events" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "external_events_insert" ON "planner"."external_events" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "external_events_update" ON "planner"."external_events" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "external_events_delete" ON "planner"."external_events" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "push_subscriptions_select" ON "planner"."push_subscriptions" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "push_subscriptions_insert" ON "planner"."push_subscriptions" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "push_subscriptions_update" ON "planner"."push_subscriptions" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "push_subscriptions_delete" ON "planner"."push_subscriptions" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);