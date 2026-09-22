// Edge function: check-domain-health
// Verifica, para una lista de dominios, su resolución DNS (DNS-over-HTTPS de Cloudflare),
// el certificado HTTPS y la disponibilidad del sitio. Solo lectura, no cambia nada.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_IP = "185.158.133.1";

type RecordCheck = { ok: boolean; values: string[]; error?: string };

async function doh(name: string, type: "A" | "CNAME" | "TXT"): Promise<RecordCheck> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: "application/dns-json" } },
    );
    const data = await res.json();
    // NXDOMAIN = 3
    if (data.Status === 3) return { ok: false, values: [], error: "NXDOMAIN" };
    if (data.Status !== 0) return { ok: false, values: [], error: `DNS status ${data.Status}` };
    const values = (data.Answer ?? [])
      .filter((a: { type: number }) => (type === "A" ? a.type === 1 : type === "CNAME" ? a.type === 5 : a.type === 16))
      .map((a: { data: string }) => String(a.data).replace(/^"|"$/g, ""));
    return { ok: values.length > 0, values };
  } catch (e) {
    return { ok: false, values: [], error: (e as Error).message };
  }
}

async function checkHttp(host: string) {
  const started = Date.now();
  try {
    const res = await fetch(`https://${host}/`, { redirect: "manual" });
    const location = res.headers.get("location") ?? undefined;
    return {
      reachable: true,
      status: res.status,
      redirectsTo: location,
      https: true,
      latencyMs: Date.now() - started,
    };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    const certIssue = /certificate|tls|ssl|handshake/i.test(msg);
    return {
      reachable: false,
      status: 0,
      https: !certIssue,
      latencyMs: Date.now() - started,
      error: certIssue ? "Certificado HTTPS no válido o aún no emitido" : msg,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { domains } = (await req.json()) as { domains?: string[] };
    if (!Array.isArray(domains) || domains.length === 0) return json({ error: "domains requerido" }, 400);
    if (domains.length > 20) return json({ error: "máximo 20 dominios" }, 400);

    const results = await Promise.all(
      domains.map(async (raw) => {
        const host = String(raw).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        const [a, cname, txt] = await Promise.all([
          doh(host, "A"),
          doh(host, "CNAME"),
          doh(`_lovable.${host}`, "TXT"),
        ]);
        const dnsResolves = a.ok || cname.ok;
        const pointsToLovable = a.values.includes(LOVABLE_IP) || cname.values.some((v) => /lovable/i.test(v));
        const http = dnsResolves ? await checkHttp(host) : null;

        let state: "ok" | "redirect" | "dns_missing" | "dns_wrong" | "tls" | "unreachable";
        if (!dnsResolves) state = "dns_missing";
        else if (!pointsToLovable) state = "dns_wrong";
        else if (http && !http.reachable) state = http.https ? "unreachable" : "tls";
        else if (http && http.status >= 300 && http.status < 400) state = "redirect";
        else state = "ok";

        return {
          host,
          state,
          dns: { resolves: dnsResolves, a: a.values, cname: cname.values, error: a.error ?? cname.error, pointsToLovable },
          verification: { present: txt.ok, values: txt.values },
          http,
          checkedAt: new Date().toISOString(),
        };
      }),
    );

    return json({ results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
