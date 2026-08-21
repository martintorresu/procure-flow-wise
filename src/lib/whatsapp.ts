import { supabase } from "@/integrations/supabase/client";

/**
 * Dispara la notificación WhatsApp de una alerta.
 * Nunca lanza: si falla, solo loguea — la alerta in-app sigue funcionando.
 */
export async function notifyWhatsappAlert(params: {
  alertId: string;
  userId: string;
  tenantId: string;
}): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp-alert", {
      body: { alert_id: params.alertId, user_id: params.userId, tenant_id: params.tenantId },
    });
    if (error) console.warn("[whatsapp] envío falló:", error.message);
    else if (data?.skipped) console.info("[whatsapp] omitido:", data.skipped);
  } catch (e) {
    console.warn("[whatsapp] error inesperado:", e);
  }
}

/**
 * Resuelve los destinatarios de una alerta por rol y dispara el WhatsApp para
 * cada usuario del tenant con ese rol, teléfono cargado y preferencia activa.
 */
export async function notifyWhatsappByRole(params: {
  alertId: string;
  tenantId: string;
  role: string;
}): Promise<void> {
  try {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", params.role as never);
    const ids = (roleRows ?? []).map((r) => r.user_id);
    if (!ids.length) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, phone, whatsapp_notifications_enabled, tenant_id")
      .in("id", ids)
      .eq("tenant_id", params.tenantId);

    const targets = (profiles ?? []).filter(
      (p) => !!p.phone && p.whatsapp_notifications_enabled !== false,
    );
    await Promise.all(
      targets.map((p) =>
        notifyWhatsappAlert({ alertId: params.alertId, userId: p.id, tenantId: params.tenantId }),
      ),
    );
  } catch (e) {
    console.warn("[whatsapp] no se pudieron resolver destinatarios:", e);
  }
}
