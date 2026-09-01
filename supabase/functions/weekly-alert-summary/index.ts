import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendEmail, layout, button, escapeHtml } from "../_shared/resend.ts";

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://minuta-activa.lovable.app";
const SUBJECT = "[Pro.Curem] Resumen semanal de alertas";
const WEEK_MS = 7 * 24 * 3_600_000;

function row(label: string, value: number, danger = false) {
  const color = danger && value > 0 ? "#dc2626" : "#0f172a";
  return `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#475569">${escapeHtml(label)}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;color:${color}">${value}</td>
  </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const since = new Date(Date.now() - WEEK_MS).toISOString();

  try {
    const { data: tenants, error: tErr } = await supabase.from("tenants").select("id, name");
    if (tErr) throw tErr;

    let sent = 0;
    let failed = 0;
    let skippedTenants = 0;

    for (const tenant of tenants ?? []) {
      const tenantId = tenant.id as string;

      const { data: alerts, error: aErr } = await supabase
        .from("alerts")
        .select("id, severity, resolved, created_at, updated_at, escalated_at")
        .eq("tenant_id", tenantId);
      if (aErr) throw aErr;

      const rows = alerts ?? [];
      const created = rows.filter((a) => (a.created_at as string) >= since).length;
      const resolved = rows.filter(
        (a) => a.resolved && ((a.updated_at as string) ?? "") >= since,
      ).length;
      const pending = rows.filter((a) => !a.resolved).length;
      const criticalPending = rows.filter((a) => !a.resolved && a.severity === "critical").length;
      const escalated = rows.filter((a) => a.escalated_at && (a.escalated_at as string) >= since).length;

      if (created === 0 && pending === 0) {
        skippedTenants++;
        continue;
      }

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("tenant_id", tenantId);
      if (pErr) throw pErr;

      const ids = (profiles ?? []).map((p) => p.id as string);
      const prefsByUser = new Map<string, boolean>();
      if (ids.length) {
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("user_id, channel_email")
          .in("user_id", ids);
        for (const p of prefs ?? []) prefsByUser.set(p.user_id as string, Boolean(p.channel_email));
      }

      for (const profile of profiles ?? []) {
        const email = (profile.email as string | null) ?? "";
        if (!email) continue;
        const userId = profile.id as string;
        // Sin preferencias guardadas: el email está habilitado por defecto.
        if (prefsByUser.has(userId) && !prefsByUser.get(userId)) continue;

        const name = ((profile.full_name as string | null) ?? email.split("@")[0]) || "equipo";

        const urgency =
          criticalPending > 0
            ? `<p style="font-size:14px;color:#dc2626;font-weight:600">Tienes ${criticalPending} alerta${criticalPending === 1 ? "" : "s"} crítica${criticalPending === 1 ? "" : "s"} que requiere${criticalPending === 1 ? "" : "n"} atención inmediata.</p>`
            : "";

        const html = layout(
          "Resumen Semanal de Alertas",
          `<p style="font-size:15px">Hola ${escapeHtml(name)},</p>
<p style="font-size:14px;color:#475569">Aquí tienes el resumen de alertas de tu equipo en Pro.Curem de la última semana:</p>
<table style="width:100%;border-collapse:collapse;margin-top:16px">
  <thead><tr>
    <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;border-bottom:2px solid #0f172a">Métrica</th>
    <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;border-bottom:2px solid #0f172a">Valor</th>
  </tr></thead>
  <tbody>
    ${row("Creadas esta semana", created)}
    ${row("Resueltas esta semana", resolved)}
    ${row("Pendientes actualmente", pending)}
    ${row("Críticas pendientes", criticalPending, true)}
    ${row("Escaladas esta semana", escalated)}
  </tbody>
</table>
${urgency}
${button(APP_ALERTS_URL, "Ver alertas en Pro.Curem")}
<p style="font-size:12px;color:#94a3b8">Este resumen se envía automáticamente cada lunes.</p>`,
        );

        let status = "sent";
        let errorMessage: string | null = null;
        try {
          const res = await sendEmail([email], SUBJECT, html);
          if (!res.ok) {
            status = "failed";
            errorMessage = `[${res.status}] ${String(res.details ?? "")}`.slice(0, 500);
          }
        } catch (e) {
          status = "failed";
          errorMessage = (e instanceof Error ? e.message : String(e)).slice(0, 500);
        }

        if (status === "sent") sent++;
        else failed++;

        await supabase.from("email_log").insert({
          tenant_id: tenantId,
          alert_id: null,
          user_id: userId,
          email,
          subject: SUBJECT,
          status,
          error_message: errorMessage,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, skippedTenants }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("weekly-alert-summary error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
