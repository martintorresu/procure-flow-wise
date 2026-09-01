import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const HOUR = 3_600_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const dispatchUrl = `${supabaseUrl}/functions/v1/dispatch-notification`;

  try {
    const { data: rules, error: rErr } = await supabase
      .from("escalation_rules")
      .select("tenant_id, severity, escalation_hours, re_notify_assignee, notify_manager")
      .eq("active", true);
    if (rErr) throw rErr;

    let escalated = 0;
    let dispatched = 0;

    for (const rule of rules ?? []) {
      const cutoff = new Date(Date.now() - Number(rule.escalation_hours) * HOUR).toISOString();

      const { data: alerts, error: aErr } = await supabase
        .from("alerts")
        .select("id, process_id, tenant_id")
        .eq("tenant_id", rule.tenant_id as string)
        .eq("severity", rule.severity as string)
        .eq("resolved", false)
        .is("escalated_at", null)
        .lt("created_at", cutoff);
      if (aErr) throw aErr;
      if (!alerts?.length) continue;

      const { error: uErr } = await supabase
        .from("alerts")
        .update({ escalated_at: new Date().toISOString() })
        .in("id", alerts.map((a) => a.id as string));
      if (uErr) throw uErr;
      escalated += alerts.length;

      // Gerentes/administradores del tenant (los roles viven en user_roles)
      let managers: string[] = [];
      if (rule.notify_manager) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id")
          .eq("tenant_id", rule.tenant_id as string);
        const ids = (profs ?? []).map((p) => p.id as string);
        if (ids.length) {
          const { data: roleRows } = await supabase
            .from("user_roles")
            .select("user_id")
            .in("user_id", ids)
            .in("role", ["admin", "gestor"]);
          managers = [...new Set((roleRows ?? []).map((r) => r.user_id as string))];
        }
      }

      for (const alert of alerts) {
        const processId = alert.process_id as string | null;
        const recipients = new Set<string>(managers);

        if (processId && rule.re_notify_assignee) {
          const [{ data: parts }, { data: proc }] = await Promise.all([
            supabase
              .from("process_participants")
              .select("user_id")
              .eq("process_id", processId)
              .not("user_id", "is", null),
            supabase.from("processes").select("created_by").eq("id", processId).maybeSingle(),
          ]);
          for (const p of parts ?? []) if (p.user_id) recipients.add(p.user_id as string);
          if (proc?.created_by) recipients.add(proc.created_by as string);
        }

        for (const userId of recipients) {
          dispatched++;
          fetch(dispatchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ alert_id: alert.id, user_id: userId, tenant_id: alert.tenant_id }),
          }).catch((err) => console.error("escalation dispatch error", err));
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, rules: rules?.length ?? 0, escalated, dispatched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-escalations error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
