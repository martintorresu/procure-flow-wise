import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAlerts } from "@/hooks/useAlerts";
import { usePdcs } from "@/hooks/usePdcs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Layers, CheckCircle2, ArrowRight, Bell, Link2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROCESS_TYPES, PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/processTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SEO } from "@/components/SEO";
import { humanizeTechnicalText } from "@/lib/stageLabels";
import { queryKeys } from "@/lib/queryKeys";
import { DashboardFlowHero } from "@/components/DashboardFlowHero";
import { DashboardCommitmentsWidget } from "@/components/DashboardCommitmentsWidget";
import { DashboardContingenciesWidget } from "@/components/DashboardContingenciesWidget";
import { DashboardMinutaWidget } from "@/components/DashboardMinutaWidget";
import { Badge } from "@/components/ui/badge";
import { useTenantSubscription } from "@/hooks/useTenantSubscription";
import { PLAN_LABELS, usageLabel } from "@/lib/plans";
import { useProcessStageSummaries } from "@/hooks/useProcessStageSummaries";
import { InProgressStagesText, StageProgressBadge } from "@/components/StageProgress";

const TYPE_INITIALS: Record<ProcessType, string> = {
  compra: "Cp",
  licitacion: "Lt",
  contrato: "Ct",
  permiso: "Pm",
  obra: "Ob",
  personalizado: "Ps",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: pdcs = [], isLoading: pdcsLoading } = usePdcs();
  const { data: summaries = {} } = useProcessStageSummaries();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const subscription = useTenantSubscription();

  useEffect(() => {
    qc.prefetchQuery({ queryKey: queryKeys.pdcs() });
  }, [qc]);

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const stagesInProgress = Object.values(summaries).reduce((acc, s) => acc + s.inProgress.length, 0);
  const finishedProcesses = pdcs.filter((p) => {
    const s = summaries[p.id];
    return s && s.total > 0 && s.completed === s.total;
  }).length;

  const [typeFilter, setTypeFilter] = useState<ProcessType | "all">("all");

  const filteredPdcs = pdcs.filter(
    (p) => typeFilter === "all" || (p.process_type ?? "compra") === typeFilter,
  );

  const stats = [
    { label: "Procesos", value: pdcs.length, icon: FileText, color: "text-accent", to: "/pdcs" },
    { label: "Etapas en curso", value: stagesInProgress, icon: Layers, color: "text-primary", to: "/pdcs" },
    { label: "Procesos completados", value: finishedProcesses, icon: CheckCircle2, color: "text-success", to: "/pdcs" },
    { label: "Alertas Pendientes", value: unresolvedAlerts.length, icon: TrendingUp, color: "text-warning", to: "/alerts" },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Panel de control" description="Resumen de procesos activos, avance por etapas y alertas pendientes." path="/" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bienvenido, {user?.name}</h1>
          <p className="text-sm text-muted-foreground">Resumen de procesos</p>
        </div>
        <Badge
          variant={subscription.tier === "pro" ? "default" : "secondary"}
          className={subscription.tier === "pro" ? "bg-blue-600 text-white hover:bg-blue-600" : ""}
        >
          {`Plan ${PLAN_LABELS[subscription.tier]} · ${usageLabel(subscription.usage.processes, subscription.limits.maxActiveProcesses, "procesos")}`}
        </Badge>
      </div>

      {/* Hero: procesos por tipo */}
      {!pdcsLoading && <DashboardFlowHero pdcs={pdcs} summaries={summaries} />}
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

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardMinutaWidget />
        <DashboardCommitmentsWidget />
        <DashboardContingenciesWidget />
      </div>

      {/* Procesos */}
      <Card className="overflow-hidden">
        <div className="h-1 w-full" style={{ background: "var(--sidebar-gradient)" }} />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Procesos
          </CardTitle>
          <Link to="/pdcs">
            <Button variant="ghost" size="sm" className="text-accent">
              Ver todos <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {/* Filtro */}
          <div className="flex flex-wrap items-center gap-4 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Tipo</span>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ProcessType | "all")}>
                <SelectTrigger className="h-7 text-xs font-normal w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {PROCESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{PROCESS_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List */}
          <div role="list" aria-label="Procesos" className="flex flex-col gap-2 mt-3">
            {pdcsLoading && [0,1,2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg shadow-sm border bg-card p-4">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
            {!pdcsLoading && filteredPdcs.map((pdc) => {
              const isChained = Boolean(pdc.predecessor_process_id || pdcs.some((o) => o.predecessor_process_id === pdc.id));
              const type = (pdc.process_type as ProcessType) ?? "compra";
              const summary = summaries[pdc.id];
              return (
                <div
                  key={pdc.id}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => navigate(`/pdcs/${pdc.id}`)}
                  className="flex items-start gap-4 rounded-xl border bg-card hover:bg-muted/50 hover:cursor-pointer transition-colors p-4"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-accent/15 text-accent"
                          aria-label={`Tipo ${PROCESS_TYPE_LABELS[type]}`}
                        >
                          {TYPE_INITIALS[type]}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{PROCESS_TYPE_LABELS[type]}</TooltipContent>
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
                    <div className="text-xs text-muted-foreground truncate">{pdc.project_name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StageProgressBadge summary={summary} />
                      <InProgressStagesText summary={summary} />
                    </div>
                  </div>
                </div>
              );
            })}
            {!pdcsLoading && filteredPdcs.length === 0 && (
              <div className="py-8 text-center rounded-lg border bg-card">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <FileText className="w-6 h-6 opacity-40" />
                  <span className="text-sm">No hay procesos que coincidan con el filtro.</span>
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
