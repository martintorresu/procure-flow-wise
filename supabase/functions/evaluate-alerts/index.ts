import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DAY = 86_400_000;

type Rule = { trigger_type: string; threshold_days: number; severity: string; active: boolean };
type NewAlert = {
  tenant_id: string;
  process_id: string | null;
  type: string;
  severity: string;
  message: string;
  due_date: string | null;
  source_ref: Record<string, string>;
};

const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / DAY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const now = new Date();
    const since24h = new Date(now.getTime() - DAY).toISOString();

    const { data: tenants, error: tErr } = await supabase.from("tenants").select("id");
    if (tErr) throw tErr;

    const { data: rulesRows } = await supabase
      .from("alert_rules")
      .select("tenant_id, trigger_type, threshold_days, severity, active");

    // Alertas recientes sin resolver, para deduplicar
    const { data: recent } = await supabase
      .from("alerts")
      .select("tenant_id, type, source_ref, message")
      .eq("resolved", false)
      .gte("created_at", since24h);

    const seen = new Set(
      (recent ?? []).map((a: Record<string, unknown>) => {
        const ref = (a.source_ref ?? {}) as Record<string, string>;
        const refKey = Object.entries(ref).sort().map(([k, v]) => `${k}:${v}`).join("|") || String(a.message);
        return `${a.tenant_id}|${a.type}|${refKey}`;
      }),
    );

    const pending: NewAlert[] = [];
    const push = (a: NewAlert) => {
      const refKey = Object.entries(a.source_ref).sort().map(([k, v]) => `${k}:${v}`).join("|");
      const key = `${a.tenant_id}|${a.type}|${refKey}`;
      if (seen.has(key)) return;
      seen.add(key);
      pending.push(a);
    };

    for (const tenant of tenants ?? []) {
      const tenantId = tenant.id as string;
      const rules = new Map<string, Rule>(
        (rulesRows ?? [])
          .filter((r: Record<string, unknown>) => r.tenant_id === tenantId)
          .map((r: Record<string, unknown>) => [r.trigger_type as string, r as unknown as Rule]),
      );
      const ruleFor = (type: string, defaults: { threshold: number; severity: string }) => {
        const r = rules.get(type);
        if (r && !r.active) return null;
        return {
          threshold: r?.threshold_days ?? defaults.threshold,
          severity: r?.severity ?? defaults.severity,
        };
      };

      // A) Compromisos vencidos
      const co = ruleFor("commitment_overdue", { threshold: 0, severity: "high" });
      if (co) {
        const limit = new Date(now.getTime() - co.threshold * DAY).toISOString().slice(0, 10);
        const { data } = await supabase
          .from("process_commitments")
          .select("id, process_id, commitment_text, responsible_name, due_date, status")
          .eq("tenant_id", tenantId)
          .not("due_date", "is", null)
          .lt("due_date", limit)
          .not("status", "in", "(completed,cancelled)");
        for (const c of data ?? []) {
          push({
            tenant_id: tenantId,
            process_id: (c.process_id as string) ?? null,
            type: "commitment_overdue",
            severity: co.severity,
            message: `Compromiso vencido: ${c.commitment_text} (responsable: ${c.responsible_name ?? "sin asignar"}, venció: ${c.due_date})`,
            due_date: (c.due_date as string) ?? null,
            source_ref: { commitment_id: c.id as string },
          });
        }
      }

      // C) Etapas estancadas
      const ss = ruleFor("stage_stalled", { threshold: 14, severity: "medium" });
      if (ss) {
        const cutoff = new Date(now.getTime() - ss.threshold * DAY).toISOString();
        const { data } = await supabase
          .from("process_stages")
          .select("id, name, process_id, updated_at, processes(process_number)")
          .eq("tenant_id", tenantId)
          .eq("status", "in_progress")
          .lt("updated_at", cutoff);
        for (const s of data ?? []) {
          const n = daysBetween(now, new Date(s.updated_at as string));
          const num = (s.processes as { process_number?: string } | null)?.process_number ?? "";
          push({
            tenant_id: tenantId,
            process_id: s.process_id as string,
            type: "stage_stalled",
            severity: ss.severity,
            message: `Etapa ${s.name} sin avance hace ${n} días en proceso ${num}`,
            due_date: null,
            source_ref: { stage_id: s.id as string },
          });
        }
      }

      // D) Contingencias abiertas prolongadas
      const cg = ruleFor("contingency_open", { threshold: 7, severity: "high" });
      if (cg) {
        const cutoff = new Date(now.getTime() - cg.threshold * DAY).toISOString();
        const { data } = await supabase
          .from("process_contingencies")
          .select("id, parent_process_id, reason, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "active")
          .lt("created_at", cutoff);
        for (const c of data ?? []) {
          const n = daysBetween(now, new Date(c.created_at as string));
          push({
            tenant_id: tenantId,
            process_id: c.parent_process_id as string,
            type: "contingency_open",
            severity: cg.severity,
            message: `Contingencia abierta hace ${n} días: ${c.reason}`,
            due_date: null,
            source_ref: { contingency_id: c.id as string },
          });
        }
      }
    }

    let inserted = 0;
    if (pending.length) {
      const { error, count } = await supabase.from("alerts").insert(pending, { count: "exact" });
      if (error) throw error;
      inserted = count ?? pending.length;
    }

    return new Response(JSON.stringify({ ok: true, evaluated_tenants: tenants?.length ?? 0, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-alerts error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
