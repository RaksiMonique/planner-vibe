CREATE TABLE "planner"."legacy_import_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" text,
	"raw" jsonb NOT NULL,
	"summary" jsonb,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."legacy_import_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."legacy_map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"legacy_key" text NOT NULL,
	"new_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."legacy_map" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."legacy_import_files" ADD CONSTRAINT "legacy_import_files_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."legacy_map" ADD CONSTRAINT "legacy_map_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "legacy_import_files_user_idx" ON "planner"."legacy_import_files" USING btree ("user_id","imported_at");--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_map_user_entity_key_idx" ON "planner"."legacy_map" USING btree ("user_id","entity_type","legacy_key");--> statement-breakpoint
CREATE POLICY "legacy_import_files_select" ON "planner"."legacy_import_files" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "legacy_import_files_insert" ON "planner"."legacy_import_files" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "legacy_import_files_update" ON "planner"."legacy_import_files" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "legacy_import_files_delete" ON "planner"."legacy_import_files" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "legacy_map_select" ON "planner"."legacy_map" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "legacy_map_insert" ON "planner"."legacy_map" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "legacy_map_update" ON "planner"."legacy_map" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "legacy_map_delete" ON "planner"."legacy_map" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);