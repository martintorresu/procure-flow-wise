ALTER TABLE public.processes DROP CONSTRAINT IF EXISTS purchase_processes_process_type_check;
ALTER TABLE public.processes ADD CONSTRAINT purchase_processes_process_type_check
  CHECK (process_type IN ('obra','licitacion','contrato','compra_industrial','personalizado'));