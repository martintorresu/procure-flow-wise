-- Añadir columnas que el formulario de PdC necesita
ALTER TABLE public.purchase_processes
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS estimated_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS required_on_site_date DATE;

-- Hacer opcionales los campos que el form actual no provee, para no romper inserts
ALTER TABLE public.purchase_processes
  ALTER COLUMN et_document_code DROP NOT NULL,
  ALTER COLUMN requesting_area DROP NOT NULL;

-- Trigger updated_at (si no existe)
DROP TRIGGER IF EXISTS purchase_processes_set_updated_at ON public.purchase_processes;
CREATE TRIGGER purchase_processes_set_updated_at
  BEFORE UPDATE ON public.purchase_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();