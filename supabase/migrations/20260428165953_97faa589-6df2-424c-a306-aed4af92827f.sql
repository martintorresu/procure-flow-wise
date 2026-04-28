-- 1) Trigger: avanzar etapa del PdC al aprobar el ET
CREATE OR REPLACE FUNCTION public.advance_stage_on_et_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprobado'
     AND (OLD.status IS DISTINCT FROM 'aprobado') THEN
    UPDATE public.purchase_processes
       SET current_stage = 'programacion',
           updated_at = now()
     WHERE id = NEW.process_id
       AND current_stage = 'ingenieria';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_et_advance_stage ON public.et_forms;
CREATE TRIGGER trg_et_advance_stage
AFTER UPDATE OF status ON public.et_forms
FOR EACH ROW
EXECUTE FUNCTION public.advance_stage_on_et_approval();

-- 2) Trigger: marcar completo / incompleto según completion_percentage
CREATE OR REPLACE FUNCTION public.sync_et_completion_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo opera sobre estados "abiertos" (no en revisión / aprobado / rechazado / cerrado)
  IF NEW.status IN ('borrador', 'incompleto', 'completo') THEN
    IF NEW.completion_percentage >= 100 THEN
      NEW.status := 'completo';
    ELSE
      NEW.status := 'incompleto';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_et_sync_completion ON public.et_forms;
CREATE TRIGGER trg_et_sync_completion
BEFORE UPDATE OF completion_percentage ON public.et_forms
FOR EACH ROW
EXECUTE FUNCTION public.sync_et_completion_status();