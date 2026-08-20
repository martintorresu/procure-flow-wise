import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, layout, button, escapeHtml } from "../_shared/resend.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "No autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const commentId = typeof body?.commentId === "string" ? body.commentId : "";
    const origin = typeof body?.origin === "string" ? body.origin : "";
    if (!commentId || !/^https?:\/\//.test(origin)) return json({ error: "commentId y origin son requeridos" }, 400);

    // El caller debe poder leer su propio comentario vía RLS.
    const { data: comment, error: cErr } = await userClient
      .from("process_comments")
      .select("id, process_id, author_user_id, body")
      .eq("id", commentId)
      .maybeSingle();
    if (cErr) return json({ error: cErr.message }, 400);
    if (!comment || comment.author_user_id !== user.id) return json({ error: "Comentario no encontrado" }, 404);

    // Resolución de destinatarios: requiere leer perfiles/participantes fuera del alcance del caller.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: proc } = await admin
      .from("purchase_processes")
      .select("id, pdc_number, name, tenant_id, created_by, engineering_responsible, responsible_name")
      .eq("id", comment.process_id)
      .maybeSingle();
    if (!proc) return json({ error: "Proceso no encontrado" }, 404);

    const { data: authorProfile } = await admin
      .from("profiles")
      .select("full_name, email, tenant_id")
      .eq("id", comment.author_user_id)
      .maybeSingle();

    const authorIsInternal = authorProfile?.tenant_id === proc.tenant_id;
    const authorName = authorProfile?.full_name || authorProfile?.email || "Un participante";

    let recipients: string[] = [];
    if (authorIsInternal) {
      const { data: parts } = await admin
        .from("process_participants")
        .select("email")
        .eq("process_id", proc.id)
        .eq("status", "accepted");
      recipients = (parts ?? []).map((p) => p.email);
    } else {
      const ownerId = proc.created_by ?? proc.engineering_responsible;
      if (ownerId) {
        const { data: owner } = await admin.from("profiles").select("email").eq("id", ownerId).maybeSingle();
        if (owner?.email) recipients = [owner.email];
      }
    }

    recipients = [...new Set(recipients.filter(Boolean).filter((e) => e !== authorProfile?.email))];
    if (recipients.length === 0) return json({ sent: false, reason: "sin destinatarios" });

    const link = `${origin}/pdcs/${proc.id}`;
    const html = layout(
      `Nuevo comentario en ${escapeHtml(proc.pdc_number)}`,
      `<p style="font-size:15px;line-height:1.6"><strong>${escapeHtml(authorName)}</strong> comentó en el proceso <strong>${escapeHtml(proc.name)}</strong>:</p>
       <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #cbd5e1;background:#f8fafc;font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(comment.body)}</blockquote>
       ${button(link, "Ver el proceso")}`,
    );

    const result = await sendEmail(recipients, `Nuevo comentario en ${proc.pdc_number} · Pro.Curem Flow`, html);
    if (!result.ok) return json({ error: "Resend rechazó el envío", status: result.status, details: result.details }, 502);

    return json({ sent: true, recipients: recipients.length, from: result.usedFrom });
  } catch (e) {
    console.error("send-comment-notification error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
