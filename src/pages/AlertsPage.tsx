import { useMemo, useState } from "react";
import { useAlerts, useResolveAlert, useMarkAlertRead, useMarkAllAlertsRead } from "@/hooks/useAlerts";
import { useProcesses } from "@/hooks/useProcesses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Bell, CheckCircle, AlertCircle, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { humanizeTechnicalText } from "@/lib/stageLabels";
import { formatAlertType, relativeTime, SEVERITY_LABELS } from "@/lib/alertLabels";
import { AlertsDashboard } from "@/components/alerts/AlertsDashboard";

export default function AlertsPage() {
  const { data: alerts = [], isLoading, isError, error } = useAlerts();
  const { data: processes = [] } = useProcesses();
  const resolveMutation = useResolveAlert();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();

  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

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

  const types = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.type))).sort(),
    [alerts],
  );

  const filtered = alerts.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (statusFilter === "pending" && a.resolved) return false;
    if (statusFilter === "resolved" && !a.resolved) return false;
    if (readFilter === "unread" && a.read_at) return false;
    if (readFilter === "read" && !a.read_at) return false;
    return true;
  });

  const pendingCount = alerts.filter((a) => !a.resolved).length;
  const unreadCount = alerts.filter((a) => !a.resolved && !a.read_at).length;

  return (
    <div className="space-y-6">
      <SEO title="Alertas" description="Alertas automáticas de Procesos por retrasos, hitos vencidos y desviaciones por severidad." path="/alerts" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Alertas</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Cargando alertas…" : `${pendingCount} alertas pendientes · ${unreadCount} sin leer`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate(undefined, { onSuccess: () => toast.success("Alertas marcadas como leídas") })}
        >
          <CheckCheck className="w-4 h-4 mr-1" /> Marcar todas como leídas
        </Button>
      </div>

      {!isLoading && !isError && <AlertsDashboard alerts={alerts} processes={processes} />}

      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[190px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{formatAlertType(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Severidad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda severidad</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo estado</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="resolved">Resueltas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Lectura" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Leídas y no leídas</SelectItem>
            <SelectItem value="unread">No leídas</SelectItem>
            <SelectItem value="read">Leídas</SelectItem>
          </SelectContent>
        </Select>
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
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Leída</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <>
                    {[0,1,2].map((i) => (
                      <tr key={i} className="border-b last:border-0">
                        {[0,1,2,3,4,5,6].map((j) => (
                          <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
                {!isLoading && filtered.length === 0 && !isError && (
                  <tr>
                    <td colSpan={7} className="py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Bell className="w-8 h-8 opacity-40" />
                        <p className="text-sm font-medium">Sin alertas</p>
                        <p className="text-xs">No hay alertas que coincidan con los filtros.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.map((alert) => {
                  const process = processes.find((p) => p.id === alert.process_id);
                  const unread = !alert.read_at && !alert.resolved;
                  return (
                    <tr
                      key={alert.id}
                      className={`border-b last:border-0 ${alert.resolved ? "opacity-50" : unread ? "bg-muted/40" : ""}`}
                    >
                      <td className="py-3 px-4">
                        {process ? (
                          <Link to={`/procesos/${alert.process_id}`} className="text-accent hover:underline font-mono text-xs">
                            {process.process_number}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px]">{formatAlertType(alert.type)}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border-l-4 ${severityColors[alert.severity]}`}>
                          {SEVERITY_LABELS[alert.severity]}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[300px]">
                        <p className={unread ? "font-semibold" : ""}>{humanizeTechnicalText(alert.message)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{relativeTime(alert.created_at)}</p>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {alert.read_at ? <span className="text-muted-foreground">Sí</span> : <span className="text-danger font-semibold">No</span>}
                      </td>
                      <td className="py-3 px-4">
                        {alert.resolved ? (
                          <span className="text-success text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Resuelta</span>
                        ) : (
                          <span className="text-warning text-xs">Pendiente</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {!alert.read_at && (
                            <Button
                              variant="ghost" size="sm"
                              disabled={markRead.isPending}
                              onClick={() => markRead.mutate(alert.id)}
                            >
                              Marcar leída
                            </Button>
                          )}
                          {!alert.resolved && (
                            <Button
                              variant="outline" size="sm"
                              disabled={resolveMutation.isPending}
                              onClick={() => resolve(alert.id)}
                            >
                              Resolver
                            </Button>
                          )}
                        </div>
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
