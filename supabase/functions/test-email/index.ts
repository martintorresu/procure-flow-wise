import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendEmail, layout } from "../_shared/resend.ts";

const RECIPIENTS = ["mtorres74@hotmail.com", "martin.torres.inovahr@gmail.com"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const html = layout(
    "Email de prueba",
    `<p style="font-size:15px;line-height:1.6">Este es un email de prueba enviado desde Pro.Curem Flow para verificar que el sistema de notificaciones está funcionando correctamente. Si recibes este email, la configuración de Resend está operativa.</p>`,
  );

  try {
    const results = [];
    for (const to of RECIPIENTS) {
      const r = await sendEmail([to], "Pro.Curem - Email de prueba", html);
      results.push({ to, ok: r.ok, status: r.status, from: r.usedFrom, details: r.details });
    }
    return json({ results });
  } catch (e) {
    console.error("test-email error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
