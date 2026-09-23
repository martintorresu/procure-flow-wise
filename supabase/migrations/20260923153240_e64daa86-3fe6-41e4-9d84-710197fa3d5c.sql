ALTER TABLE public.process_stages
  ADD CONSTRAINT process_stages_not_started_no_actual_dates
  CHECK (status <> 'not_started' OR (actual_start IS NULL AND actual_end IS NULL));