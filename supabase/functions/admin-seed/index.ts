// Edge function: admin-seed
// Acciones (solo invocable por usuarios con rol 'admin'):
//  - create_user: crea cuenta con email_confirm=true y le asigna un rol
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const VALID_ROLES = [
  "admin",
  "gestor",
  "colaborador",
  "lector",
] as const;
type Role = (typeof VALID_ROLES)[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Validar JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user?.id) return json(401, { error: "Unauthorized" });
  const userId = userData.user.id;

  // 2. Confirmar que es admin (consulta directa: has_role vive en el esquema privado)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: adminRole, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleErr || !adminRole) return json(403, { error: "Solo administradores" });

  // 3. Parse body
  let body: { action?: string; payload?: Record<string, unknown> };
  try { body = await req.json(); } catch { return json(400, { error: "JSON inválido" }); }
  const action = body.action;

  try {
    if (action === "create_user") {
      const p = body.payload ?? {};
      const email = String(p.email ?? "").trim().toLowerCase();
      const password = String(p.password ?? "");
      const fullName = String(p.full_name ?? "").trim() || email;
      const role = String(p.role ?? "") as Role;
      const phone = String(p.phone ?? "").trim();
      const rut = String(p.rut ?? "").trim();

      if (!email || !password || password.length < 6) {
        return json(400, { error: "email y password (>= 6 chars) requeridos" });
      }
      if (!VALID_ROLES.includes(role)) {
        return json(400, { error: `role inválido. Debe ser uno de: ${VALID_ROLES.join(", ")}` });
      }
      if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) {
        return json(400, { error: "phone debe estar en formato E.164 (ej: +56912345678)" });
      }

      // El nuevo usuario hereda el tenant del admin que lo crea
      const { data: adminProfile } = await admin
        .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
      let tenantSlug: string | undefined;
      if (adminProfile?.tenant_id) {
        const { data: tenant } = await admin
          .from("tenants").select("slug").eq("id", adminProfile.tenant_id).maybeSingle();
        tenantSlug = tenant?.slug ?? undefined;
      }

      // Crear usuario con email confirmado
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, ...(tenantSlug ? { tenant_slug: tenantSlug } : {}) },
      });
      if (createErr) return json(400, { error: createErr.message });

      const newId = created.user.id;

      if (phone || rut) {
        await admin.from("profile_contacts").upsert({
          id: newId,
          phone: phone || null,
          rut: rut || null,
        }, { onConflict: "id" });
      }


      // El trigger handle_new_user crea profile y nivel 'colaborador' por defecto.
      // Si el nivel pedido es distinto, lo reemplazamos.
      if (role !== "colaborador") {
        await admin.from("user_roles").delete().eq("user_id", newId);
        const { error: roleInsErr } = await admin.from("user_roles").insert({
          user_id: newId, role,
        });
        if (roleInsErr) return json(500, { error: `Usuario creado pero rol falló: ${roleInsErr.message}` });
      }

      return json(200, { ok: true, user_id: newId, email, role });

    }

    return json(400, { error: `action desconocida: ${action}` });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "Error desconocido" });
  }
});
