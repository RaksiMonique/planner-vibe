-- Custom migration: profile and default-preferences rows for every auth user.
--
-- The planner shares the finance app's Supabase project, which already has its
-- own on_auth_user_created trigger. This one has its own name and function so
-- the two coexist. Re-runnable: function replaced, trigger dropped before create.

CREATE OR REPLACE FUNCTION planner.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = planner, public
AS $$
BEGIN
  INSERT INTO planner.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO planner.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS planner_on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER planner_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION planner.handle_new_user();
--> statement-breakpoint
-- Backfill: users who signed up to the finance app before the planner existed.
INSERT INTO planner.profiles (id, email, display_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
INSERT INTO planner.user_preferences (user_id)
SELECT id FROM planner.profiles
ON CONFLICT (user_id) DO NOTHING;
