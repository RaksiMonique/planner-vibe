CREATE TYPE "planner"."routine_frequency" AS ENUM('weekly', 'monthly');--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD COLUMN "frequency" "planner"."routine_frequency" DEFAULT 'weekly' NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD COLUMN "interval" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD COLUMN "starts_on" date;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD COLUMN "appointment_time" text;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD COLUMN "appointment_minutes" integer;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD CONSTRAINT "routines_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "planner"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routines_event_idx" ON "planner"."routines" USING btree ("event_id");