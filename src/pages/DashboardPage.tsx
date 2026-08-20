import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getTrafficLight } from "@/lib/trafficLight";
import { useAlerts } from "@/hooks/useAlerts";
import { usePdcs } from "@/hooks/usePdcs";
import { useApprovePdc } from "@/hooks/useApprovalMatrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, TrafficLightIndicator, CriticalityBadge, TrafficLightLegend } from "@/components/StatusIndicators";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { FileText, AlertTriangle, Clock, TrendingUp, ArrowRight, Bell, ShieldCheck, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS, CRITICALITY_LABELS, type Criticality, type PdcStatus } from "@/types/pdc";
import { PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/processTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SEO } from "@/components/SEO";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { DashboardFlowHero } from "@/components/DashboardFlowHero";

const TYPE_STYLES: Record<ProcessType, string> = {
  compra: "bg-typeCompra/15 text-typeCompra border-typeCompra/30",
  licitacion: "bg-accent/15 text-accent border-accent/30",
  contrato: "bg-typeContrato/15 text-typeContrato border-typeContrato/30",
  permiso: "bg-typePermiso/15 text-typePermiso border-typePermiso/30",
  personalizado: "bg-muted text-muted-foreground border-border",
};

function TypeBadge({ type }: { type?: ProcessType | null }) {
  if (!type || !TYPE_STYLES[type]) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${TYPE_STYLES[type]}`}>
      {PROCESS_TYPE_LABELS[type]}
    </span>
  );
}


export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: pdcs = [], isLoading: pdcsLoading } = usePdcs();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const approveMutation = useApprovePdc();

  // Prefetch para acelerar navegación a /pdcs (misma key, ya cacheada en realidad)
  useEffect(() => {
    qc.prefetchQuery({ queryKey: queryKeys.pdcs() });
  }, [qc]);

  const activePdcs = pdcs.filter((p) => !["closed", "closed_with_incident"].includes(p.current_status));
  const delayedPdcs = pdcs.filter((p) => getTrafficLight(p) === "red");
  const criticalPdcs = pdcs.filter((p) => p.criticality === "high");
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const pendingApprovals = pdcs.filter((p) => p.approval_status === "pending");
  const isManagerOrAdmin = user?.role === "gerente" || user?.role === "admin";

  const [criticalityFilter, setCriticalityFilter] = useState<Criticality | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<PdcStatus | "all">("all");

  const ownerOptions = useMemo<string[]>(
    () => Array.from(new Set(activePdcs.map((p) => p.current_owner).filter(Boolean) as string[])).sort(),
    [activePdcs]
  );
  const statusOptions = useMemo<PdcStatus[]>(
    () => Array.from(new Set(activePdcs.map((p) => p.current_status))) as PdcStatus[],
    [activePdcs]
  );

  const filteredPdcs = activePdcs.filter((p) =>
    (criticalityFilter === "all" || p.criticality === criticalityFilter) &&
    (ownerFilter === "all" || p.current_owner === ownerFilter) &&
    (statusFilter === "all" || p.current_status === statusFilter)
  );

  const handleApprove = (pdcId: string) => {
    approveMutation.mutate(pdcId, {
      onSuccess: () => toast.success("Proceso aprobado y avanzado a la siguiente etapa"),
      onError: (e) => toast.error(`Error al aprobar: ${(e as Error).message}`),
    });
  };


  const stats = [
    { label: "Procesos Activos", value: activePdcs.length, icon: FileText, color: "text-accent", to: "/pdcs" },
    { label: "Atrasados", value: delayedPdcs.length, icon: Clock, color: "text-danger", to: "/alerts" },
    { label: "Críticos", value: criticalPdcs.length, icon: AlertTriangle, color: "text-warning", to: "/alerts" },
    { label: "Alertas Pendientes", value: unresolvedAlerts.length, icon: TrendingUp, color: "text-primary", to: "/alerts" },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Panel de control" description="KPIs de procesos activos, semáforos de criticidad y alertas pendientes." path="/" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bienvenido, {user?.name}</h1>
          <p className="text-sm text-muted-foreground">Resumen de procesos</p>
        </div>
        <TrafficLightLegend />
      </div>

      {isManagerOrAdmin && pendingApprovals.length > 0 && (
        <Card className="border-l-4 border-l-warning bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Pendientes de aprobación ({pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApprovals.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                <div className="text-sm">
                  <Link to={`/pdcs/${p.id}`} className="font-mono text-xs text-accent hover:underline">{p.pdc_number}</Link>
                  <span className="ml-2 font-medium">{p.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">→ {p.approval_target_stage}</span>
                </div>
                <Button size="sm" disabled={approveMutation.isPending} onClick={() => handleApprove(p.id)}>
                  Aprobar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Hero: flujo visual */}
      {!pdcsLoading && <DashboardFlowHero pdcs={activePdcs} />}
      {pdcsLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {/* KPIs compactos */}
      <Card>
        <CardContent className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x p-0">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              aria-label={`Ver ${s.label}`}
              className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40"
            >
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold mt-0.5">{s.value}</p>
              </div>
              <s.icon className={`w-8 h-8 ${s.color} opacity-20`} />
            </Link>
          ))}
        </CardContent>
      </Card>


      {/* Table */}
      <Card className="overflow-hidden">
        <div className="h-1 w-full" style={{ background: "var(--sidebar-gradient)" }} />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Procesos Activos
          </CardTitle>
          <Link to="/pdcs">
            <Button variant="ghost" size="sm" className="text-accent">
              Ver todos <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left align-bottom">
                  <th className="py-4 px-3 font-medium text-muted-foreground">Semáforo</th>
                  <th className="py-4 px-3 font-medium text-muted-foreground">N° Proceso</th>
                  <th className="py-4 px-3 font-medium text-muted-foreground">Título</th>
                  <th className="py-4 px-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="py-4 px-3 font-medium text-muted-foreground">
                    <div className="space-y-1">
                      <div>Estado</div>
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PdcStatus | "all")}>
                        <SelectTrigger className="h-7 text-xs font-normal w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {statusOptions.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </th>
                  <th className="py-4 px-3 font-medium text-muted-foreground">
                    <div className="space-y-1">
                      <div>Responsable</div>
                      <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                        <SelectTrigger className="h-7 text-xs font-normal w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {ownerOptions.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </th>
                  <th className="py-4 px-3 font-medium text-muted-foreground">
                    <div className="space-y-1">
                      <div>Criticidad</div>
                      <Select value={criticalityFilter} onValueChange={(v) => setCriticalityFilter(v as Criticality | "all")}>
                        <SelectTrigger className="h-7 text-xs font-normal w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="high">{CRITICALITY_LABELS.high}</SelectItem>
                          <SelectItem value="medium">{CRITICALITY_LABELS.medium}</SelectItem>
                          <SelectItem value="low">{CRITICALITY_LABELS.low}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </th>
                  <th className="py-4 px-3 font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pdcsLoading && [0,1,2].map((i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Array.from({length: 8}).map((_, j) => (
                      <td key={j} className="py-4 px-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))}
                {!pdcsLoading && filteredPdcs.map((pdc) => {
                  const light = getTrafficLight(pdc);
                  const borderColor = light === "green" ? "border-l-success" : light === "yellow" ? "border-l-warning" : "border-l-danger";
                  const isChained = Boolean(pdc.predecessor_process_id || activePdcs.some((o) => o.predecessor_process_id === pdc.id));
                  return (
                    <tr key={pdc.id} className={`border-b last:border-0 border-l-4 ${borderColor} hover:bg-muted/50 transition-all duration-200 hover:shadow-sm hover:-translate-y-px rounded-md`}>
                      <td className="py-4 px-3"><TrafficLightIndicator color={light} size="lg" /></td>
                      <td className="py-4 px-3 font-mono text-xs">{pdc.pdc_number}</td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-1.5 max-w-[220px]">
                          <span className="font-medium truncate">{pdc.title}</span>
                          {isChained && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link2 className="w-3.5 h-3.5 text-accent shrink-0" aria-label="Encadenado" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">Proceso encadenado</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-3"><TypeBadge type={pdc.process_type} /></td>
                      <td className="py-4 px-3"><StatusBadge status={pdc.current_status} colorizeByStage /></td>
                      <td className="py-4 px-3 text-muted-foreground">{pdc.current_owner}</td>
                      <td className="py-4 px-3"><CriticalityBadge level={pdc.criticality} /></td>
                      <td className="py-4 px-3">
                        <Link to={`/pdcs/${pdc.id}`}>
                          <Button variant="outline" size="sm">Ver</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!pdcsLoading && filteredPdcs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <FileText className="w-6 h-6 opacity-40" />
                        <span className="text-sm">No hay procesos que coincidan con los filtros.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Alertas Recientes</CardTitle>
          <Link to="/alerts">
            <Button variant="ghost" size="sm" className="text-accent">
              Ver todas <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertsLoading && [0,1,2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-r-md" />
            ))}
            {!alertsLoading && unresolvedAlerts.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Bell className="w-7 h-7 opacity-40" />
                <p className="text-sm font-medium">Sin alertas pendientes</p>
                <p className="text-xs">Todo en orden por ahora.</p>
              </div>
            )}
            {!alertsLoading && unresolvedAlerts.slice(0, 3).map((alert) => {
              const pdc = pdcs.find((p) => p.id === alert.pdc_id);
              const severityColors = {
                low: "border-l-success", medium: "border-l-warning",
                high: "border-l-danger", critical: "border-l-danger",
              };
              return (
                <div key={alert.id} className={`border-l-4 ${severityColors[alert.severity]} bg-muted/30 rounded-r-md p-3`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{pdc?.pdc_number ?? "—"} {pdc?.title ? `— ${pdc.title}` : ""}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{alert.created_at?.slice(0, 10)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
