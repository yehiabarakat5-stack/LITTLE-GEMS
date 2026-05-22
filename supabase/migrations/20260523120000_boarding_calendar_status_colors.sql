INSERT INTO public.system_context (key, content)
VALUES ('boarding_calendar_status_colors', '')
ON CONFLICT (key) DO NOTHING;
