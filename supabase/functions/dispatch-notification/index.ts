// Edge function: dispatch-notification
// Despacha una alerta a los canales del usuario (email / WhatsApp) según sus preferencias.
// Se invoca server-to-server con el service role key.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, layout, button, escapeHtml } from "../_shared/resend.ts";

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://minuta-activa.lovable.app";

const SEVERITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

const TYPE_LABELS: Record<string, string> = {
  commitment_overdue: "Compromiso vencido",
  stage_stalled: "Etapa estancada",
  contingency_open: "Contingencia abierta",
  approval_required: "Aprobación requerida",
  milestone_overdue: "Hito atrasado",
  delivery_risk: "Riesgo de entrega",
};

const DEFAULT_PREFS = {
  channel_email: true,
  channel_whatsapp: true,
  min_severity_email: "medium",
  min_severity_whatsapp: "high",
  quiet_enabled: false,
  quiet_start: "22:00",
  quiet_end: "07:00",
  email_grouping: "immediate",
};

/** minutos desde medianoche para "HH:MM[:SS]" */
function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function inQuietHours(now: Date, start?: string | null, end?: string | null): boolean {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null) return false;
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes();
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
}

const meets = (sev: string, min: string) =>
  (SEVERITY_ORDER[sev] ?? 0) >= (SEVERITY_ORDER[min] ?? 0);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!SERVICE_KEY || token !== SERVICE_KEY) return json({ error: "No autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const alertId = typeof body?.alert_id === "string" ? body.alert_id : "";
    const userId = typeof body?.user_id === "string" ? body.user_id : "";
    const tenantIdIn = typeof body?.tenant_id === "string" ? body.tenant_id : "";
    if (!alertId || !userId) return json({ error: "alert_id y user_id son obligatorios" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data: alert, error: aErr } = await admin
      .from("alerts")
      .select("id, tenant_id, process_id, type, severity, message, due_date, read_at, processes(process_number, name)")
      .eq("id", alertId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!alert) return json({ error: "Alerta no encontrada" }, 404);

    const tenantId = (alert.tenant_id as string) ?? tenantIdIn;
    const proc = (alert.processes ?? null) as { process_number?: string; name?: string } | null;
    const processLabel = proc ? `${proc.process_number ?? ""} ${proc.name ?? ""}`.trim() : "Sin proceso";
    const typeLabel = TYPE_LABELS[alert.type as string] ?? (alert.type as string);

    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, full_name, tenant_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.email) return json({ ok: true, skipped: "sin_perfil_o_email" });

    // Dedup cross-canal: si ya la leyó in-app, no molestar por otros canales.
    if (alert.read_at) return json({ ok: true, skipped: "ya_leida_inapp" });

    const { data: prefRow } = await admin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const prefs = { ...DEFAULT_PREFS, ...(prefRow ?? {}) } as typeof DEFAULT_PREFS;

    if (prefs.quiet_enabled && inQuietHours(new Date(), prefs.quiet_start, prefs.quiet_end)) {
      return json({ ok: true, skipped: "horario_de_silencio" });
    }

    const { data: contact } = await admin
      .from("profile_contacts")
      .select("phone, whatsapp_notifications_enabled")
      .eq("id", userId)
      .maybeSingle();

    const severity = String(alert.severity ?? "medium");
    const result: Record<string, unknown> = { email: "skipped", whatsapp: "skipped" };

    // ---- Email ----
    if (prefs.channel_email && meets(severity, prefs.min_severity_email)) {
      const subject = `[Pro.Curem] ${typeLabel}: ${proc?.name ?? "Notificación"}`;
      const link = alert.process_id ? `${APP_BASE_URL}/procesos/${alert.process_id}` : `${APP_BASE_URL}/alertas`;
      const html = layout(
        `${escapeHtml(typeLabel)}`,
        `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">Hola ${escapeHtml(profile.full_name ?? "")},</p>
         <p style="font-size:15px;line-height:1.6;margin:0 0 12px">${escapeHtml(String(alert.message ?? ""))}</p>
         <p style="font-size:14px;color:#475569;margin:0">Proceso: <strong>${escapeHtml(processLabel)}</strong><br/>
         Severidad: <strong>${escapeHtml(severity)}</strong>${alert.due_date ? `<br/>Fecha límite: <strong>${escapeHtml(String(alert.due_date))}</strong>` : ""}</p>
         ${button(link, "Ver en Pro.Curem")}`,
      );

      let status = "sent";
      let errorMessage: string | null = null;
      try {
        const r = await sendEmail([profile.email as string], subject, html);
        if (!r.ok) {
          status = "failed";
          errorMessage = typeof r.details === "string" ? r.details.slice(0, 500) : `status ${r.status}`;
        }
      } catch (e) {
        status = "failed";
        errorMessage = e instanceof Error ? e.message : String(e);
      }

      await admin.from("email_log").insert({
        tenant_id: tenantId,
        alert_id: alertId,
        user_id: userId,
        email: profile.email,
        subject,
        status,
        error_message: errorMessage,
      });
      result.email = status;
    }

    // ---- WhatsApp ----
    if (
      prefs.channel_whatsapp &&
      contact?.whatsapp_notifications_enabled &&
      contact?.phone &&
      meets(severity, prefs.min_severity_whatsapp)
    ) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-alert`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ alert_id: alertId, user_id: userId, tenant_id: tenantId }),
        });
        result.whatsapp = res.ok ? "sent" : `failed_${res.status}`;
        if (!res.ok) console.error("send-whatsapp-alert falló", res.status, await res.text());
      } catch (e) {
        console.error("send-whatsapp-alert error", e);
        result.whatsapp = "failed";
      }
    }

    return json({ ok: true, ...result });
  } catch (e) {
    console.error("dispatch-notification error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
