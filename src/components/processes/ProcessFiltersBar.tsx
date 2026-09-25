import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { PROCESS_TYPES, PROCESS_TYPE_LABELS } from "@/lib/processTypes";
import { SortDirButton, type SortDir } from "@/lib/processSort";
import { cn } from "@/lib/utils";
import type { ProcessFiltersState } from "@/hooks/useProcessFilters";

interface Props {
  filters: ProcessFiltersState;
  sortDir: SortDir;
  onToggleSort: () => void;
  compact?: boolean;
}

export function ProcessFiltersBar({ filters: f, sortDir, onToggleSort, compact = false }: Props) {
  const trig = compact ? "h-7 text-xs font-normal" : "";
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={f.progressFilter === "overdue" ? "destructive" : "outline"}
          className={cn(compact && "h-7 text-xs", f.progressFilter === "overdue" ? "" : "border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive")}
          aria-pressed={f.progressFilter === "overdue"}
          onClick={() => f.setFilter("progress", f.progressFilter === "overdue" ? "all" : "overdue")}
        >
          Con atraso ({f.overdueCount})
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(compact && "h-7 text-xs", f.dueFilter === "15" ? "border-warning bg-warning/15 text-warning" : "border-warning/50 text-warning hover:bg-warning/10 hover:text-warning")}
          aria-pressed={f.dueFilter === "15"}
          onClick={() => f.setFilter("due", f.dueFilter === "15" ? "all" : "15")}
        >
          Vence en 15 días ({f.upcoming15Count})
        </Button>
      </div>
      <div className={cn("flex flex-col sm:flex-row sm:flex-wrap", compact ? "gap-2" : "gap-3")}>
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
          <Input placeholder="Buscar por número o título..." value={f.search} onChange={(e) => f.setFilter("q", e.target.value)} className={cn("pl-9", compact && "h-7 text-xs")} />
        </div>
        {f.showTypeFilter && <Select value={f.typeFilter} onValueChange={(value) => f.setFilter("type", value)}>
          <SelectTrigger className={cn("w-full sm:w-[190px]", trig)}><SelectValue placeholder="Tipo de proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {PROCESS_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{PROCESS_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>}
        <Select value={f.progressFilter} onValueChange={(value) => f.setFilter("progress", value)}>
          <SelectTrigger className={cn("w-full sm:w-[180px]", trig)}><SelectValue placeholder="Estado de avance" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="overdue">Con atraso</SelectItem>
            <SelectItem value="in_progress">En curso</SelectItem>
            <SelectItem value="not_started">Por iniciar</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={f.dueFilter} onValueChange={(value) => f.setFilter("due", value)}>
          <SelectTrigger className={cn("w-full sm:w-[160px]", trig)}><SelectValue placeholder="Vence pronto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier fecha</SelectItem>
            <SelectItem value="7">7 días</SelectItem>
            <SelectItem value="15">15 días</SelectItem>
            <SelectItem value="30">30 días</SelectItem>
          </SelectContent>
        </Select>
        <Select value={f.entityFilter} onValueChange={(value) => f.setFilter("entity", value)}>
          <SelectTrigger className={cn("w-full sm:w-[190px]", trig)}><SelectValue placeholder="Organismo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los organismos</SelectItem>
            {f.organisms.map((organism) => <SelectItem key={organism} value={organism}>{organism}</SelectItem>)}
          </SelectContent>
        </Select>
        {f.showProjectFilter && <Select value={f.projectFilter} onValueChange={(value) => f.setFilter("project", value)}>
          <SelectTrigger className={cn("w-full sm:w-[190px]", trig)}><SelectValue placeholder="Proyecto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {f.projects.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            {f.hasNoProject && <SelectItem value="none">Sin proyecto</SelectItem>}
          </SelectContent>
        </Select>}
        <SortDirButton dir={sortDir} onToggle={onToggleSort} size={compact ? "sm" : "default"} />
        {f.hasActiveFilters && (
          <Button type="button" variant="ghost" size={compact ? "sm" : "default"} className={cn(compact && "h-7 text-xs")} onClick={f.clearFilters}>
            <X className={cn("mr-1.5", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
