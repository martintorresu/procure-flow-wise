import { useEffect, useState } from "react";
import { getTrafficLight } from "@/lib/trafficLight";
import { usePdcs } from "@/hooks/usePdcs";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, CriticalityBadge } from "@/components/StatusIndicators";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, X, Check, AlertTriangle, Link2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/processTypes";
import { type TrafficLight } from "@/types/pdc";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenantSubscription } from "@/hooks/useTenantSubscription";
import { PLAN_LABELS, PROCESS_LIMIT_MESSAGE, usageLabel } from "@/lib/plans";


const TYPE_INITIALS: Record<ProcessType, string> = {
  compra: "Cp",
  licitacion: "Lt",
  contrato: "Ct",
  permiso: "Pm",
  personalizado: "Ps",
};

const LIGHT_GLOW: Record<TrafficLight, string> = {
  green: "hsl(var(--success))",
  yellow: "hsl(var(--warning))",
  red: "hsl(var(--danger))",
};

export default function PdcListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const subscription = useTenantSubscription();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [criticalityFilter, setCriticalityFilter] = useState<string>("all");
  const [delayedFilter, setDelayedFilter] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const { data: pdcs = [], isLoading: loading } = usePdcs();

  useEffect(() => {
    const criticality = searchParams.get("criticality");
    const delayed = searchParams.get("delayed");
    if (criticality === "low" || criticality === "medium" || criticality === "high") {
      setCriticalityFilter(criticality);
    }
    if (delayed === "true") {
      setDelayedFilter(true);
    }
  }, [searchParams]);

  const filtered = pdcs.filter((pdc) => {
    if (statusFilter !== "all" && pdc.current_status !== statusFilter) return false;
    if (criticalityFilter !== "all" && pdc.criticality !== criticalityFilter) return false;
    if (delayedFilter && getTrafficLight(pdc) !== "red") return false;
    if (search && !pdc.title.toLowerCase().includes(search.toLowerCase()) && !pdc.pdc_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clearDashboardFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("criticality");
    next.delete("delayed");
    setSearchParams(next, { replace: true });
    setCriticalityFilter("all");
    setDelayedFilter(false);
  };

  return (
    <div className="space-y-6">
      <SEO title="Procesos" description="Listado de procesos con filtros por estado, criticidad y semáforo." path="/pdcs" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Procesos</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Cargando…" : `${filtered.length} procesos encontrados`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {`Plan ${PLAN_LABELS[subscription.tier]} · ${usageLabel(subscription.usage.processes, subscription.limits.maxActiveProcesses, "procesos")}`}
          </Badge>
          {subscription.isAtProcessLimit ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button disabled>
                      <Plus className="w-4 h-4 mr-2" />Crear Proceso
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{PROCESS_LIMIT_MESSAGE}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Link to="/pdcs/new">
              <Button><Plus className="w-4 h-4 mr-2" />Crear Proceso</Button>
            </Link>
          )}
        </div>

      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por número o título..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="technical_definition">Def. Técnica</SelectItem>
                <SelectItem value="quotation">Cotización</SelectItem>
                <SelectItem value="po_issued">OC Emitida</SelectItem>
                <SelectItem value="fat">Prueba de Fábrica</SelectItem>
                <SelectItem value="shipping">En Tránsito</SelectItem>
              </SelectContent>
            </Select>
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Criticidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda criticidad</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {(criticalityFilter !== "all" || delayedFilter) && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {delayedFilter && criticalityFilter !== "all"
              ? "Mostrando procesos atrasados y críticos"
              : delayedFilter
              ? "Mostrando solo procesos atrasados"
              : "Mostrando solo procesos críticos"}
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={clearDashboardFilters}>
            <X className="w-3 h-3 mr-1" /> Quitar filtro
          </Button>
        </div>
      )}

      {/* List */}
      <Card>
        <CardContent className="p-0">
          <div role="list" aria-label="Procesos" className="flex flex-col">
            {loading && [0,1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b last:border-0 p-4">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <FileText className="w-8 h-8 opacity-40" />
                <p className="text-sm font-medium">Sin procesos</p>
                <p className="text-xs">Crea tu primer proceso con el botón "Crear Proceso".</p>
              </div>
            )}
            {!loading && filtered.map((pdc) => {
              const light = getTrafficLight(pdc);
              const borderColor = light === "green" ? "border-l-success" : light === "yellow" ? "border-l-warning" : "border-l-danger";
              const bgGradient = light === "green" ? "from-success/15 to-success/5" : light === "yellow" ? "from-warning/15 to-warning/5" : "from-danger/15 to-danger/5";
              const isChained = Boolean(pdc.predecessor_process_id || pdcs.some((o) => o.predecessor_process_id === pdc.id));
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
                  className={`flex items-center gap-4 border-b last:border-0 border-border/60 bg-gradient-to-br ${bgGradient} border-l-4 ${borderColor} hover:bg-muted/50 hover:cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 shadow-md p-4`}
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
                    <div className="text-xs text-muted-foreground truncate">
                      {pdc.project} · {pdc.current_owner}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={pdc.current_status} colorizeByStage />
                      <CriticalityBadge level={pdc.criticality} />
                      {pdc.paused_by_contingency && (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300">
                          ⏸️ Pausado por contingencia
                        </Badge>
                      )}
                      {parallelParents.has(pdc.id) && (
                        <Badge variant="outline" className="border-blue-500/50 text-blue-700 dark:text-blue-300">
                          🔀 Contingencia en paralelo
                        </Badge>
                      )}
                    </div>

                  </div>

                  <div className="hidden sm:block text-right shrink-0">
                    <div className="font-mono text-sm font-medium text-foreground">
                      {pdc.currency} {(pdc.estimated_amount ?? 0).toLocaleString("es-CL")}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Monto Est.</div>
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
