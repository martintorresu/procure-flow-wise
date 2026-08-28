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

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "No autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const participantId = typeof body?.participantId === "string" ? body.participantId : "";
    const origin = typeof body?.origin === "string" ? body.origin : "";
    if (!participantId || !/^https?:\/\//.test(origin)) return json({ error: "participantId y origin son requeridos" }, 400);

    // El caller debe poder leer la fila (RLS): no se usa service role para autorizar.
    const { data: participant, error: pErr } = await supabase
      .from("process_participants")
      .select("id, email, external_company, process_id")
      .eq("id", participantId)
      .maybeSingle();
    if (pErr) return json({ error: pErr.message }, 400);
    if (!participant) return json({ error: "Invitación no encontrada" }, 404);

    const { data: proc } = await supabase
      .from("processes")
      .select("process_number, name")
      .eq("id", participant.process_id)
      .maybeSingle();

    const link = `${origin}/signup?invited_email=${encodeURIComponent(participant.email)}`;
    const procTitle = proc ? `${proc.process_number} — ${proc.name}` : "un proceso";

    const html = layout(
      "Te invitaron a un proceso en Pro.Curem Flow",
      `<p style="font-size:15px;line-height:1.6">Hola,</p>
       <p style="font-size:15px;line-height:1.6">Fuiste invitado a participar en el proceso <strong>${escapeHtml(procTitle)}</strong>.</p>
       <p style="font-size:15px;line-height:1.6">Crea tu cuenta con este correo (<strong>${escapeHtml(participant.email)}</strong>) para acceder. Solo verás este proceso.</p>
       ${button(link, "Aceptar invitación")}
       <p style="font-size:13px;color:#64748b">Si el botón no funciona, copia este enlace:<br>${escapeHtml(link)}</p>`,
    );

    const result = await sendEmail([participant.email], `Invitación al proceso ${proc?.process_number ?? ""} · Pro.Curem Flow`.trim(), html);
    if (!result.ok) return json({ error: "Resend rechazó el envío", status: result.status, details: result.details }, 502);

    return json({ sent: true, from: result.usedFrom });
  } catch (e) {
    console.error("send-invite-email error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
