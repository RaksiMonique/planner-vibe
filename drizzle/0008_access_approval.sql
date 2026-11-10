CREATE TYPE "planner"."access_status" AS ENUM('pending', 'approved', 'blocked');--> statement-breakpoint
CREATE TYPE "planner"."profile_role" AS ENUM('owner', 'member');--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ALTER COLUMN "enabled_modules" SET DEFAULT '{"planning":true,"life-segments":true,"faith":true,"study":true,"wellness":true,"habits":true,"routines":true,"time":true,"journal":true,"reviews":true,"meals":true,"media":true,"gifts":true,"vision-boards":true,"work":true,"notes":true,"important-info":true,"finance":true,"cycle-tracking":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "planner"."profiles" ADD COLUMN "access_status" "planner"."access_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."profiles" ADD COLUMN "role" "planner"."profile_role" DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."profiles" ADD COLUMN "requested_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."profiles" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "planner"."profiles" ADD COLUMN "approved_by" uuid;