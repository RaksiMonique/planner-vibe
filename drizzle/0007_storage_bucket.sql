-- Private storage bucket for the planner's images (vision boards, recipes,
-- products). Uploads and signed URLs go through the server with the service
-- role, so no object policies are needed; nothing is public. Re-runnable.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('planner', 'planner', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
