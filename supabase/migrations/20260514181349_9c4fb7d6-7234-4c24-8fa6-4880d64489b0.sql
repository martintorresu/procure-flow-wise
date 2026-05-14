-- Validación backend de custom_fields requeridos en secciones 5 y 7 (arrays JSONB repetibles)
-- Se dispara cuando el ET pasa a 'en_revision' o 'aprobado'. No bloquea guardado de borrador.

CREATE OR REPLACE FUNCTION public.validate_et_repeatable_custom_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_data       RECORD;
  v_field      RECORD;
  v_item       JSONB;
  v_idx        INT;
  v_val        JSONB;
  v_missing    TEXT[] := ARRAY[]::TEXT[];
  v_section    INT;
  v_section_col TEXT;
  v_items      JSONB;
BEGIN
  -- Solo validar al transicionar a en_revision o aprobado
  IF NEW.status NOT IN ('en_revision','aprobado') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT section_5, section_7 INTO v_data
    FROM public.et_form_data WHERE et_form_id = NEW.id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  FOREACH v_section IN ARRAY ARRAY[5,7] LOOP
    IF v_section = 5 THEN
      v_items := v_data.section_5;
    ELSE
      v_items := v_data.section_7;
    END IF;

    IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
      CONTINUE;
    END IF;

    FOR v_field IN
      SELECT field_key, label
        FROM public.et_field_schemas
       WHERE tenant_id = NEW.tenant_id
         AND section_number = v_section
         AND active = true
         AND required = true
    LOOP
      v_idx := 0;
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
        v_idx := v_idx + 1;
        v_val := v_item -> 'custom_fields' -> v_field.field_key;
        IF v_val IS NULL
           OR v_val = 'null'::jsonb
           OR (jsonb_typeof(v_val) = 'string' AND btrim(v_val #>> '{}') = '')
           OR (jsonb_typeof(v_val) = 'array'  AND jsonb_array_length(v_val) = 0)
        THEN
          v_missing := v_missing || format('Sección %s · ítem %s · %s', v_section, v_idx, v_field.label);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Campos custom requeridos sin completar: %', array_to_string(v_missing, '; ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_et_repeatable_custom_fields ON public.et_forms;
CREATE TRIGGER trg_validate_et_repeatable_custom_fields
  BEFORE UPDATE ON public.et_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_et_repeatable_custom_fields();