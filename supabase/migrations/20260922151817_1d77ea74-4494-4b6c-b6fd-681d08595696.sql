ALTER TABLE public.process_stages
  ADD COLUMN IF NOT EXISTS planned_start date,
  ADD COLUMN IF NOT EXISTS planned_end date,
  ADD COLUMN IF NOT EXISTS actual_start date,
  ADD COLUMN IF NOT EXISTS actual_end date,
  ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS external_entity text;

CREATE INDEX IF NOT EXISTS idx_process_stages_planned_end ON public.process_stages (tenant_id, planned_end) WHERE planned_end IS NOT NULL;