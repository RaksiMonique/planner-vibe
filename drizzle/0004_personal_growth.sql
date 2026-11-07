CREATE TYPE "planner"."bible_study_kind" AS ENUM('study', 'devotional', 'reading', 'course');--> statement-breakpoint
CREATE TYPE "planner"."bible_study_status" AS ENUM('not_started', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "planner"."prayer_kind" AS ENUM('intention', 'journal');--> statement-breakpoint
CREATE TYPE "planner"."reading_plan_status" AS ENUM('active', 'paused', 'done');--> statement-breakpoint
CREATE TYPE "planner"."testament" AS ENUM('old', 'new');--> statement-breakpoint
CREATE TYPE "planner"."course_status" AS ENUM('planned', 'in_progress', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "planner"."resource_kind" AS ENUM('link', 'book', 'video', 'file', 'other');--> statement-breakpoint
CREATE TYPE "planner"."study_session_kind" AS ENUM('focus', 'pomodoro', 'reading', 'review');--> statement-breakpoint
CREATE TYPE "planner"."journal_kind" AS ENUM('daily', 'gratitude', 'wellness', 'reflection');--> statement-breakpoint
CREATE TYPE "planner"."review_kind" AS ENUM('weekly', 'monthly', 'quarterly', 'annual', 'goal');--> statement-breakpoint
CREATE TYPE "planner"."media_kind" AS ENUM('book', 'movie', 'series', 'song', 'other');--> statement-breakpoint
CREATE TYPE "planner"."media_status" AS ENUM('wishlist', 'in_progress', 'done', 'abandoned');--> statement-breakpoint
CREATE TYPE "planner"."note_kind" AS ENUM('note', 'quote');--> statement-breakpoint
CREATE TABLE "planner"."bible_books" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"testament" "planner"."testament" NOT NULL,
	"category" text NOT NULL,
	"chapters" smallint NOT NULL,
	"deuterocanonical" boolean DEFAULT false NOT NULL,
	CONSTRAINT "bible_books_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "planner"."bible_studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" "planner"."bible_study_kind" DEFAULT 'study' NOT NULL,
	"status" "planner"."bible_study_status" DEFAULT 'not_started' NOT NULL,
	"priority" "planner"."priority" DEFAULT 'medium' NOT NULL,
	"translation" text,
	"prerequisite_id" uuid,
	"description" text,
	"last_studied_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."bible_studies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."bible_study_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"study_id" uuid NOT NULL,
	"reference_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."bible_study_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."devotional_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"source" text,
	"reference_id" uuid,
	"reflection" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."devotional_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."prayer_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"kind" "planner"."prayer_kind" DEFAULT 'intention' NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"answered_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."prayer_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."reading_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"book_ids" jsonb,
	"chapters_per_day" smallint DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"status" "planner"."reading_plan_status" DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."reading_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."reading_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" smallint NOT NULL,
	"read_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."reading_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."scripture_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" smallint NOT NULL,
	"verse_start" smallint,
	"verse_end" smallint,
	"chapter_end" smallint,
	"label" text NOT NULL,
	"is_bookmark" boolean DEFAULT false NOT NULL,
	"is_favourite" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."scripture_references" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"subject_id" uuid,
	"course_id" uuid,
	"task_id" uuid,
	"title" text NOT NULL,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"subject_id" uuid,
	"project_id" uuid,
	"title" text NOT NULL,
	"provider" text,
	"url" text,
	"status" "planner"."course_status" DEFAULT 'planned' NOT NULL,
	"start_date" date,
	"due_date" date,
	"progress" smallint DEFAULT 0 NOT NULL,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."courses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."learning_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid,
	"course_id" uuid,
	"kind" "planner"."resource_kind" DEFAULT 'link' NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."learning_resources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."study_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid,
	"course_id" uuid,
	"lesson_id" uuid,
	"title" text NOT NULL,
	"content" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."study_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"subject_id" uuid,
	"course_id" uuid,
	"lesson_id" uuid,
	"time_entry_id" uuid,
	"kind" "planner"."study_session_kind" DEFAULT 'focus' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"pomodoros" smallint DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"accent" "planner"."accent",
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."subjects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"kind" "planner"."journal_kind" DEFAULT 'daily' NOT NULL,
	"date" date NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"mood" smallint,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."journal_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"kind" "planner"."review_kind" NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"goal_id" uuid,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" text,
	"completed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."media_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid,
	"kind" "planner"."media_kind" DEFAULT 'book' NOT NULL,
	"title" text NOT NULL,
	"creator" text,
	"cover_url" text,
	"category" text,
	"status" "planner"."media_status" DEFAULT 'wishlist' NOT NULL,
	"rating" smallint,
	"review" text,
	"notes" text,
	"is_favourite" boolean DEFAULT false NOT NULL,
	"started_on" date,
	"finished_on" date,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."media_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."media_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."media_list_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."media_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "planner"."media_kind",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."media_lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."media_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"date" date NOT NULL,
	"progress" text,
	"minutes" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."media_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"kind" "planner"."note_kind" DEFAULT 'note' NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"author" text,
	"source" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."bible_studies" ADD CONSTRAINT "bible_studies_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."bible_studies" ADD CONSTRAINT "bible_studies_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."bible_study_notes" ADD CONSTRAINT "bible_study_notes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."bible_study_notes" ADD CONSTRAINT "bible_study_notes_study_id_bible_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "planner"."bible_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."bible_study_notes" ADD CONSTRAINT "bible_study_notes_reference_id_scripture_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "planner"."scripture_references"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."devotional_entries" ADD CONSTRAINT "devotional_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."devotional_entries" ADD CONSTRAINT "devotional_entries_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."devotional_entries" ADD CONSTRAINT "devotional_entries_reference_id_scripture_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "planner"."scripture_references"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."prayer_entries" ADD CONSTRAINT "prayer_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."prayer_entries" ADD CONSTRAINT "prayer_entries_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."reading_plans" ADD CONSTRAINT "reading_plans_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."reading_plans" ADD CONSTRAINT "reading_plans_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."reading_progress" ADD CONSTRAINT "reading_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."reading_progress" ADD CONSTRAINT "reading_progress_plan_id_reading_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "planner"."reading_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."reading_progress" ADD CONSTRAINT "reading_progress_book_id_bible_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "planner"."bible_books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."scripture_references" ADD CONSTRAINT "scripture_references_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."scripture_references" ADD CONSTRAINT "scripture_references_book_id_bible_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "planner"."bible_books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."assignments" ADD CONSTRAINT "assignments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."assignments" ADD CONSTRAINT "assignments_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."assignments" ADD CONSTRAINT "assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "planner"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."assignments" ADD CONSTRAINT "assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "planner"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."assignments" ADD CONSTRAINT "assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "planner"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."courses" ADD CONSTRAINT "courses_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."courses" ADD CONSTRAINT "courses_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."courses" ADD CONSTRAINT "courses_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "planner"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."courses" ADD CONSTRAINT "courses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "planner"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."learning_resources" ADD CONSTRAINT "learning_resources_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."learning_resources" ADD CONSTRAINT "learning_resources_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "planner"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."learning_resources" ADD CONSTRAINT "learning_resources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "planner"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."lessons" ADD CONSTRAINT "lessons_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "planner"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_notes" ADD CONSTRAINT "study_notes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_notes" ADD CONSTRAINT "study_notes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "planner"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_notes" ADD CONSTRAINT "study_notes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "planner"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_notes" ADD CONSTRAINT "study_notes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "planner"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ADD CONSTRAINT "study_sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ADD CONSTRAINT "study_sessions_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ADD CONSTRAINT "study_sessions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "planner"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ADD CONSTRAINT "study_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "planner"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ADD CONSTRAINT "study_sessions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "planner"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."study_sessions" ADD CONSTRAINT "study_sessions_time_entry_id_time_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "planner"."time_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."subjects" ADD CONSTRAINT "subjects_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."subjects" ADD CONSTRAINT "subjects_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."journal_entries" ADD CONSTRAINT "journal_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."journal_entries" ADD CONSTRAINT "journal_entries_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."reviews" ADD CONSTRAINT "reviews_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."reviews" ADD CONSTRAINT "reviews_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."reviews" ADD CONSTRAINT "reviews_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "planner"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."media_items" ADD CONSTRAINT "media_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."media_items" ADD CONSTRAINT "media_items_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."media_list_items" ADD CONSTRAINT "media_list_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."media_list_items" ADD CONSTRAINT "media_list_items_list_id_media_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "planner"."media_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."media_list_items" ADD CONSTRAINT "media_list_items_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "planner"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."media_lists" ADD CONSTRAINT "media_lists_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."media_logs" ADD CONSTRAINT "media_logs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."media_logs" ADD CONSTRAINT "media_logs_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "planner"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."media_logs" ADD CONSTRAINT "media_logs_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."notes" ADD CONSTRAINT "notes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."notes" ADD CONSTRAINT "notes_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bible_studies_user_status_idx" ON "planner"."bible_studies" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "bible_study_notes_study_idx" ON "planner"."bible_study_notes" USING btree ("study_id","created_at");--> statement-breakpoint
CREATE INDEX "devotional_entries_user_date_idx" ON "planner"."devotional_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "prayer_entries_user_date_idx" ON "planner"."prayer_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "reading_plans_user_idx" ON "planner"."reading_plans" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_progress_plan_chapter_idx" ON "planner"."reading_progress" USING btree ("plan_id","book_id","chapter");--> statement-breakpoint
CREATE INDEX "reading_progress_user_date_idx" ON "planner"."reading_progress" USING btree ("user_id","read_on");--> statement-breakpoint
CREATE INDEX "scripture_references_user_idx" ON "planner"."scripture_references" USING btree ("user_id","book_id","chapter");--> statement-breakpoint
CREATE INDEX "assignments_user_due_idx" ON "planner"."assignments" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "courses_user_status_idx" ON "planner"."courses" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "learning_resources_user_idx" ON "planner"."learning_resources" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "lessons_course_idx" ON "planner"."lessons" USING btree ("course_id","sort_order");--> statement-breakpoint
CREATE INDEX "study_notes_user_idx" ON "planner"."study_notes" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "study_sessions_user_started_idx" ON "planner"."study_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "subjects_user_idx" ON "planner"."subjects" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "journal_entries_user_date_idx" ON "planner"."journal_entries" USING btree ("user_id","date","kind");--> statement-breakpoint
CREATE INDEX "reviews_user_kind_period_idx" ON "planner"."reviews" USING btree ("user_id","kind","period_start");--> statement-breakpoint
CREATE INDEX "media_items_user_kind_status_idx" ON "planner"."media_items" USING btree ("user_id","kind","status");--> statement-breakpoint
CREATE UNIQUE INDEX "media_list_items_list_item_idx" ON "planner"."media_list_items" USING btree ("list_id","media_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_lists_user_name_idx" ON "planner"."media_lists" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "media_logs_user_date_idx" ON "planner"."media_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "notes_user_kind_idx" ON "planner"."notes" USING btree ("user_id","kind","updated_at");--> statement-breakpoint
CREATE POLICY "bible_studies_select" ON "planner"."bible_studies" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "bible_studies_insert" ON "planner"."bible_studies" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "bible_studies_update" ON "planner"."bible_studies" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "bible_studies_delete" ON "planner"."bible_studies" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "bible_study_notes_select" ON "planner"."bible_study_notes" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "bible_study_notes_insert" ON "planner"."bible_study_notes" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "bible_study_notes_update" ON "planner"."bible_study_notes" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "bible_study_notes_delete" ON "planner"."bible_study_notes" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "devotional_entries_select" ON "planner"."devotional_entries" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "devotional_entries_insert" ON "planner"."devotional_entries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "devotional_entries_update" ON "planner"."devotional_entries" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "devotional_entries_delete" ON "planner"."devotional_entries" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "prayer_entries_select" ON "planner"."prayer_entries" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "prayer_entries_insert" ON "planner"."prayer_entries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "prayer_entries_update" ON "planner"."prayer_entries" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "prayer_entries_delete" ON "planner"."prayer_entries" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reading_plans_select" ON "planner"."reading_plans" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reading_plans_insert" ON "planner"."reading_plans" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reading_plans_update" ON "planner"."reading_plans" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reading_plans_delete" ON "planner"."reading_plans" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reading_progress_select" ON "planner"."reading_progress" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reading_progress_insert" ON "planner"."reading_progress" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reading_progress_update" ON "planner"."reading_progress" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reading_progress_delete" ON "planner"."reading_progress" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "scripture_references_select" ON "planner"."scripture_references" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "scripture_references_insert" ON "planner"."scripture_references" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "scripture_references_update" ON "planner"."scripture_references" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "scripture_references_delete" ON "planner"."scripture_references" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "assignments_select" ON "planner"."assignments" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "assignments_insert" ON "planner"."assignments" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "assignments_update" ON "planner"."assignments" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "assignments_delete" ON "planner"."assignments" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "courses_select" ON "planner"."courses" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "courses_insert" ON "planner"."courses" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "courses_update" ON "planner"."courses" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "courses_delete" ON "planner"."courses" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "learning_resources_select" ON "planner"."learning_resources" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "learning_resources_insert" ON "planner"."learning_resources" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "learning_resources_update" ON "planner"."learning_resources" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "learning_resources_delete" ON "planner"."learning_resources" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "lessons_select" ON "planner"."lessons" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "lessons_insert" ON "planner"."lessons" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "lessons_update" ON "planner"."lessons" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "lessons_delete" ON "planner"."lessons" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "study_notes_select" ON "planner"."study_notes" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "study_notes_insert" ON "planner"."study_notes" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "study_notes_update" ON "planner"."study_notes" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "study_notes_delete" ON "planner"."study_notes" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "study_sessions_select" ON "planner"."study_sessions" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "study_sessions_insert" ON "planner"."study_sessions" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "study_sessions_update" ON "planner"."study_sessions" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "study_sessions_delete" ON "planner"."study_sessions" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "subjects_select" ON "planner"."subjects" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "subjects_insert" ON "planner"."subjects" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "subjects_update" ON "planner"."subjects" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "subjects_delete" ON "planner"."subjects" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "journal_entries_select" ON "planner"."journal_entries" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "journal_entries_insert" ON "planner"."journal_entries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "journal_entries_update" ON "planner"."journal_entries" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "journal_entries_delete" ON "planner"."journal_entries" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reviews_select" ON "planner"."reviews" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reviews_insert" ON "planner"."reviews" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reviews_update" ON "planner"."reviews" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "reviews_delete" ON "planner"."reviews" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_items_select" ON "planner"."media_items" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_items_insert" ON "planner"."media_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_items_update" ON "planner"."media_items" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_items_delete" ON "planner"."media_items" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_list_items_select" ON "planner"."media_list_items" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_list_items_insert" ON "planner"."media_list_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_list_items_update" ON "planner"."media_list_items" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_list_items_delete" ON "planner"."media_list_items" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_lists_select" ON "planner"."media_lists" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_lists_insert" ON "planner"."media_lists" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_lists_update" ON "planner"."media_lists" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_lists_delete" ON "planner"."media_lists" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_logs_select" ON "planner"."media_logs" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_logs_insert" ON "planner"."media_logs" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_logs_update" ON "planner"."media_logs" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "media_logs_delete" ON "planner"."media_logs" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "notes_select" ON "planner"."notes" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "notes_insert" ON "planner"."notes" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "notes_update" ON "planner"."notes" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "notes_delete" ON "planner"."notes" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);