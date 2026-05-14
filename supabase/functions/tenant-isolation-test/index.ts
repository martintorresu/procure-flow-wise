// Edge function: tenant-isolation-test
// Solo invocable por admin. Crea 2 usuarios temporales (acme + codelco),
// inserta filas como acme en cada tabla de negocio, intenta leerlas como codelco,
// y devuelve una tabla de resultados. Limpia todo al final.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface TestResult {
  table: string;
  acme_inserted: number;
  codelco_can_read: number;
  isolated: boolean;
  note?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validar admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized: " + (userErr?.message ?? "no user") });
  const callerId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
  if (!isAdmin) return json(403, { error: "Solo administradores" });

  const stamp = Date.now();
  const acmeEmail = `acme-tester-${stamp}@isolation-test.local`;
  const codelcoEmail = `codelco-tester-${stamp}@isolation-test.local`;
  const password = `Test!${stamp}aB`;

  const cleanup: Array<() => Promise<void>> = [];
  const results: TestResult[] = [];
  let acmePdcId: string | null = null;
  let acmeRfqId: string | null = null;

  try {
    // 1. Crear usuarios con tenant_slug en metadata
    const { data: acmeUser, error: e1 } = await admin.auth.admin.createUser({
      email: acmeEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Acme Tester", tenant_slug: "acme" },
    });
    if (e1) return json(500, { step: "create acme user", error: e1.message });
    cleanup.push(async () => { await admin.auth.admin.deleteUser(acmeUser.user.id); });

    const { data: codelcoUser, error: e2 } = await admin.auth.admin.createUser({
      email: codelcoEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Codelco Tester", tenant_slug: "codelco" },
    });
    if (e2) throw new Error("create codelco user: " + e2.message);
    cleanup.push(async () => { await admin.auth.admin.deleteUser(codelcoUser.user.id); });

    // Verificar tenant assignment vía service role
    const { data: profA } = await admin.from("profiles").select("tenant_id, id").eq("id", acmeUser.user.id).single();
    const { data: profC } = await admin.from("profiles").select("tenant_id, id").eq("id", codelcoUser.user.id).single();
    const { data: tenantAcme } = await admin.from("tenants").select("id, slug").eq("slug", "acme").single();
    const { data: tenantCodelco } = await admin.from("tenants").select("id, slug").eq("slug", "codelco").single();

    const sanityChecks = {
      acme_profile_tenant_matches: profA?.tenant_id === tenantAcme?.id,
      codelco_profile_tenant_matches: profC?.tenant_id === tenantCodelco?.id,
      tenants_distinct: tenantAcme?.id !== tenantCodelco?.id,
    };

    // 2. Sign in as acme y codelco para obtener tokens
    const acmeAuth = createClient(SUPABASE_URL, ANON_KEY);
    const { data: acmeSession, error: ae } = await acmeAuth.auth.signInWithPassword({ email: acmeEmail, password });
    if (ae || !acmeSession.session) throw new Error("sign in acme: " + ae?.message);
    const acmeToken = acmeSession.session.access_token;

    const codelcoAuth = createClient(SUPABASE_URL, ANON_KEY);
    const { data: codelcoSession, error: ce } = await codelcoAuth.auth.signInWithPassword({ email: codelcoEmail, password });
    if (ce || !codelcoSession.session) throw new Error("sign in codelco: " + ce?.message);
    const codelcoToken = codelcoSession.session.access_token;

    // Clientes con sesión
    const acmeClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${acmeToken}` } },
    });
    const codelcoClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${codelcoToken}` } },
    });

    // 3. Insertar como acme en cada tabla y testear lectura como codelco
    const insertedIds: Record<string, string> = {};

    // purchase_processes
    {
      const { data, error } = await acmeClient.from("purchase_processes").insert({
        name: "[ISO-TEST] Acme PdC",
        project: "ISO-TEST",
        criticality: "media",
        created_by: acmeUser.user.id,
        tenant_id: tenantAcme!.id,
      } as never).select("id, tenant_id").single();
      if (error || !data) {
        results.push({ table: "purchase_processes", acme_inserted: 0, codelco_can_read: 0, isolated: false, note: "INSERT acme falló: " + error?.message });
      } else {
        acmePdcId = data.id;
        insertedIds.purchase_processes = data.id;
        cleanup.push(async () => { await admin.from("purchase_processes").delete().eq("id", data.id); });
        const { data: read } = await codelcoClient.from("purchase_processes").select("id").eq("id", data.id);
        results.push({
          table: "purchase_processes", acme_inserted: 1,
          codelco_can_read: read?.length ?? 0,
          isolated: (read?.length ?? 0) === 0,
          note: `tenant_id asignado=${data.tenant_id === tenantAcme?.id ? "acme ✅" : "INCORRECTO ❌ " + data.tenant_id}`,
        });
      }
    }

    if (!acmePdcId) {
      // Sin PdC no podemos testear las tablas hijas
      return json(200, {
        sanity: sanityChecks,
        results,
        summary: "Test abortado: no se pudo crear PdC base como acme",
      });
    }

    // Helper genérico para tablas hijas
    const testChildTable = async (table: string, payload: Record<string, unknown>) => {
      const { data, error } = await acmeClient.from(table as never).insert({
        ...payload,
        created_by: acmeUser.user.id,
        tenant_id: "",
      } as never).select("id, tenant_id" as never).single();
      if (error || !data) {
        results.push({ table, acme_inserted: 0, codelco_can_read: 0, isolated: false, note: "INSERT falló: " + error?.message });
        return null;
      }
      const row = data as { id: string; tenant_id: string };
      cleanup.push(async () => { await admin.from(table).delete().eq("id", row.id); });
      const { data: read } = await codelcoClient.from(table as never).select("id").eq("id", row.id);
      const readArr = read as unknown as Array<unknown> | null;
      results.push({
        table, acme_inserted: 1,
        codelco_can_read: readArr?.length ?? 0,
        isolated: (readArr?.length ?? 0) === 0,
        note: row.tenant_id === tenantAcme?.id ? "tenant ok" : "tenant INCORRECTO " + row.tenant_id,
      });
      return row.id;
    };

    await testChildTable("purchase_milestones", {
      pdc_id: acmePdcId, milestone_type: "Test", planned_date: "2026-12-01",
    });
    await testChildTable("technical_specs", {
      pdc_id: acmePdcId, summary_description: "iso test",
    });
    acmeRfqId = await testChildTable("rfqs", {
      pdc_id: acmePdcId, sent_date: "2026-01-01", close_date: "2026-02-01",
    });
    if (acmeRfqId) {
      await testChildTable("rfq_suppliers", {
        rfq_id: acmeRfqId, supplier_name: "Iso Supplier",
      });
    }
    await testChildTable("purchase_orders", {
      pdc_id: acmePdcId, po_number: "ISO-PO-1",
    });
    await testChildTable("drawings", {
      pdc_id: acmePdcId, requested_date: "2026-01-01",
    });
    await testChildTable("fat_events", {
      pdc_id: acmePdcId, scheduled_date: "2026-06-01",
    });
    await testChildTable("logistics_events", {
      pdc_id: acmePdcId, exwork_date: "2026-07-01",
    });
    await testChildTable("alerts", {
      pdc_id: acmePdcId, type: "test", severity: "low", message: "iso test alert",
    });

    // Test extra: codelco lista TODOS los purchase_processes — no debe ver el de acme
    const { data: codelcoList } = await codelcoClient.from("purchase_processes").select("id");
    const codelcoSeesAcme = codelcoList?.some(r => r.id === acmePdcId) ?? false;

    const allIsolated = results.every(r => r.isolated);

    return json(200, {
      sanity: sanityChecks,
      results,
      list_test: {
        codelco_total_visible_pdcs: codelcoList?.length ?? 0,
        codelco_can_see_acme_pdc_in_list: codelcoSeesAcme,
      },
      summary: allIsolated && !codelcoSeesAcme
        ? "✅ AISLAMIENTO CROSS-TENANT VERIFICADO en todas las tablas"
        : "❌ FALLA: codelco pudo leer datos de acme",
    });
  } catch (e) {
    return json(500, {
      error: e instanceof Error ? e.message : String(e),
      partial_results: results,
    });
  } finally {
    // Cleanup en orden inverso
    for (const fn of cleanup.reverse()) {
      try { await fn(); } catch (_) { /* swallow */ }
    }
  }
});
