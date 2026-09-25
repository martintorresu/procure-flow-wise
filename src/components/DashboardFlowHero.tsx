import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Process } from "@/types/process";
import type { StageSummaryMap } from "@/hooks/useProcessStageSummaries";

interface Props {
  processes: Process[];
  summaries: StageSummaryMap;
}

const NO_PROJECT = "__none__";

function tooltipLabel(p: Process) {
  const m = (p.process_number ?? "").match(/(\d+)$/);
  const num = m ? m[1].padStart(2, "0") : p.process_number;
  return `Proceso ${num} – ${p.title}`;
}

/** Distribución de procesos activos por proyecto, con su avance de etapas. */
export function DashboardFlowHero({ processes, summaries }: Props) {
  const chainedIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of processes) {
      if (p.predecessor_process_id) {
        set.add(p.id);
        set.add(p.predecessor_process_id);
      }
    }
    return set;
  }, [processes]);

  const byProject = useMemo(() => {
    const map = new Map<string, { name: string; list: Process[] }>();
    for (const p of processes) {
      const key = p.project_id ?? NO_PROJECT;
      const name = p.project_id && p.project_name && p.project_name !== "—" ? p.project_name : "Sin proyecto";
      const entry = map.get(key) ?? { name, list: [] };
      entry.list.push(p);
      map.set(key, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].list.length - a[1].list.length);
  }, [processes]);

  const avgPercent = (list: Process[]) => {
    const withStages = list.filter((p) => (summaries[p.id]?.total ?? 0) > 0);
    if (withStages.length === 0) return 0;
    return Math.round(
      withStages.reduce((acc, p) => acc + (summaries[p.id]?.percent ?? 0), 0) / withStages.length,
    );
  };

  return (
    <section
      className="relative overflow-hidden rounded-xl p-6 text-white"
      style={{ background: "var(--sidebar-gradient)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
      </div>

      <header className="relative mb-6">
        <h2 className="text-base font-semibold">Procesos activos por proyecto</h2>
        <p className="text-xs text-white/70">{processes.length} procesos en curso</p>
      </header>

      <TooltipProvider>
        {byProject.length === 0 ? (
          <p className="relative text-sm text-white/80">Aún no hay procesos activos.</p>
        ) : byProject.length === 1 ? (
          <div className="relative">
            <GroupCard name={byProject[0][1].name} list={byProject[0][1].list} chainedIds={chainedIds} avgPercent={avgPercent} />
          </div>
        ) : (
          <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {byProject.map(([key, g]) => (
              <GroupCard key={key} name={g.name} list={g.list} chainedIds={chainedIds} avgPercent={avgPercent} />
            ))}
          </div>
        )}
      </TooltipProvider>
    </section>
  );
}

interface GroupCardProps {
  name: string;
  list: Process[];
  chainedIds: Set<string>;
  avgPercent: (list: Process[]) => number;
}

function GroupCard({ name, list, chainedIds, avgPercent }: GroupCardProps) {
  const percent = avgPercent(list);
  const sorted = [...list].sort((a, b) =>
    (a.process_number ?? "").localeCompare(b.process_number ?? "", "es", { numeric: true }),
  );

  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-semibold">{name}</span>
        <span className="text-4xl font-bold leading-none">{list.length}</span>
      </div>
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white/90" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-white/80">Avance medio de etapas: {percent}%</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {sorted.slice(0, 8).map((p) => (
          <Tooltip key={p.id}>
            <TooltipTrigger asChild>
              <Link
                to={`/procesos/${p.id}`}
                aria-label={tooltipLabel(p)}
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 font-mono text-xs transition-colors hover:bg-white/30"
              >
                {p.process_number}
                {chainedIds.has(p.id) && <Link2 className="h-3 w-3" aria-hidden />}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{tooltipLabel(p)}</TooltipContent>
          </Tooltip>
        ))}
        {list.length > 8 && (
          <span className="text-xs text-white/70 self-center">+{list.length - 8} más</span>
        )}
      </div>
    </div>
  );
}
