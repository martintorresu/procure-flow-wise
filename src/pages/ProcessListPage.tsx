import { useProcesses } from "@/hooks/useProcesses";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Link2, X } from "lucide-react";
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
import { SortDirButton, sortByProcessNumber, useProcessSortDir, processNumberSuffix } from "@/lib/processSort";
import type { Process } from "@/types/process";
import type { StageSummary } from "@/hooks/useProcessStageSummaries";

type ProgressFilter = "all" | "overdue" | "in_progress" | "not_started" | "completed";
type DueFilter = "all" | "7" | "15" | "30";

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addLocalDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return localDateKey(next);
};

const formatShortDate = (date: string) => {
  const [, month, day] = date.split("-").map(Number);
  if (!month || !day) return date;
  const monthName = new Intl.DateTimeFormat("es-CL", { month: "short" })
    .format(new Date(2020, month - 1, day))
    .replace(".", "")
    .toLowerCase();
  return `${String(day).padStart(2, "0")}-${monthName}`;
};

function stageSignals(summary: StageSummary | undefined, today: string) {
  const stages = summary?.stages ?? [];
  const pending = stages.filter((stage) => stage.status !== "completed");
  const overdue = pending.filter((stage) => stage.plannedEnd && stage.plannedEnd < today);
  const upcoming15 = pending
    .filter((stage) => stage.plannedEnd && stage.plannedEnd >= today && stage.plannedEnd <= addLocalDays(new Date(), 15))
    .map((stage) => stage.plannedEnd as string)
    .sort();
  return { stages, pending, overdue, upcoming15 };
}

export default function ProcessListPage() {
  const navigate = useNavigate();
  const subscription = useTenantSubscription();
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const typeFilter = params.get("type") ?? "all";
  const progressFilter = (params.get("progress") ?? "all") as ProgressFilter;
  const dueFilter = (params.get("due") ?? "all") as DueFilter;
  const entityFilter = params.get("entity") ?? "all";
  const projectFilter = params.get("project") ?? "all";
  const { data: processes = [], isLoading: processesLoading } = useProcesses();
  const { data: summaries = {}, isLoading: summariesLoading } = useProcessStageSummaries();
  const { data: contingencies = [] } = useAllContingencies();
  const loading = processesLoading || summariesLoading;
  const today = localDateKey();
  const setFilter = (key: string, value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };
  const parallelParents = new Set(
    contingencies
      .filter((c) => c.status === "active" && c.execution_mode === "parallel_effort")
      .map((c) => c.parent_process_id),
  );

  const { dir: sortDir, toggle: toggleSort } = useProcessSortDir();
  const processTypes = new Set(processes.map((process) => process.process_type ?? "personalizado"));
  const showTypeFilter = processTypes.size > 1;
  const projects = Array.from(
    new Map(
      processes
        .filter((process) => process.project_id)
        .map((process) => [process.project_id as string, process.project_name]),
    ),
  ).sort((a, b) => a[1].localeCompare(b[1], "es"));
  const hasNoProject = processes.some((process) => !process.project_id);
  const showProjectFilter = projects.length > 1 || (projects.length > 0 && hasNoProject);
  const organisms = Array.from(new Set(
    Object.values(summaries).flatMap((summary) => summary.stages.map((stage) => stage.externalEntity).filter((value): value is string => Boolean(value))),
  )).sort((a, b) => a.localeCompare(b, "es"));

  const matchesFilters = (process: Process, omit?: "progress" | "due") => {
    const summary = summaries[process.id];
    const { stages, pending, overdue } = stageSignals(summary, today);
    if (typeFilter !== "all" && (process.process_type ?? "personalizado") !== typeFilter) return false;
    if (projectFilter !== "all" && (projectFilter === "none" ? process.project_id : process.project_id !== projectFilter)) return false;
    if (entityFilter !== "all" && !pending.some((stage) => stage.externalEntity === entityFilter)) return false;
    if (search && !process.title.toLowerCase().includes(search.toLowerCase()) && !process.process_number.toLowerCase().includes(search.toLowerCase())) return false;
    if (omit !== "progress" && progressFilter !== "all") {
      const matchesProgress =
        (progressFilter === "overdue" && overdue.length > 0) ||
        (progressFilter === "in_progress" && summary?.completed !== summary?.total && stages.some((stage) => stage.status === "in_progress" || stage.status === "completed")) ||
        (progressFilter === "not_started" && stages.length > 0 && stages.every((stage) => stage.status === "not_started")) ||
        (progressFilter === "completed" && stages.length > 0 && stages.every((stage) => stage.status === "completed"));
      if (!matchesProgress) return false;
    }
    if (omit !== "due" && dueFilter !== "all") {
      const limit = addLocalDays(new Date(), Number(dueFilter));
      if (!pending.some((stage) => stage.plannedEnd && stage.plannedEnd >= today && stage.plannedEnd <= limit)) return false;
    }
    return true;
  };

  const filtered = sortByProcessNumber(processes.filter((process) => matchesFilters(process)), sortDir);
  const overdueCount = processes.filter((process) => matchesFilters(process, "progress") && stageSignals(summaries[process.id], today).overdue.length > 0).length;
  const upcoming15Count = processes.filter((process) => matchesFilters(process, "due") && stageSignals(summaries[process.id], today).upcoming15.length > 0).length;
  const hasActiveFilters = Boolean(search || typeFilter !== "all" || progressFilter !== "all" || dueFilter !== "all" || entityFilter !== "all" || projectFilter !== "all");

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
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={progressFilter === "overdue" ? "destructive" : "outline"}
              className={progressFilter === "overdue" ? "" : "border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"}
              aria-pressed={progressFilter === "overdue"}
              onClick={() => setFilter("progress", progressFilter === "overdue" ? "all" : "overdue")}
            >
              Con atraso ({overdueCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={dueFilter === "15" ? "border-warning bg-warning/15 text-warning" : "border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"}
              aria-pressed={dueFilter === "15"}
              onClick={() => setFilter("due", dueFilter === "15" ? "all" : "15")}
            >
              Vence en 15 días ({upcoming15Count})
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por número o título..." value={search} onChange={(e) => setFilter("q", e.target.value)} className="pl-9" />
            </div>
            {showTypeFilter && <Select value={typeFilter} onValueChange={(value) => setFilter("type", value)}>
              <SelectTrigger className="w-full sm:w-[190px]"><SelectValue placeholder="Tipo de proceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {PROCESS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{PROCESS_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>}
            <Select value={progressFilter} onValueChange={(value) => setFilter("progress", value)}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Estado de avance" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="overdue">Con atraso</SelectItem>
                <SelectItem value="in_progress">En curso</SelectItem>
                <SelectItem value="not_started">Por iniciar</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dueFilter} onValueChange={(value) => setFilter("due", value)}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Vence pronto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier fecha</SelectItem>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="15">15 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={(value) => setFilter("entity", value)}>
              <SelectTrigger className="w-full sm:w-[190px]"><SelectValue placeholder="Organismo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los organismos</SelectItem>
                {organisms.map((organism) => <SelectItem key={organism} value={organism}>{organism}</SelectItem>)}
              </SelectContent>
            </Select>
            {showProjectFilter && <Select value={projectFilter} onValueChange={(value) => setFilter("project", value)}>
              <SelectTrigger className="w-full sm:w-[190px]"><SelectValue placeholder="Proyecto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {projects.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                {hasNoProject && <SelectItem value="none">Sin proyecto</SelectItem>}
              </SelectContent>
            </Select>}
            <SortDirButton dir={sortDir} onToggle={toggleSort} />
            {hasActiveFilters && (
              <Button type="button" variant="ghost" onClick={() => setParams({}, { replace: true })}>
                <X className="w-4 h-4 mr-1.5" />Limpiar filtros
              </Button>
            )}
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
              const type = (process.process_type as ProcessType) ?? "personalizado";
              const typeLabel = PROCESS_TYPE_LABELS[type];
              const summary = summaries[process.id];
              const { overdue, upcoming15 } = stageSignals(summary, today);
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
                          aria-label={`Proceso ${processNumberSuffix(process.process_number)} – ${process.title} · ${typeLabel}`}
                        >
                          {processNumberSuffix(process.process_number)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {`Proceso ${processNumberSuffix(process.process_number)} – ${process.title} · ${typeLabel}`}
                      </TooltipContent>
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
                      {overdue.length > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                          {overdue.length} {overdue.length === 1 ? "atrasada" : "atrasadas"}
                        </Badge>
                      )}
                      {upcoming15.length > 0 && (
                        <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning text-[10px]">
                          Vence {formatShortDate(upcoming15[0])}
                        </Badge>
                      )}
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
