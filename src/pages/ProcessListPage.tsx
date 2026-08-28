import { useState } from "react";
import { useProcesses } from "@/hooks/useProcesses";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Link2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { useAllContingencies } from "@/hooks/useProcessContingencies";
import { PROCESS_TYPES, PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/processTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenantSubscription } from "@/hooks/useTenantSubscription";
import { PLAN_LABELS, PROCESS_LIMIT_MESSAGE, usageLabel } from "@/lib/plans";
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

export default function ProcessListPage() {
  const navigate = useNavigate();
  const subscription = useTenantSubscription();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: processes = [], isLoading: loading } = useProcesses();
  const { data: summaries = {} } = useProcessStageSummaries();
  const { data: contingencies = [] } = useAllContingencies();
  const parallelParents = new Set(
    contingencies
      .filter((c) => c.status === "active" && c.execution_mode === "parallel_effort")
      .map((c) => c.parent_process_id),
  );

  const filtered = processes.filter((process) => {
    if (typeFilter !== "all" && (process.process_type ?? "compra") !== typeFilter) return false;
    if (
      search &&
      !process.title.toLowerCase().includes(search.toLowerCase()) &&
      !process.process_number.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <SEO title="Procesos" description="Listado de procesos con su avance por etapas." path="/procesos" />
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
            <Link to="/procesos/new">
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Tipo de proceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {PROCESS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{PROCESS_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <FileText className="w-8 h-8 opacity-40" />
                <p className="text-sm font-medium">Sin procesos</p>
                <p className="text-xs">Crea tu primer proceso con el botón "Crear Proceso".</p>
              </div>
            )}
            {!loading && filtered.map((process) => {
              const isChained = Boolean(process.predecessor_process_id || processes.some((o) => o.predecessor_process_id === process.id));
              const type = (process.process_type as ProcessType) ?? "compra";
              const typeLabel = PROCESS_TYPE_LABELS[type];
              const summary = summaries[process.id];
              return (
                <div
                  key={process.id}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => navigate(`/procesos/${process.id}`)}
                  className="flex items-center gap-4 border-b last:border-0 border-border/60 hover:bg-muted/50 hover:cursor-pointer transition-colors p-4"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-accent/15 text-accent"
                          aria-label={`Tipo ${typeLabel}`}
                        >
                          {TYPE_INITIALS[type]}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{typeLabel}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{process.process_number}</span>
                      <span className="text-foreground font-semibold text-sm truncate">{process.title}</span>
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
                      {process.project_name} · {process.current_owner}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StageProgressBadge summary={summary} />
                      <InProgressStagesText summary={summary} />
                      {process.paused_by_contingency && (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300">
                          ⏸️ Pausado por contingencia
                        </Badge>
                      )}
                      {parallelParents.has(process.id) && (
                        <Badge variant="outline" className="border-blue-500/50 text-blue-700 dark:text-blue-300">
                          🔀 Contingencia en paralelo
                        </Badge>
                      )}
                    </div>
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
