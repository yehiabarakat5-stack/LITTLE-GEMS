-- AI agent / Settings business rules storage (Settings page + agent-chat).
-- App reads/writes `content` (not `value`) on keys: business_rules, query_guidelines, write_guidelines.

CREATE TABLE IF NOT EXISTS public.system_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_context IS 'Tenant-scoped AI context: business rules and query/write guidelines.';
COMMENT ON COLUMN public.system_context.content IS 'Markdown or plain-text body for the context key.';

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
