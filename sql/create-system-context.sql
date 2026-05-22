-- Run in Supabase SQL Editor if Settings shows:
--   "Could not find the table 'public.system_context' in the schema cache"
--
-- Note: the app uses column `content` (not `value`) for rule text.

CREATE TABLE IF NOT EXISTS public.system_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_context (key, content)
VALUES
  ('business_rules', ''),
  ('query_guidelines', ''),
  ('write_guidelines', '')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.system_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_context_authenticated_all" ON public.system_context;
CREATE POLICY "system_context_authenticated_all" ON public.system_context
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT 'system_context table ready' AS status;
