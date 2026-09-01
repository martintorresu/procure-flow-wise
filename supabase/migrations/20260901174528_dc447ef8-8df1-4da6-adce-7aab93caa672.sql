CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_inapp boolean NOT NULL DEFAULT true,
  channel_email boolean NOT NULL DEFAULT true,
  channel_whatsapp boolean NOT NULL DEFAULT true,
  quiet_start time DEFAULT '22:00',
  quiet_end time DEFAULT '07:00',
  quiet_enabled boolean NOT NULL DEFAULT false,
  email_grouping text NOT NULL DEFAULT 'immediate' CHECK (email_grouping IN ('immediate', 'daily_digest')),
  min_severity_email text NOT NULL DEFAULT 'medium' CHECK (min_severity_email IN ('low', 'medium', 'high', 'critical')),
  min_severity_whatsapp text NOT NULL DEFAULT 'high' CHECK (min_severity_whatsapp IN ('low', 'medium', 'high', 'critical')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read tenant notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();