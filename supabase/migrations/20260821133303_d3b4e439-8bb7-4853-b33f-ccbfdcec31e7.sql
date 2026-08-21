ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS rut text,
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL DEFAULT '',
  access_token text NOT NULL DEFAULT '',
  business_account_id text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_config TO authenticated;
GRANT ALL ON public.whatsapp_config TO service_role;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_config_admin_select" ON public.whatsapp_config FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') AND tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "wa_config_admin_insert" ON public.whatsapp_config FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin') AND tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "wa_config_admin_update" ON public.whatsapp_config FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') AND tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (private.has_role(auth.uid(), 'admin') AND tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "wa_config_admin_delete" ON public.whatsapp_config FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') AND tenant_id = private.get_user_tenant_id(auth.uid()));

CREATE TRIGGER trg_wa_config_set_tenant BEFORE INSERT ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_wa_config_updated BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.whatsapp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  phone text,
  status text NOT NULL CHECK (status IN ('sent','failed')),
  meta_message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_log TO authenticated;
GRANT ALL ON public.whatsapp_log TO service_role;
ALTER TABLE public.whatsapp_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_log_admin_select" ON public.whatsapp_log FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') AND tenant_id = private.get_user_tenant_id(auth.uid()));