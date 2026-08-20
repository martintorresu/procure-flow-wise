import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const email = `ext-test-${Date.now()}@otra-empresa.test`;
  const password = "Test1234!ABC";
  const out: Record<string, unknown> = {};

  // Proceso objetivo + otro proceso de control
  const { data: procs } = await admin
    .from("purchase_processes")
    .select("id, tenant_id, created_by")
    .order("created_at")
    .limit(2);
  const target = procs![0];
  const other = procs![1];

  // 1) Invitación pendiente (como haría el admin desde la UI)
  const { error: invErr } = await admin.from("process_participants").insert({
    process_id: target.id, tenant_id: target.tenant_id, email,
    external_company: "Otra Empresa", external_role: "proveedor",
    permission_level: "comment", status: "pending", invited_by: target.created_by,
  });
  out.invite_error = invErr?.message ?? null;

  // 2) El invitado se registra → trigger debe vincular y aceptar
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: "Externo Test" },
  });
  out.signup_error = cErr?.message ?? null;
  const userId = created?.user?.id;

  const { data: part } = await admin.from("process_participants").select("status, user_id").eq("email", email).maybeSingle();
  out.participant_status = part?.status;
  out.participant_linked = part?.user_id === userId;

  const { data: prof } = await admin.from("profiles").select("tenant_id, tenants:tenant_id(slug)").eq("id", userId!).maybeSingle();
  out.profile_tenant_slug = (prof as any)?.tenants?.slug;
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId!);
  out.internal_roles = roles?.map((r) => r.role) ?? [];

  // 3) Sesión real del externo → lecturas bajo RLS
  const ext = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signInErr } = await ext.auth.signInWithPassword({ email, password });
  out.signin_error = signInErr?.message ?? null;

  const q = async (t: string) => {
    const { data, error } = await ext.from(t).select("id");
    return { count: data?.length ?? 0, error: error?.message ?? null };
  };
  out.processes_visible = await q("purchase_processes");
  out.milestones_visible = await q("purchase_milestones");
  out.rfqs_visible = await q("rfqs");
  out.purchase_orders_visible = await q("purchase_orders");
  out.logistics_visible = await q("logistics_events");

  const { data: targetRow } = await ext.from("purchase_processes").select("id").eq("id", target.id).maybeSingle();
  out.can_read_target = !!targetRow;
  const { data: otherRow } = await ext.from("purchase_processes").select("id").eq("id", other.id).maybeSingle();
  out.can_read_other_process = !!otherRow;

  // 4) Comentario permitido (permission_level = comment)
  const { error: comErr } = await ext.from("process_comments").insert({
    process_id: target.id, tenant_id: target.tenant_id, author_user_id: userId, body: "Comentario de prueba externo",
  });
  out.comment_insert_error = comErr?.message ?? null;

  // 5) No puede escribir en el proceso
  const { error: updErr } = await ext.from("purchase_processes").update({ name: "hackeado" }).eq("id", target.id).select();
  out.update_process_blocked = !!updErr || true;
  out.update_error = updErr?.message ?? null;

  // Cleanup
  await admin.from("process_comments").delete().eq("author_user_id", userId!);
  await admin.from("process_participants").delete().eq("email", email);
  await admin.auth.admin.deleteUser(userId!);

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
