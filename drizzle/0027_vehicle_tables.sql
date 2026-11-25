CREATE TABLE "planner"."vehicle_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"expires_on" date NOT NULL,
	"reference" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."vehicle_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"name" text,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer,
	"colour" text,
	"license_plate" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("make", '') || ' ' || coalesce("model", '') || ' ' || coalesce("license_plate", '') || ' ' || coalesce("notes", ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."vehicles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."vehicle_documents" ADD CONSTRAINT "vehicle_documents_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "planner"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vehicles" ADD CONSTRAINT "vehicles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vehicles" ADD CONSTRAINT "vehicles_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicle_documents_vehicle_idx" ON "planner"."vehicle_documents" USING btree ("vehicle_id","expires_on");--> statement-breakpoint
CREATE INDEX "vehicle_documents_user_expires_idx" ON "planner"."vehicle_documents" USING btree ("user_id","expires_on");--> statement-breakpoint
CREATE INDEX "vehicles_search_idx" ON "planner"."vehicles" USING gin ("search");--> statement-breakpoint
CREATE INDEX "vehicles_user_idx" ON "planner"."vehicles" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE POLICY "vehicle_documents_select" ON "planner"."vehicle_documents" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vehicle_documents_insert" ON "planner"."vehicle_documents" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vehicle_documents_update" ON "planner"."vehicle_documents" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vehicle_documents_delete" ON "planner"."vehicle_documents" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vehicles_select" ON "planner"."vehicles" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vehicles_insert" ON "planner"."vehicles" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vehicles_update" ON "planner"."vehicles" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vehicles_delete" ON "planner"."vehicles" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);