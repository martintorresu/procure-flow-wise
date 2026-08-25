import { useAlerts, useResolveAlert } from "@/hooks/useAlerts";
import { usePdcs } from "@/hooks/usePdcs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bell, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { formatStageLabel, humanizeTechnicalText } from "@/lib/stageLabels";


export default function AlertsPage() {
  const { data: alerts = [], isLoading, isError, error } = useAlerts();
  const { data: pdcs = [] } = usePdcs();
  const resolveMutation = useResolveAlert();

  const resolve = (id: string) => {
    resolveMutation.mutate(id, {
      onSuccess: () => toast.success("Alerta marcada como resuelta"),
      onError: (e) => toast.error(`No se pudo resolver: ${e.message}`),
    });
  };

  const severityColors = {
    low: "border-l-success bg-success/5",
    medium: "border-l-warning bg-warning/5",
    high: "border-l-danger bg-danger/5",
    critical: "border-l-danger bg-danger/10",
  } as const;

  const severityLabels = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" } as const;
  const pendingCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="space-y-6">
      <SEO title="Alertas" description="Alertas automáticas de Procesos por retrasos, hitos vencidos y desviaciones por severidad." path="/alerts" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Cargando alertas…" : `${pendingCount} alertas pendientes`}
          </p>
        </div>
      </div>

      {isError && (
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-danger">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">No se pudieron cargar las alertas: {error.message}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Proceso</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Tipo</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Severidad</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Mensaje</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <>
                    {[0,1,2].map((i) => (
                      <tr key={i} className="border-b last:border-0">
                        {[0,1,2,3,4,5].map((j) => (
                          <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
                {!isLoading && alerts.length === 0 && !isError && (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Bell className="w-8 h-8 opacity-40" />
                        <p className="text-sm font-medium">Sin alertas</p>
                        <p className="text-xs">No hay alertas registradas para tu organización todavía.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && alerts.map((alert) => {
                  const pdc = pdcs.find((p) => p.id === alert.pdc_id);
                  return (
                    <tr key={alert.id} className={`border-b last:border-0 ${alert.resolved ? "opacity-50" : ""}`}>
                      <td className="py-3 px-4">
                        {pdc ? (
                          <Link to={`/pdcs/${alert.pdc_id}`} className="text-accent hover:underline font-mono text-xs">
                            {pdc.pdc_number}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{formatStageLabel(alert.type)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border-l-4 ${severityColors[alert.severity]}`}>
                          {severityLabels[alert.severity]}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[300px]">{humanizeTechnicalText(alert.message)}</td>

                      <td className="py-3 px-4">
                        {alert.resolved ? (
                          <span className="text-success text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Resuelta</span>
                        ) : (
                          <span className="text-warning text-xs">Pendiente</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {!alert.resolved && (
                          <Button
                            variant="outline" size="sm"
                            disabled={resolveMutation.isPending}
                            onClick={() => resolve(alert.id)}
                          >
                            Resolver
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
