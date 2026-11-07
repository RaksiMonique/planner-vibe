CREATE SCHEMA IF NOT EXISTS "planner";--> statement-breakpoint
CREATE TYPE "planner"."accent" AS ENUM('burgundy', 'terracotta', 'coral', 'peach', 'sage', 'beige');--> statement-breakpoint
CREATE TYPE "planner"."entity_type" AS ENUM('goal', 'project', 'task', 'event', 'habit', 'routine', 'time_block', 'capture');--> statement-breakpoint
CREATE TYPE "planner"."goal_horizon" AS ENUM('lifelong', 'annual', 'quarterly', 'monthly', 'weekly');--> statement-breakpoint
CREATE TYPE "planner"."goal_status" AS ENUM('planned', 'active', 'on_hold', 'achieved', 'abandoned');--> statement-breakpoint
CREATE TYPE "planner"."priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "planner"."project_status" AS ENUM('planned', 'active', 'on_hold', 'done', 'archived');--> statement-breakpoint
CREATE TYPE "planner"."task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "planner"."activity_type" AS ENUM('deep_work', 'light_work', 'break', 'custom');--> statement-breakpoint
CREATE TYPE "planner"."calendar_kind" AS ENUM('personal', 'work', 'other');--> statement-breakpoint
CREATE TYPE "planner"."event_category" AS ENUM('general', 'appointment', 'self_care', 'work', 'other');--> statement-breakpoint
CREATE TYPE "planner"."template_kind" AS ENUM('day', 'week');--> statement-breakpoint
CREATE TYPE "planner"."habit_frequency" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "planner"."routine_kind" AS ENUM('morning', 'evening', 'custom', 'skincare', 'haircare');--> statement-breakpoint
CREATE TYPE "planner"."capture_kind" AS ENUM('task', 'note', 'event');--> statement-breakpoint
CREATE TABLE "planner"."profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "planner"."profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"time_zone" text DEFAULT 'America/Jamaica' NOT NULL,
	"week_starts_on" smallint DEFAULT 1 NOT NULL,
	"enabled_modules" jsonb DEFAULT '{"planning":true,"life-segments":true,"faith":true,"study":true,"wellness":true,"habits":true,"routines":true,"time":true,"journal":true,"reviews":true,"meals":true,"media":true,"gifts":true,"vision-boards":true,"work":true,"notes":true,"important-info":true,"finance":true}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."life_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"accent" "planner"."accent" DEFAULT 'burgundy' NOT NULL,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."life_segments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"entity_type" "planner"."entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."tag_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."goal_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."goal_projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"parent_goal_id" uuid,
	"horizon" "planner"."goal_horizon" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "planner"."goal_status" DEFAULT 'planned' NOT NULL,
	"target_date" date,
	"target_value" numeric(14, 2),
	"current_value" numeric(14, 2),
	"unit" text,
	"progress" smallint DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid,
	"project_id" uuid,
	"title" text NOT NULL,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."milestones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "planner"."project_status" DEFAULT 'planned' NOT NULL,
	"start_date" date,
	"due_date" date,
	"progress" smallint DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."task_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"depends_on_task_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."task_dependencies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"project_id" uuid,
	"goal_id" uuid,
	"milestone_id" uuid,
	"parent_task_id" uuid,
	"title" text NOT NULL,
	"notes" text,
	"status" "planner"."task_status" DEFAULT 'todo' NOT NULL,
	"priority" "planner"."priority" DEFAULT 'medium' NOT NULL,
	"is_important" boolean DEFAULT false NOT NULL,
	"due_date" date,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"rrule" text,
	"dtstart" timestamp with time zone,
	"until" timestamp with time zone,
	"exdates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurrence_date" date,
	"recurrence_parent_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "planner"."calendar_kind" DEFAULT 'personal' NOT NULL,
	"accent" "planner"."accent" DEFAULT 'burgundy' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."calendars" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"calendar_id" uuid NOT NULL,
	"task_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"category" "planner"."event_category" DEFAULT 'general' NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"all_day_date" date,
	"rrule" text,
	"dtstart" timestamp with time zone,
	"until" timestamp with time zone,
	"exdates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurrence_date" date,
	"recurrence_parent_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."time_block_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "planner"."template_kind" DEFAULT 'day' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."time_block_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"project_id" uuid,
	"task_id" uuid,
	"activity_type" "planner"."activity_type" DEFAULT 'custom' NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"rrule" text,
	"dtstart" timestamp with time zone,
	"until" timestamp with time zone,
	"exdates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurrence_date" date,
	"recurrence_parent_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."time_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."habit_check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_id" uuid NOT NULL,
	"date" date NOT NULL,
	"value" smallint DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."habit_check_ins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"frequency" "planner"."habit_frequency" DEFAULT 'daily' NOT NULL,
	"target" smallint DEFAULT 1 NOT NULL,
	"accent" "planner"."accent",
	"reminder_time" time,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."habits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."mood_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"date" date NOT NULL,
	"mood" smallint NOT NULL,
	"energy" smallint NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."mood_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."routine_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"routine_id" uuid NOT NULL,
	"date" date NOT NULL,
	"completed_step_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."routine_completions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."routine_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"routine_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"habit_id" uuid,
	"duration_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."routine_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"kind" "planner"."routine_kind" DEFAULT 'custom' NOT NULL,
	"name" text NOT NULL,
	"days_of_week" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."routines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"project_id" uuid,
	"task_id" uuid,
	"time_block_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."time_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"text" text NOT NULL,
	"kind" "planner"."capture_kind",
	"pinned_date" date,
	"converted_entity_type" text,
	"converted_entity_id" uuid,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."captures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ADD CONSTRAINT "user_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."life_segments" ADD CONSTRAINT "life_segments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tag_assignments" ADD CONSTRAINT "tag_assignments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tag_assignments" ADD CONSTRAINT "tag_assignments_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "planner"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tags" ADD CONSTRAINT "tags_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."goal_projects" ADD CONSTRAINT "goal_projects_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."goal_projects" ADD CONSTRAINT "goal_projects_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "planner"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."goal_projects" ADD CONSTRAINT "goal_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "planner"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."goals" ADD CONSTRAINT "goals_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."goals" ADD CONSTRAINT "goals_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."goals" ADD CONSTRAINT "goals_parent_goal_id_goals_id_fk" FOREIGN KEY ("parent_goal_id") REFERENCES "planner"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."milestones" ADD CONSTRAINT "milestones_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."milestones" ADD CONSTRAINT "milestones_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "planner"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "planner"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."projects" ADD CONSTRAINT "projects_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."projects" ADD CONSTRAINT "projects_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."task_dependencies" ADD CONSTRAINT "task_dependencies_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "planner"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_id_tasks_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "planner"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "planner"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "planner"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "planner"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "planner"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."tasks" ADD CONSTRAINT "tasks_recurrence_parent_id_tasks_id_fk" FOREIGN KEY ("recurrence_parent_id") REFERENCES "planner"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."calendars" ADD CONSTRAINT "calendars_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."events" ADD CONSTRAINT "events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."events" ADD CONSTRAINT "events_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."events" ADD CONSTRAINT "events_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "planner"."calendars"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."events" ADD CONSTRAINT "events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "planner"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."events" ADD CONSTRAINT "events_recurrence_parent_id_events_id_fk" FOREIGN KEY ("recurrence_parent_id") REFERENCES "planner"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_block_templates" ADD CONSTRAINT "time_block_templates_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_blocks" ADD CONSTRAINT "time_blocks_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_blocks" ADD CONSTRAINT "time_blocks_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_blocks" ADD CONSTRAINT "time_blocks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "planner"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_blocks" ADD CONSTRAINT "time_blocks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "planner"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_blocks" ADD CONSTRAINT "time_blocks_recurrence_parent_id_time_blocks_id_fk" FOREIGN KEY ("recurrence_parent_id") REFERENCES "planner"."time_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."habit_check_ins" ADD CONSTRAINT "habit_check_ins_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."habit_check_ins" ADD CONSTRAINT "habit_check_ins_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "planner"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD CONSTRAINT "habits_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."habits" ADD CONSTRAINT "habits_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."mood_entries" ADD CONSTRAINT "mood_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."mood_entries" ADD CONSTRAINT "mood_entries_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."routine_completions" ADD CONSTRAINT "routine_completions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."routine_completions" ADD CONSTRAINT "routine_completions_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "planner"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."routine_steps" ADD CONSTRAINT "routine_steps_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."routine_steps" ADD CONSTRAINT "routine_steps_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "planner"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."routine_steps" ADD CONSTRAINT "routine_steps_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "planner"."habits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD CONSTRAINT "routines_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."routines" ADD CONSTRAINT "routines_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_entries" ADD CONSTRAINT "time_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_entries" ADD CONSTRAINT "time_entries_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "planner"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "planner"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."time_entries" ADD CONSTRAINT "time_entries_time_block_id_time_blocks_id_fk" FOREIGN KEY ("time_block_id") REFERENCES "planner"."time_blocks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."captures" ADD CONSTRAINT "captures_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "life_segments_user_slug_idx" ON "planner"."life_segments" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "life_segments_user_sort_idx" ON "planner"."life_segments" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_assignments_tag_entity_idx" ON "planner"."tag_assignments" USING btree ("tag_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "tag_assignments_entity_idx" ON "planner"."tag_assignments" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_idx" ON "planner"."tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_projects_pair_idx" ON "planner"."goal_projects" USING btree ("goal_id","project_id");--> statement-breakpoint
CREATE INDEX "goals_user_segment_idx" ON "planner"."goals" USING btree ("user_id","life_segment_id");--> statement-breakpoint
CREATE INDEX "goals_user_horizon_idx" ON "planner"."goals" USING btree ("user_id","horizon");--> statement-breakpoint
CREATE INDEX "goals_parent_idx" ON "planner"."goals" USING btree ("parent_goal_id");--> statement-breakpoint
CREATE INDEX "milestones_goal_idx" ON "planner"."milestones" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "milestones_project_idx" ON "planner"."milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_user_segment_idx" ON "planner"."projects" USING btree ("user_id","life_segment_id");--> statement-breakpoint
CREATE INDEX "projects_user_status_idx" ON "planner"."projects" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "task_dependencies_pair_idx" ON "planner"."task_dependencies" USING btree ("task_id","depends_on_task_id");--> statement-breakpoint
CREATE INDEX "tasks_user_segment_idx" ON "planner"."tasks" USING btree ("user_id","life_segment_id");--> statement-breakpoint
CREATE INDEX "tasks_user_due_idx" ON "planner"."tasks" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "planner"."tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "planner"."tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_parent_idx" ON "planner"."tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendars_user_name_idx" ON "planner"."calendars" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "events_user_starts_idx" ON "planner"."events" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE INDEX "events_user_all_day_idx" ON "planner"."events" USING btree ("user_id","all_day_date");--> statement-breakpoint
CREATE INDEX "events_calendar_idx" ON "planner"."events" USING btree ("calendar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "time_block_templates_user_name_idx" ON "planner"."time_block_templates" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "time_blocks_user_starts_idx" ON "planner"."time_blocks" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE INDEX "time_blocks_task_idx" ON "planner"."time_blocks" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_check_ins_habit_date_idx" ON "planner"."habit_check_ins" USING btree ("habit_id","date");--> statement-breakpoint
CREATE INDEX "habit_check_ins_user_date_idx" ON "planner"."habit_check_ins" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "habits_user_segment_idx" ON "planner"."habits" USING btree ("user_id","life_segment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mood_entries_user_date_idx" ON "planner"."mood_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "routine_completions_routine_date_idx" ON "planner"."routine_completions" USING btree ("routine_id","date");--> statement-breakpoint
CREATE INDEX "routine_steps_routine_idx" ON "planner"."routine_steps" USING btree ("routine_id","sort_order");--> statement-breakpoint
CREATE INDEX "routines_user_kind_idx" ON "planner"."routines" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "time_entries_user_started_idx" ON "planner"."time_entries" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "time_entries_task_idx" ON "planner"."time_entries" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "captures_user_open_idx" ON "planner"."captures" USING btree ("user_id","converted_at");--> statement-breakpoint
CREATE INDEX "captures_user_pinned_idx" ON "planner"."captures" USING btree ("user_id","pinned_date");--> statement-breakpoint
CREATE POLICY "profiles_select" ON "planner"."profiles" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "profiles_insert" ON "planner"."profiles" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "profiles_update" ON "planner"."profiles" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = id) WITH CHECK (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "profiles_delete" ON "planner"."profiles" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "user_preferences_select" ON "planner"."user_preferences" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "user_preferences_insert" ON "planner"."user_preferences" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "user_preferences_update" ON "planner"."user_preferences" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "user_preferences_delete" ON "planner"."user_preferences" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "life_segments_select" ON "planner"."life_segments" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "life_segments_insert" ON "planner"."life_segments" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "life_segments_update" ON "planner"."life_segments" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "life_segments_delete" ON "planner"."life_segments" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tag_assignments_select" ON "planner"."tag_assignments" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tag_assignments_insert" ON "planner"."tag_assignments" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tag_assignments_update" ON "planner"."tag_assignments" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tag_assignments_delete" ON "planner"."tag_assignments" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tags_select" ON "planner"."tags" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tags_insert" ON "planner"."tags" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tags_update" ON "planner"."tags" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tags_delete" ON "planner"."tags" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "goal_projects_select" ON "planner"."goal_projects" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "goal_projects_insert" ON "planner"."goal_projects" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "goal_projects_update" ON "planner"."goal_projects" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "goal_projects_delete" ON "planner"."goal_projects" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "goals_select" ON "planner"."goals" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "goals_insert" ON "planner"."goals" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "goals_update" ON "planner"."goals" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "goals_delete" ON "planner"."goals" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "milestones_select" ON "planner"."milestones" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "milestones_insert" ON "planner"."milestones" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "milestones_update" ON "planner"."milestones" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "milestones_delete" ON "planner"."milestones" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "projects_select" ON "planner"."projects" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "projects_insert" ON "planner"."projects" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "projects_update" ON "planner"."projects" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "projects_delete" ON "planner"."projects" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "task_dependencies_select" ON "planner"."task_dependencies" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "task_dependencies_insert" ON "planner"."task_dependencies" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "task_dependencies_update" ON "planner"."task_dependencies" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "task_dependencies_delete" ON "planner"."task_dependencies" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tasks_select" ON "planner"."tasks" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tasks_insert" ON "planner"."tasks" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tasks_update" ON "planner"."tasks" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "tasks_delete" ON "planner"."tasks" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "calendars_select" ON "planner"."calendars" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "calendars_insert" ON "planner"."calendars" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "calendars_update" ON "planner"."calendars" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "calendars_delete" ON "planner"."calendars" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "events_select" ON "planner"."events" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "events_insert" ON "planner"."events" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "events_update" ON "planner"."events" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "events_delete" ON "planner"."events" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_block_templates_select" ON "planner"."time_block_templates" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_block_templates_insert" ON "planner"."time_block_templates" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_block_templates_update" ON "planner"."time_block_templates" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_block_templates_delete" ON "planner"."time_block_templates" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_blocks_select" ON "planner"."time_blocks" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_blocks_insert" ON "planner"."time_blocks" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_blocks_update" ON "planner"."time_blocks" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_blocks_delete" ON "planner"."time_blocks" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habit_check_ins_select" ON "planner"."habit_check_ins" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habit_check_ins_insert" ON "planner"."habit_check_ins" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habit_check_ins_update" ON "planner"."habit_check_ins" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habit_check_ins_delete" ON "planner"."habit_check_ins" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habits_select" ON "planner"."habits" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habits_insert" ON "planner"."habits" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habits_update" ON "planner"."habits" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "habits_delete" ON "planner"."habits" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "mood_entries_select" ON "planner"."mood_entries" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "mood_entries_insert" ON "planner"."mood_entries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "mood_entries_update" ON "planner"."mood_entries" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "mood_entries_delete" ON "planner"."mood_entries" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routine_completions_select" ON "planner"."routine_completions" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routine_completions_insert" ON "planner"."routine_completions" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routine_completions_update" ON "planner"."routine_completions" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routine_completions_delete" ON "planner"."routine_completions" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routine_steps_select" ON "planner"."routine_steps" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routine_steps_insert" ON "planner"."routine_steps" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routine_steps_update" ON "planner"."routine_steps" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routine_steps_delete" ON "planner"."routine_steps" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routines_select" ON "planner"."routines" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routines_insert" ON "planner"."routines" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routines_update" ON "planner"."routines" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "routines_delete" ON "planner"."routines" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_entries_select" ON "planner"."time_entries" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_entries_insert" ON "planner"."time_entries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_entries_update" ON "planner"."time_entries" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "time_entries_delete" ON "planner"."time_entries" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "captures_select" ON "planner"."captures" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "captures_insert" ON "planner"."captures" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "captures_update" ON "planner"."captures" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "captures_delete" ON "planner"."captures" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);