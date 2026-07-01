// One-off: crea a Ramón Torres como admin. Protegida por BOOTSTRAP_TOKEN.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bootstrap-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const email = "ramon@pro-curem.com";
  const password = "RamonAdmin2026!";
  const fullName = "Ramón Torres";

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, area: "Administración", tenant_slug: "default" },
  });
  if (createErr) {
    return new Response(JSON.stringify({ error: createErr.message }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const uid = created.user.id;
  await admin.from("user_roles").delete().eq("user_id", uid);
  await admin.from("user_roles").insert({ user_id: uid, role: "admin" });

  return new Response(JSON.stringify({ ok: true, user_id: uid, email }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
