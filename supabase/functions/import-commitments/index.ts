// Edge function: import-commitments
// Recibe compromisos de reuniones desde un agente GPT externo autenticado con una API key
// de tenant (hash SHA-256 almacenado en public.api_keys). No requiere JWT de usuario.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const PRIORITIES = new Set(["alta", "media", "baja"]);

/** Normaliza texto: minúsculas, sin tildes, sin puntuación redundante. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Acepta YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY. Devuelve ISO o null. */
function parseDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

interface ProfileRow { id: string; full_name: string | null; email: string }
interface ProcRow { id: string; pdc_number: string; name: string }

/** Matching fuzzy simple por nombre / email. */
function matchUser(responsible: string, profiles: ProfileRow[]): ProfileRow | null {
  const target = norm(responsible);
  if (!target) return null;
  const exact = profiles.find(
    (p) => norm(p.full_name ?? "") === target || norm(p.email) === target,
  );
  if (exact) return exact;
  const emailLocal = profiles.find((p) => norm(p.email.split("@")[0]) === target);
  if (emailLocal) return emailLocal;
  const tokens = target.split(" ").filter((t) => t.length > 2);
  const scored = profiles
    .map((p) => {
      const hay = `${norm(p.full_name ?? "")} ${norm(p.email)}`;
      const hits = tokens.filter((t) => hay.includes(t)).length;
      return { p, hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  if (scored.length && scored[0].hits >= Math.max(1, Math.ceil(tokens.length / 2))) {
    // ambiguo si hay empate
    if (scored.length > 1 && scored[1].hits === scored[0].hits) return null;
    return scored[0].p;
  }
  return null;
}

function matchProcess(reference: string, procs: ProcRow[]): ProcRow | null {
  const target = norm(reference).replace(/\s/g, "");
  if (!target) return null;
  const byNumber = procs.find((p) => norm(p.pdc_number).replace(/\s/g, "") === target);
  if (byNumber) return byNumber;
  const partial = procs.filter(
    (p) => norm(p.pdc_number).replace(/\s/g, "").includes(target) || target.includes(norm(p.pdc_number).replace(/\s/g, "")),
  );
  if (partial.length === 1) return partial[0];
  const byName = procs.filter((p) => norm(p.name).includes(norm(reference)));
  if (byName.length === 1) return byName[0];
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "JSON inválido" }, 400);

    const headerKey = req.headers.get("x-api-key") ?? "";
    const apiKey = typeof body.api_key === "string" && body.api_key ? body.api_key : headerKey;
    if (!apiKey || apiKey.length < 16) return json({ error: "api_key requerida" }, 401);

    const commitments = Array.isArray(body.commitments) ? body.commitments : null;
    if (!commitments || commitments.length === 0) return json({ error: "commitments debe ser un arreglo no vacío" }, 400);
    if (commitments.length > 200) return json({ error: "Máximo 200 compromisos por llamada" }, 400);

    const meetingTitle = typeof body.meeting_title === "string" ? body.meeting_title.slice(0, 300) : null;
    const meetingDate = parseDate(body.meeting_date);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const hash = await sha256Hex(apiKey);
    const { data: keyRow } = await admin
      .from("api_keys")
      .select("id, tenant_id, enabled")
      .eq("key_hash", hash)
      .maybeSingle();
    if (!keyRow || !keyRow.enabled) return json({ error: "API key inválida o deshabilitada" }, 401);

    const tenantId = keyRow.tenant_id as string;

    const [{ data: profiles }, { data: procs }] = await Promise.all([
      admin.from("profiles").select("id, full_name, email").eq("tenant_id", tenantId),
      admin.from("purchase_processes").select("id, pdc_number, name").eq("tenant_id", tenantId),
    ]);

    const profileList = (profiles ?? []) as ProfileRow[];
    const procList = (procs ?? []) as ProcRow[];

    const rows: Record<string, unknown>[] = [];
    const unmatched: { text: string; reasons: string[] }[] = [];
    let matchedUsers = 0;
    let matchedPdcs = 0;

    for (const raw of commitments) {
      const text = typeof raw?.text === "string" ? raw.text.trim() : "";
      if (!text) {
        unmatched.push({ text: "(sin texto)", reasons: ["Compromiso sin texto, omitido"] });
        continue;
      }
      const reasons: string[] = [];
      const responsible = typeof raw?.responsible === "string" ? raw.responsible.trim() : "";
      const user = responsible ? matchUser(responsible, profileList) : null;
      if (responsible && !user) reasons.push(`Responsable "${responsible}" sin usuario coincidente`);
      if (user) matchedUsers++;

      const ref = typeof raw?.pdc_reference === "string" ? raw.pdc_reference.trim() : "";
      const proc = ref ? matchProcess(ref, procList) : null;
      if (ref && !proc) reasons.push(`Proceso "${ref}" no encontrado`);
      if (proc) matchedPdcs++;

      const priorityRaw = typeof raw?.priority === "string" ? norm(raw.priority) : "";
      const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : null;

      rows.push({
        tenant_id: tenantId,
        pdc_id: proc?.id ?? null,
        source: "api",
        meeting_date: meetingDate,
        meeting_title: meetingTitle,
        commitment_text: text,
        responsible_user_id: user?.id ?? null,
        responsible_name: responsible || null,
        due_date: parseDate(raw?.due_date),
        priority,
        status: "pendiente",
        raw_json: raw,
      });

      if (reasons.length) unmatched.push({ text, reasons });
    }

    if (!rows.length) return json({ imported: 0, matched_users: 0, matched_pdcs: 0, unmatched }, 200);

    const { data: inserted, error: insErr } = await admin
      .from("process_commitments")
      .insert(rows)
      .select("id, pdc_id, responsible_user_id, commitment_text, due_date");
    if (insErr) return json({ error: insErr.message }, 400);

    await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

    // Alertas in-app para responsables identificados (no bloquean la importación).
    // Se insertan una a una para correlacionar sin ambigüedad alerta ↔ destinatario
    // (el orden de un INSERT ... RETURNING múltiple no está garantizado).
    const targets = (inserted ?? []).filter((r) => !!r.responsible_user_id);
    const notifications: { alertId: string; userId: string }[] = [];
    for (const r of targets) {
      const { data: alert, error: aErr } = await admin
        .from("alerts")
        .insert({
          tenant_id: tenantId,
          pdc_id: r.pdc_id,
          type: "commitment",
          severity: "medium",
          message: `Nuevo compromiso: ${String(r.commitment_text).slice(0, 180)}`,
          due_date: r.due_date,
          resolved: false,
        })
        .select("id")
        .maybeSingle();
      if (aErr) {
        console.warn("[import-commitments] alertas:", aErr.message);
        continue;
      }
      if (alert?.id) notifications.push({ alertId: alert.id as string, userId: r.responsible_user_id as string });
    }
    const alertIds = notifications.map((n) => n.alertId);

    // WhatsApp (best-effort)
    try {
      const { data: waCfg } = await admin
        .from("whatsapp_config")
        .select("enabled")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (waCfg?.enabled && notifications.length) {
        await Promise.all(
          notifications.map((n) =>
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-alert`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                alert_id: n.alertId,
                user_id: n.userId,
                tenant_id: tenantId,
              }),
            }).catch(() => null),
          ),
        );
      }
    } catch (e) {
      console.warn("[import-commitments] whatsapp:", e);
    }


    return json({
      imported: inserted?.length ?? 0,
      matched_users: matchedUsers,
      matched_pdcs: matchedPdcs,
      unmatched,
    });
  } catch (e) {
    console.error("import-commitments error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
