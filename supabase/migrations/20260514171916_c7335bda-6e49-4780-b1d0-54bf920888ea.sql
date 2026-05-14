DO $$
DECLARE
  v_tenant uuid;
  v_admin  uuid := 'a040c6ae-1d5e-44ae-9a37-e85fcf7b45d7'; -- martin@inovahr.com (admin)
  v_pdc_big uuid;
  v_pdc_sm  uuid;
  v_threshold int;
  v_status text;
  v_role text;
  v_target text;
  v_stage text;
  v_alert_count int;
  v_alert_resolved boolean;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants WHERE slug='default';

  -- 1) Cambiar threshold fat_unscheduled → 21 (simula Admin UI)
  UPDATE public.alert_rules
     SET threshold_days = 21, updated_at = now()
   WHERE tenant_id = v_tenant AND trigger_type = 'fat_unscheduled';
  SELECT threshold_days INTO v_threshold FROM public.alert_rules
   WHERE tenant_id = v_tenant AND trigger_type = 'fat_unscheduled';
  RAISE NOTICE '[T1.1] fat_unscheduled threshold_days = %', v_threshold;

  -- 2) Crear PdC de $150k en etapa evaluacion
  INSERT INTO public.purchase_processes
    (tenant_id, created_by, name, project, criticality, estimated_amount,
     currency, required_on_site_date, requesting_area, current_stage)
  VALUES
    (v_tenant, v_admin, 'TEST APROBACION 150k', 'Sprint Verify', 'media',
     150000, 'USD', current_date + 60, 'QA', 'evaluacion')
  RETURNING id INTO v_pdc_big;

  -- 2b) Simular useAdvanceStage (next = orden_compra, regla amount > 100000 aplica)
  UPDATE public.purchase_processes
     SET approval_status = 'pending',
         approval_required_role = 'gerente',
         approval_target_stage = 'orden_compra'
   WHERE id = v_pdc_big;
  INSERT INTO public.alerts (tenant_id, pdc_id, type, severity, message, owner_role, created_by)
  VALUES (v_tenant, v_pdc_big, 'approval_required', 'high',
          'TEST 150k requiere aprobación de gerente para avanzar a orden_compra.',
          'gerente', v_admin);

  SELECT approval_status, approval_required_role::text, approval_target_stage::text, current_stage::text
    INTO v_status, v_role, v_target, v_stage
    FROM public.purchase_processes WHERE id = v_pdc_big;
  SELECT count(*) INTO v_alert_count FROM public.alerts
   WHERE pdc_id = v_pdc_big AND type='approval_required' AND resolved = false;
  RAISE NOTICE '[T1.2] PdC 150k: status=% role=% target=% stage=% alerts_open=%',
    v_status, v_role, v_target, v_stage, v_alert_count;

  -- 3) Asignar gerente temporal a martin para poder aprobar (idempotente)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin, 'gerente')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3b) Simular useApprovePdc
  UPDATE public.purchase_processes
     SET current_stage = approval_target_stage,
         approval_status = 'approved',
         approval_required_role = NULL,
         approval_target_stage = NULL
   WHERE id = v_pdc_big;
  UPDATE public.alerts SET resolved = true
   WHERE pdc_id = v_pdc_big AND type='approval_required' AND resolved = false;

  SELECT current_stage::text, approval_status INTO v_stage, v_status
    FROM public.purchase_processes WHERE id = v_pdc_big;
  SELECT bool_and(resolved) INTO v_alert_resolved FROM public.alerts
   WHERE pdc_id = v_pdc_big AND type='approval_required';
  RAISE NOTICE '[T1.3] PdC 150k tras aprobación: stage=% status=% alerts_all_resolved=%',
    v_stage, v_status, v_alert_resolved;

  -- 4) PdC $50k en evaluacion → avanza directo (no hay regla aplicable)
  INSERT INTO public.purchase_processes
    (tenant_id, created_by, name, project, criticality, estimated_amount,
     currency, required_on_site_date, requesting_area, current_stage)
  VALUES
    (v_tenant, v_admin, 'TEST AVANCE 50k', 'Sprint Verify', 'media',
     50000, 'USD', current_date + 60, 'QA', 'evaluacion')
  RETURNING id INTO v_pdc_sm;

  UPDATE public.purchase_processes
     SET current_stage = 'orden_compra'
   WHERE id = v_pdc_sm;

  SELECT current_stage::text, COALESCE(approval_status,'<null>') INTO v_stage, v_status
    FROM public.purchase_processes WHERE id = v_pdc_sm;
  SELECT count(*) INTO v_alert_count FROM public.alerts WHERE pdc_id = v_pdc_sm;
  RAISE NOTICE '[T1.4] PdC 50k: stage=% approval_status=% alerts=%',
    v_stage, v_status, v_alert_count;
END $$;