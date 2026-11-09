CREATE TYPE "planner"."wellness_kind" AS ENUM('sleep', 'water', 'skincare', 'haircare', 'treatment', 'fitness', 'self_care', 'cycle');--> statement-breakpoint
CREATE TYPE "planner"."grocery_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TYPE "planner"."meal_slot" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "planner"."gift_status" AS ENUM('idea', 'planned', 'purchased', 'wrapped', 'given');--> statement-breakpoint
CREATE TYPE "planner"."vision_item_kind" AS ENUM('image', 'quote', 'link');--> statement-breakpoint
CREATE TYPE "planner"."important_kind" AS ENUM('emergency_contact', 'important_date', 'insurance', 'medical_contact', 'household', 'document_reference', 'emergency_instruction');--> statement-breakpoint
CREATE TABLE "planner"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"category" text,
	"in_inventory" boolean DEFAULT true NOT NULL,
	"is_favourite" boolean DEFAULT false NOT NULL,
	"on_wishlist" boolean DEFAULT false NOT NULL,
	"price" numeric(10, 2),
	"currency" text,
	"url" text,
	"image_path" text,
	"opened_on" date,
	"expires_on" date,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."wellness_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"kind" "planner"."wellness_kind" NOT NULL,
	"date" date NOT NULL,
	"value" numeric(10, 2),
	"unit" text,
	"label" text,
	"note" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."wellness_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."grocery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(10, 2),
	"unit" text,
	"category" text,
	"store" text,
	"is_purchased" boolean DEFAULT false NOT NULL,
	"recipe_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."grocery_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."grocery_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"plan_id" uuid,
	"status" "planner"."grocery_status" DEFAULT 'open' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."grocery_lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(10, 2),
	"unit" text,
	"category" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."ingredients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."meal_plan_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"date" date NOT NULL,
	"slot" "planner"."meal_slot" NOT NULL,
	"recipe_id" uuid,
	"custom_meal" text,
	"servings" smallint DEFAULT 1 NOT NULL,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."meal_plan_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"name" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."meal_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."meal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "planner"."template_kind" DEFAULT 'week' NOT NULL,
	"entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."meal_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"instructions" text,
	"servings" smallint DEFAULT 2 NOT NULL,
	"prep_minutes" integer,
	"cook_minutes" integer,
	"category" text,
	"dietary_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rating" smallint,
	"image_path" text,
	"notes" text,
	"is_favourite" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."recipes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."gift_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text,
	"birthday" date,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."gift_recipients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."gifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"occasion" text,
	"occasion_date" date,
	"status" "planner"."gift_status" DEFAULT 'idea' NOT NULL,
	"budget" numeric(10, 2),
	"price" numeric(10, 2),
	"url" text,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."gifts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"price" numeric(10, 2),
	"priority" smallint DEFAULT 2 NOT NULL,
	"notes" text,
	"acquired_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."wishlist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."vision_board_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"kind" "planner"."vision_item_kind" DEFAULT 'image' NOT NULL,
	"image_path" text,
	"url" text,
	"caption" text,
	"quote_text" text,
	"author" text,
	"goal_id" uuid,
	"project_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."vision_board_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."vision_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_segment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"cover_path" text,
	"goal_id" uuid,
	"project_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."vision_boards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planner"."important_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "planner"."important_kind" NOT NULL,
	"title" text NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"is_sensitive" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planner"."important_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planner"."user_preferences" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "planner"."products" ADD CONSTRAINT "products_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."wellness_entries" ADD CONSTRAINT "wellness_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."wellness_entries" ADD CONSTRAINT "wellness_entries_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."grocery_items" ADD CONSTRAINT "grocery_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."grocery_items" ADD CONSTRAINT "grocery_items_list_id_grocery_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "planner"."grocery_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."grocery_items" ADD CONSTRAINT "grocery_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "planner"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."grocery_lists" ADD CONSTRAINT "grocery_lists_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."grocery_lists" ADD CONSTRAINT "grocery_lists_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "planner"."meal_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."ingredients" ADD CONSTRAINT "ingredients_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."ingredients" ADD CONSTRAINT "ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "planner"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."meal_plan_entries" ADD CONSTRAINT "meal_plan_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."meal_plan_entries" ADD CONSTRAINT "meal_plan_entries_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "planner"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."meal_plan_entries" ADD CONSTRAINT "meal_plan_entries_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "planner"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."meal_plans" ADD CONSTRAINT "meal_plans_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."meal_plans" ADD CONSTRAINT "meal_plans_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."meal_templates" ADD CONSTRAINT "meal_templates_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."recipes" ADD CONSTRAINT "recipes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."gift_recipients" ADD CONSTRAINT "gift_recipients_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."gifts" ADD CONSTRAINT "gifts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."gifts" ADD CONSTRAINT "gifts_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."gifts" ADD CONSTRAINT "gifts_recipient_id_gift_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "planner"."gift_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vision_board_items" ADD CONSTRAINT "vision_board_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vision_board_items" ADD CONSTRAINT "vision_board_items_board_id_vision_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "planner"."vision_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vision_board_items" ADD CONSTRAINT "vision_board_items_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "planner"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vision_board_items" ADD CONSTRAINT "vision_board_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "planner"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vision_boards" ADD CONSTRAINT "vision_boards_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vision_boards" ADD CONSTRAINT "vision_boards_life_segment_id_life_segments_id_fk" FOREIGN KEY ("life_segment_id") REFERENCES "planner"."life_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vision_boards" ADD CONSTRAINT "vision_boards_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "planner"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."vision_boards" ADD CONSTRAINT "vision_boards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "planner"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner"."important_records" ADD CONSTRAINT "important_records_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "planner"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_user_idx" ON "planner"."products" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "wellness_entries_user_date_kind_idx" ON "planner"."wellness_entries" USING btree ("user_id","date","kind");--> statement-breakpoint
CREATE INDEX "grocery_items_list_idx" ON "planner"."grocery_items" USING btree ("list_id","category");--> statement-breakpoint
CREATE INDEX "grocery_lists_user_idx" ON "planner"."grocery_lists" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "ingredients_recipe_idx" ON "planner"."ingredients" USING btree ("recipe_id","sort_order");--> statement-breakpoint
CREATE INDEX "meal_plan_entries_plan_date_idx" ON "planner"."meal_plan_entries" USING btree ("plan_id","date","slot");--> statement-breakpoint
CREATE INDEX "meal_plans_user_start_idx" ON "planner"."meal_plans" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE INDEX "meal_templates_user_idx" ON "planner"."meal_templates" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "recipes_user_idx" ON "planner"."recipes" USING btree ("user_id","title");--> statement-breakpoint
CREATE INDEX "gift_recipients_user_idx" ON "planner"."gift_recipients" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "gifts_user_occasion_idx" ON "planner"."gifts" USING btree ("user_id","occasion_date");--> statement-breakpoint
CREATE INDEX "gifts_recipient_idx" ON "planner"."gifts" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "wishlist_items_user_idx" ON "planner"."wishlist_items" USING btree ("user_id","priority");--> statement-breakpoint
CREATE INDEX "vision_board_items_board_idx" ON "planner"."vision_board_items" USING btree ("board_id","sort_order");--> statement-breakpoint
CREATE INDEX "vision_boards_user_idx" ON "planner"."vision_boards" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "important_records_user_kind_idx" ON "planner"."important_records" USING btree ("user_id","kind");--> statement-breakpoint
CREATE POLICY "products_select" ON "planner"."products" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "products_insert" ON "planner"."products" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "products_update" ON "planner"."products" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "products_delete" ON "planner"."products" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "wellness_entries_select" ON "planner"."wellness_entries" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "wellness_entries_insert" ON "planner"."wellness_entries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "wellness_entries_update" ON "planner"."wellness_entries" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "wellness_entries_delete" ON "planner"."wellness_entries" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "grocery_items_select" ON "planner"."grocery_items" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "grocery_items_insert" ON "planner"."grocery_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "grocery_items_update" ON "planner"."grocery_items" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "grocery_items_delete" ON "planner"."grocery_items" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "grocery_lists_select" ON "planner"."grocery_lists" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "grocery_lists_insert" ON "planner"."grocery_lists" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "grocery_lists_update" ON "planner"."grocery_lists" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "grocery_lists_delete" ON "planner"."grocery_lists" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "ingredients_select" ON "planner"."ingredients" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "ingredients_insert" ON "planner"."ingredients" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "ingredients_update" ON "planner"."ingredients" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "ingredients_delete" ON "planner"."ingredients" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_plan_entries_select" ON "planner"."meal_plan_entries" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_plan_entries_insert" ON "planner"."meal_plan_entries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_plan_entries_update" ON "planner"."meal_plan_entries" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_plan_entries_delete" ON "planner"."meal_plan_entries" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_plans_select" ON "planner"."meal_plans" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_plans_insert" ON "planner"."meal_plans" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_plans_update" ON "planner"."meal_plans" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_plans_delete" ON "planner"."meal_plans" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_templates_select" ON "planner"."meal_templates" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_templates_insert" ON "planner"."meal_templates" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_templates_update" ON "planner"."meal_templates" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "meal_templates_delete" ON "planner"."meal_templates" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "recipes_select" ON "planner"."recipes" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "recipes_insert" ON "planner"."recipes" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "recipes_update" ON "planner"."recipes" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "recipes_delete" ON "planner"."recipes" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "gift_recipients_select" ON "planner"."gift_recipients" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "gift_recipients_insert" ON "planner"."gift_recipients" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "gift_recipients_update" ON "planner"."gift_recipients" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "gift_recipients_delete" ON "planner"."gift_recipients" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "gifts_select" ON "planner"."gifts" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "gifts_insert" ON "planner"."gifts" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "gifts_update" ON "planner"."gifts" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "gifts_delete" ON "planner"."gifts" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "wishlist_items_select" ON "planner"."wishlist_items" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "wishlist_items_insert" ON "planner"."wishlist_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "wishlist_items_update" ON "planner"."wishlist_items" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "wishlist_items_delete" ON "planner"."wishlist_items" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vision_board_items_select" ON "planner"."vision_board_items" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vision_board_items_insert" ON "planner"."vision_board_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vision_board_items_update" ON "planner"."vision_board_items" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vision_board_items_delete" ON "planner"."vision_board_items" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vision_boards_select" ON "planner"."vision_boards" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vision_boards_insert" ON "planner"."vision_boards" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vision_boards_update" ON "planner"."vision_boards" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "vision_boards_delete" ON "planner"."vision_boards" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "important_records_select" ON "planner"."important_records" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "important_records_insert" ON "planner"."important_records" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "important_records_update" ON "planner"."important_records" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "important_records_delete" ON "planner"."important_records" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);