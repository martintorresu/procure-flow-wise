ALTER TABLE public.et_form_data
  ADD COLUMN IF NOT EXISTS section_7 jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS section_8 jsonb NOT NULL DEFAULT '{}'::jsonb;