import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getTrafficLight } from "@/lib/trafficLight";
import { useAlerts } from "@/hooks/useAlerts";
import { usePdcs } from "@/hooks/usePdcs";
import { useApprovePdc } from "@/hooks/useApprovalMatrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, CriticalityBadge, TrafficLightLegend } from "@/components/StatusIndicators";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { FileText, AlertTriangle, Clock, TrendingUp, ArrowRight, Bell, ShieldCheck, Link2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS, CRITICALITY_LABELS, type Criticality, type PdcStatus, type TrafficLight } from "@/types/pdc";
import { PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/processTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SEO } from "@/components/SEO";
import { humanizeTechnicalText } from "@/lib/stageLabels";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { DashboardFlowHero } from "@/components/DashboardFlowHero";
import { DashboardCommitmentsWidget } from "@/components/DashboardCommitmentsWidget";
import { DashboardContingenciesWidget } from "@/components/DashboardContingenciesWidget";
import { DashboardMinutaWidget } from "@/components/DashboardMinutaWidget";
import { Badge } from "@/components/ui/badge";
import { useTenantSubscription } from "@/hooks/useTenantSubscription";
import { PLAN_LABELS, usageLabel } from "@/lib/plans";


const TYPE_INITIALS: Record<ProcessType, string> = {
  compra: "Cp",
  licitacion: "Lt",
  contrato: "Ct",
  permiso: "Pm",
  obra: "Ob",
  personalizado: "Ps",
};

const LIGHT_GLOW: Record<TrafficLight, string> = {
  green: "hsl(var(--success))",
  yellow: "hsl(var(--warning))",
  red: "hsl(var(--danger))",
};


export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: pdcs = [], isLoading: pdcsLoading } = usePdcs();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const approveMutation = useApprovePdc();
  const subscription = useTenantSubscription();


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
  const [statusFilter, setStatusFilter] = useState<PdcStatus | "all">("all");

  const statusOptions = useMemo<PdcStatus[]>(
    () => Array.from(new Set(activePdcs.map((p) => p.current_status))) as PdcStatus[],
    [activePdcs]
  );

  const filteredPdcs = activePdcs.filter((p) =>
    (criticalityFilter === "all" || p.criticality === criticalityFilter) &&
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
    { label: "Atrasados", value: delayedPdcs.length, icon: Clock, color: "text-danger", to: "/pdcs?delayed=true" },
    { label: "Críticos", value: criticalPdcs.length, icon: AlertTriangle, color: "text-warning", to: "/pdcs?criticality=high" },
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
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant={subscription.tier === "pro" ? "default" : "secondary"}
            className={subscription.tier === "pro" ? "bg-blue-600 text-white hover:bg-blue-600" : ""}
          >
            {`Plan ${PLAN_LABELS[subscription.tier]} · ${usageLabel(subscription.usage.processes, subscription.limits.maxActiveProcesses, "procesos")}`}
          </Badge>
          <TrafficLightLegend />
        </div>

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


      {/* Compromisos pendientes del usuario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardMinutaWidget />
        <DashboardCommitmentsWidget />
        <DashboardContingenciesWidget />
      </div>


      {/* Active processes as separated cards */}
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
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Estado</span>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PdcStatus | "all")}>
                <SelectTrigger className="h-7 text-xs font-normal w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Criticidad</span>
              <Select value={criticalityFilter} onValueChange={(v) => setCriticalityFilter(v as Criticality | "all")}>
                <SelectTrigger className="h-7 text-xs font-normal w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">{CRITICALITY_LABELS.high}</SelectItem>
                  <SelectItem value="medium">{CRITICALITY_LABELS.medium}</SelectItem>
                  <SelectItem value="low">{CRITICALITY_LABELS.low}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List */}
          <div role="list" aria-label="Procesos activos" className="flex flex-col gap-2 mt-3">
            {pdcsLoading && [0,1,2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg shadow-sm border bg-card p-4">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
            {!pdcsLoading && filteredPdcs.map((pdc) => {
              const light = getTrafficLight(pdc);
              const borderColor = light === "green" ? "border-l-success" : light === "yellow" ? "border-l-warning" : "border-l-danger";
              const bgGradient = light === "green" ? "from-success/15 to-success/5" : light === "yellow" ? "from-warning/15 to-warning/5" : "from-danger/15 to-danger/5";
              const isChained = Boolean(pdc.predecessor_process_id || activePdcs.some((o) => o.predecessor_process_id === pdc.id));
              const initials = TYPE_INITIALS[(pdc.process_type as ProcessType) ?? "compra"];
              const avatarBg = light === "green" ? "bg-success" : light === "yellow" ? "bg-warning" : "bg-danger";
              const typeLabel = PROCESS_TYPE_LABELS[(pdc.process_type as ProcessType) ?? "compra"];
              const StateIcon = light === "green" ? Check : light === "yellow" ? AlertTriangle : X;
              return (
                <div
                  key={pdc.id}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => navigate(`/pdcs/${pdc.id}`)}
                  className={`flex items-start gap-4 rounded-xl shadow-md border-l-4 ${borderColor} bg-gradient-to-br ${bgGradient} hover:bg-muted/50 hover:cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 p-4`}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`relative w-12 h-12 rounded-full flex flex-col items-center justify-center text-sm font-bold text-white shrink-0 ring-2 ring-white shadow-md ${avatarBg}`}
                          style={{ boxShadow: `0 4px 10px ${LIGHT_GLOW[light]}`, filter: "drop-shadow(0 2px 4px rgb(0 0 0 / 0.15))" }}
                          aria-label={`Tipo ${typeLabel}, semáforo ${light}`}
                        >
                          {initials}
                          <StateIcon className="w-3 h-3 mt-0.5" strokeWidth={2.5} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{typeLabel}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{pdc.pdc_number}</span>
                      <span className="text-foreground font-semibold text-sm truncate">{pdc.title}</span>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Estado:</span>
                      <StatusBadge status={pdc.current_status} colorizeByStage />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Criticidad:</span>
                      <CriticalityBadge level={pdc.criticality} />
                    </div>
                  </div>
                </div>
              );
            })}
            {!pdcsLoading && filteredPdcs.length === 0 && (
              <div className="py-8 text-center rounded-lg border bg-card">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <FileText className="w-6 h-6 opacity-40" />
                  <span className="text-sm">No hay procesos que coincidan con los filtros.</span>
                </div>
              </div>
            )}
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
                      <p className="text-sm font-medium">{humanizeTechnicalText(alert.message)}</p>
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
