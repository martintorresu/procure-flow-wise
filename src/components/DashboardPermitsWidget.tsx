import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowRight, FileCheck } from "lucide-react";
import { usePermits, usePermitAlertSync } from "@/hooks/usePermits";
import { expiryMeta, PERMIT_STATUS_LABELS, type PermitStatus } from "@/lib/permits";

export function DashboardPermitsWidget() {
  const { data: permits = [], isLoading } = usePermits();
  usePermitAlertSync(permits);

  const withMeta = permits
    .filter((p) => p.status !== "rechazado")
    .map((p) => ({ permit: p, meta: expiryMeta(p.expiration_date, p.status) }));

  const overdue = withMeta.filter((x) => x.meta.overdue || x.permit.status === "vencido");
  const soon = withMeta.filter((x) => !x.meta.overdue && x.meta.days !== null && x.meta.days <= 30);
  const active = withMeta.filter((x) => x.permit.status === "aprobado" && !x.meta.overdue);

  const critical = [...overdue, ...soon]
    .sort((a, b) => (a.meta.days ?? 9999) - (b.meta.days ?? 9999))
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="w-4 h-4" /> Permisología
        </CardTitle>
        <Link to="/permits">
          <Button variant="ghost" size="sm" className="text-accent">
            Ver todos <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-24 w-full rounded-lg" />}
        {!isLoading && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Vigentes</p>
                <p className="text-2xl font-bold mt-0.5">{active.length}</p>
              </div>
              <div className={`rounded-lg border p-3 ${soon.length ? "border-warning/50 bg-warning/5" : ""}`}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Por vencer (30d)</p>
                <p className={`text-2xl font-bold mt-0.5 ${soon.length ? "text-warning" : ""}`}>{soon.length}</p>
              </div>
              <div className={`rounded-lg border p-3 ${overdue.length ? "border-danger/50 bg-danger/5" : ""}`}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Vencidos</p>
                <p className={`text-2xl font-bold mt-0.5 ${overdue.length ? "text-danger" : ""}`}>{overdue.length}</p>
              </div>
            </div>

            {critical.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No hay permisos próximos a vencer.</p>
            )}

            <ul className="space-y-2">
              {critical.map(({ permit, meta }) => (
                <li
                  key={permit.id}
                  className={`rounded-md border-l-4 bg-muted/30 p-3 ${meta.overdue ? "border-l-danger" : "border-l-warning"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium line-clamp-1">
                      {permit.permit_type}
                      {permit.permit_number ? ` · ${permit.permit_number}` : ""}
                    </p>
                    {meta.overdue && <Badge variant="destructive" className="shrink-0">Vencido</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {PERMIT_STATUS_LABELS[permit.status as PermitStatus]} ·{" "}
                    <span className={meta.className}>{meta.label}</span>
                    {permit.expiration_date ? ` · ${permit.expiration_date}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
