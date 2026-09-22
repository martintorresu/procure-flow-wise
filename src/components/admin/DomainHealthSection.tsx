import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { TENANTS } from "@/config/tenants";
import { Globe, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

type DomainState = "ok" | "redirect" | "dns_missing" | "dns_wrong" | "tls" | "unreachable";

interface DomainResult {
  host: string;
  state: DomainState;
  dns: { resolves: boolean; a: string[]; cname: string[]; error?: string; pointsToLovable: boolean };
  verification: { present: boolean; values: string[] };
  http: { reachable: boolean; status: number; redirectsTo?: string; https: boolean; latencyMs: number; error?: string } | null;
  checkedAt: string;
}

/** Dominios conocidos: el de cada tenant con marca + los dominios legacy/publicados. */
const EXTRA_DOMAINS = ["procurement.demo.inovahr-app.com", "minuta-activa.lovable.app"];

function domainsToCheck(): string[] {
  const fromTenants = Object.values(TENANTS)
    .filter((t) => t.slug !== "default")
    .map((t) => `procurement.${t.slug}.inovahr-app.com`);
  return Array.from(new Set([...fromTenants, ...EXTRA_DOMAINS]));
}

const STATE_META: Record<DomainState, { label: string; tone: "ok" | "warn" | "bad"; icon: typeof CheckCircle2 }> = {
  ok: { label: "Funcionando", tone: "ok", icon: CheckCircle2 },
  redirect: { label: "Redirige a otra dirección", tone: "warn", icon: ArrowRightLeft },
  dns_missing: { label: "No resuelve (NXDOMAIN)", tone: "bad", icon: XCircle },
  dns_wrong: { label: "Apunta a otro servidor", tone: "bad", icon: AlertTriangle },
  tls: { label: "Certificado HTTPS pendiente", tone: "warn", icon: AlertTriangle },
  unreachable: { label: "No responde", tone: "bad", icon: XCircle },
};

const FIXES: Record<DomainState, string[]> = {
  ok: ["No hay nada que hacer: la dirección abre la aplicación con candado de seguridad."],
  redirect: [
    "Esta dirección envía a los visitantes a otra dirección, porque esa otra está marcada como principal.",
    "Si quieres que abra la aplicación por sí misma, entra a Configuración del proyecto → Dominios, abre el menú ⋯ de la dirección marcada como principal y elige «Quitar como principal».",
  ],
  dns_missing: [
    "El navegador muestra «NXDOMAIN»: la dirección todavía no existe en el sistema de nombres de Internet.",
    "1. En el proveedor donde está registrado el dominio, crea un registro A para este nombre con el valor 185.158.133.1, y un registro TXT llamado _lovable con el código de verificación que entrega Lovable.",
    "2. Revisa que no queden registros antiguos para el mismo nombre apuntando a otro lugar.",
    "3. Los cambios pueden tardar hasta 72 horas en verse en todas partes; normalmente son minutos.",
    "4. Si a ti te falla pero aquí aparece bien, tu conexión guardó la respuesta anterior: prueba con datos móviles o cambia el DNS de tu equipo a 1.1.1.1.",
  ],
  dns_wrong: [
    "La dirección existe, pero apunta a un servidor que no es el de esta aplicación.",
    "Corrige el registro A para que quede en 185.158.133.1 (o el destino CNAME que indique Lovable) y elimina los registros duplicados del mismo nombre.",
  ],
  tls: [
    "El candado de seguridad todavía no está listo para esta dirección.",
    "Suele resolverse solo en unos minutos tras verificar el dominio. Si persiste, revisa que no existan registros CAA que bloqueen a Let's Encrypt, Google Trust Services y SSL.com, y vuelve a intentar desde Configuración del proyecto → Dominios.",
  ],
  unreachable: [
    "La dirección resuelve, pero el sitio no respondió.",
    "Verifica que el proyecto esté publicado y vuelve a comprobar en unos minutos.",
  ],
};

function StateBadge({ state }: { state: DomainState }) {
  const meta = STATE_META[state];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.tone === "ok" ? "default" : meta.tone === "warn" ? "secondary" : "destructive"} className="gap-1">
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

export function DomainHealthSection() {
  const [results, setResults] = useState<DomainResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-domain-health", {
        body: { domains: domainsToCheck() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResults(data.results ?? []);
      setLastRun(new Date().toLocaleString("es-CL"));
    } catch (e) {
      toast.error(`No se pudo comprobar el estado: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Direcciones web de los clientes
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Estado de cada dirección: si existe en Internet, si tiene candado de seguridad y si abre la aplicación.
            {lastRun && ` Última comprobación: ${lastRun}.`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={run} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Comprobar
        </Button>
      </CardHeader>
      <CardContent>
        {loading && results.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Comprobando direcciones…</p>
        )}
        {!loading && results.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin resultados todavía.</p>
        )}

        <Accordion type="multiple" className="w-full">
          {results.map((r) => (
            <AccordionItem key={r.host} value={r.host}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-3 text-left">
                  <span className="font-medium break-all">{r.host}</span>
                  <StateBadge state={r.state} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Existe en Internet</p>
                    <p className="font-medium">{r.dns.resolves ? "Sí" : "No"}</p>
                    {r.dns.a.length > 0 && <p className="text-xs text-muted-foreground break-all">A: {r.dns.a.join(", ")}</p>}
                    {r.dns.cname.length > 0 && <p className="text-xs text-muted-foreground break-all">CNAME: {r.dns.cname.join(", ")}</p>}
                    {r.dns.error && <p className="text-xs text-destructive">{r.dns.error}</p>}
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Candado de seguridad</p>
                    <p className="font-medium">{r.http ? (r.http.https && r.http.reachable ? "Activo" : "Pendiente") : "Sin comprobar"}</p>
                    {r.http?.error && <p className="text-xs text-destructive">{r.http.error}</p>}
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Respuesta del sitio</p>
                    <p className="font-medium">{r.http?.reachable ? `${r.http.status} · ${r.http.latencyMs} ms` : "Sin respuesta"}</p>
                    {r.http?.redirectsTo && <p className="text-xs text-muted-foreground break-all">Envía a: {r.http.redirectsTo}</p>}
                  </div>
                </div>

                <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                  <p className="font-medium">Qué hacer</p>
                  {FIXES[r.state].map((line) => (
                    <p key={line} className="text-muted-foreground">{line}</p>
                  ))}
                  {!r.verification.present && r.state !== "ok" && (
                    <p className="text-muted-foreground">
                      Falta el registro TXT de verificación (_lovable.{r.host}); agrégalo con el valor que muestra Configuración del proyecto → Dominios.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
