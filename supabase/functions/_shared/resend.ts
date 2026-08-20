// Envío de email vía Resend a través del connector gateway de Lovable.
// La API key nunca se expone al cliente: solo se lee aquí, server-side.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

/** Remitente deseado. Si el dominio no está verificado en Resend, se hace fallback. */
export const PREFERRED_FROM = "Pro.Curem Flow <notificaciones@pro-curem.com>";
export const FALLBACK_FROM = "Pro.Curem Flow <onboarding@resend.dev>";

export interface SendEmailResult {
  ok: boolean;
  status: number;
  usedFrom: string;
  details?: unknown;
}

async function postEmail(from: string, to: string[], subject: string, html: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no está configurada");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY no está configurada (conecta Resend en Lovable)");

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

/** Intenta con el dominio propio; si Resend lo rechaza (dominio no verificado), reintenta con el sender de pruebas. */
export async function sendEmail(to: string[], subject: string, html: string): Promise<SendEmailResult> {
  let r = await postEmail(PREFERRED_FROM, to, subject, html);
  let usedFrom = PREFERRED_FROM;

  const domainProblem =
    !r.ok && (r.status === 403 || r.status === 401 || /domain|not verified|verify/i.test(r.text));

  if (domainProblem) {
    console.warn(`Dominio pro-curem.com no verificado en Resend [${r.status}]: ${r.text}`);
    r = await postEmail(FALLBACK_FROM, to, subject, html);
    usedFrom = FALLBACK_FROM;
  }

  if (!r.ok) {
    console.error(`Resend falló [${r.status}]: ${r.text}`);
    return { ok: false, status: r.status, usedFrom, details: r.text };
  }
  return { ok: true, status: r.status, usedFrom, details: r.text };
}

export function layout(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700">Pro.Curem Flow</div>
    <div style="height:3px;width:56px;background:#0f172a;margin:10px 0 24px"></div>
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${bodyHtml}
    <p style="font-size:12px;color:#94a3b8;margin-top:32px">
      Este mensaje fue enviado automáticamente por Pro.Curem Flow.
    </p>
  </div>
</body></html>`;
}

export function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600">${label}</a></p>`;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
