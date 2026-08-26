import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PERMIT_STATUS_BAR, PERMIT_STATUS_LABELS, expiryMeta, type PermitStatus } from "@/lib/permits";
import type { Permit } from "@/hooks/usePermits";

const DAY = 86_400_000;

function toTime(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(`${iso}T00:00:00`).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Gantt simplificado: barra desde solicitud hasta vencimiento. */
export function PermitsTimeline({ permits, onSelect }: { permits: Permit[]; onSelect: (p: Permit) => void }) {
  const rows = useMemo(() => {
    const items = permits
      .map((p) => {
        const start = toTime(p.application_date) ?? toTime(p.approval_date) ?? toTime(p.expiration_date);
        const end = toTime(p.expiration_date) ?? toTime(p.approval_date) ?? start;
        return start && end ? { permit: p, start, end: Math.max(end, start + DAY * 5) } : null;
      })
      .filter(Boolean) as { permit: Permit; start: number; end: number }[];
    if (!items.length) return { items, min: 0, max: 1, months: [] as { label: string; left: number }[] };

    const now = Date.now();
    const min = Math.min(...items.map((i) => i.start), now);
    const max = Math.max(...items.map((i) => i.end), now);
    const span = Math.max(max - min, DAY);

    const months: { label: string; left: number }[] = [];
    const cursor = new Date(min);
    cursor.setDate(1);
    while (cursor.getTime() <= max) {
      months.push({
        label: cursor.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
        left: ((cursor.getTime() - min) / span) * 100,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { items, min, max, span, months };
  }, [permits]);

  if (!rows.items.length) {
    return (
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
        No hay permisos con fechas para graficar.
      </CardContent></Card>
    );
  }

  const min = rows.min;
  const span = Math.max(rows.max - min, DAY);
  const todayLeft = ((Date.now() - min) / span) * 100;

  return (
    <Card>
      <CardContent className="pt-6 space-y-1 overflow-x-auto">
        {/* Eje de meses */}
        <div className="relative h-6 ml-[220px] min-w-[420px] border-b">
          {rows.months.map((m) => (
            <span
              key={m.label + m.left}
              className="absolute -translate-x-1/2 text-[10px] uppercase tracking-wide text-muted-foreground"
              style={{ left: `${m.left}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="relative">
          {/* Línea de hoy */}
          {/* Mismo sistema de coordenadas que las barras: contenedor alineado al área flex-1 */}
          <div className="pointer-events-none absolute inset-y-0 left-[220px] right-0" aria-hidden>
            <div
              className="absolute top-0 bottom-0 w-px bg-accent/70 z-10"
              style={{ left: `${todayLeft}%` }}
            />
          </div>
          {rows.items.map(({ permit, start, end }) => {
            const left = ((start - min) / span) * 100;
            const width = Math.max(((end - start) / span) * 100, 1.5);
            const meta = expiryMeta(permit.expiration_date, permit.status);
            const soon = meta.days !== null && meta.days <= 30;
            return (
              <button
                key={permit.id}
                onClick={() => onSelect(permit)}
                className="flex items-center gap-2 w-full min-w-[420px] py-1.5 hover:bg-muted/40 rounded text-left"
              >
                <span className="w-[212px] shrink-0 pr-2 truncate text-xs font-medium flex items-center gap-1">
                  {soon && <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />}
                  {permit.permit_number ?? permit.permit_type}
                </span>
                <span className="relative flex-1 h-5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`absolute h-4 top-0.5 rounded-full ${PERMIT_STATUS_BAR[permit.status as PermitStatus] ?? "bg-muted"}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-medium">{permit.permit_type}</p>
                      <p className="text-xs">{PERMIT_STATUS_LABELS[permit.status as PermitStatus]} · {meta.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {permit.application_date ?? "—"} → {permit.expiration_date ?? "—"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
