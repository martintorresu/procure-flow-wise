import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const email = `acme-signup-${Date.now()}@test.local`;
  const password = "Test1234!ABC";

  // Simula lo que hace el frontend en /t/acme/: pasa tenant_slug en metadata
  const { data: created, error: signUpErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "ACME Signup Test", area: "Ingeniería", tenant_slug: "acme" },
  });
  if (signUpErr) {
    return new Response(JSON.stringify({ ok: false, step: "createUser", error: signUpErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = created.user!.id;

  // Lee profile + tenant slug
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id, tenant_id, tenants:tenant_id(slug, name)")
    .eq("id", userId)
    .maybeSingle();

  // Cleanup
  await admin.auth.admin.deleteUser(userId);

  const tenantSlug = (profile as any)?.tenants?.slug ?? null;
  const pass = tenantSlug === "acme";

  return new Response(JSON.stringify({
    ok: pass,
    expected_tenant_slug: "acme",
    actual_tenant_slug: tenantSlug,
    profile_error: pErr?.message ?? null,
    test_email: email,
  }, null, 2), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
