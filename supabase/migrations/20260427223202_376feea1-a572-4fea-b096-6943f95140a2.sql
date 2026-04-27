ALTER TABLE public.et_forms REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.et_forms;