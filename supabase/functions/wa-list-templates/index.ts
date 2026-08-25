import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) return json({ error: "No autorizado" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: adminRole } = await admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!adminRole) return json({ error: "Solo admin" }, 403);
    const { data: prof } = await admin.from("profiles").select("tenant_id").eq("id", caller.id).maybeSingle();
    const { data: cfg } = await admin.from("whatsapp_config").select("access_token, business_account_id").eq("tenant_id", prof?.tenant_id ?? "").maybeSingle();
    const token = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") || cfg?.access_token || "";
    const waba = cfg?.business_account_id ?? "";
    const res = await fetch(`https://graph.facebook.com/v21.0/${waba}/message_templates?limit=50&fields=name,language,status,category,components`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    return json(body, res.ok ? 200 : 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
