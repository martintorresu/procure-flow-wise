import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import { PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/processTypes";
import type { Process } from "@/types/process";
import type { StageSummaryMap } from "@/hooks/useProcessStageSummaries";

interface Props {
  processes: Process[];
  summaries: StageSummaryMap;
}

/** Distribución de procesos activos por tipo, con su avance de etapas. */
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

  const byType = useMemo(() => {
    const map = new Map<ProcessType, Process[]>();
    for (const p of processes) {
      const t = (p.process_type ?? "personalizado") as ProcessType;
      map.set(t, [...(map.get(t) ?? []), p]);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
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
        <h2 className="text-base font-semibold">Procesos activos por tipo</h2>
        <p className="text-xs text-white/70">{processes.length} procesos en curso</p>
      </header>

      {byType.length === 0 ? (
        <p className="relative text-sm text-white/80">Aún no hay procesos activos.</p>
      ) : byType.length === 1 ? (
        <TypeCard type={byType[0][0]} list={byType[0][1]} summaries={summaries} chainedIds={chainedIds} avgPercent={avgPercent} />
      ) : (
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {byType.map(([type, list]) => (
            <TypeCard key={type} type={type} list={list} summaries={summaries} chainedIds={chainedIds} avgPercent={avgPercent} />
          ))}
        </div>
      )}
    </section>
  );
}

interface TypeCardProps {
  type: ProcessType;
  list: Process[];
  summaries: StageSummaryMap;
  chainedIds: Set<string>;
  avgPercent: (list: Process[]) => number;
}

function TypeCard({ type, list, summaries, chainedIds, avgPercent }: TypeCardProps) {
  const percent = avgPercent(list);
  const sorted = [...list].sort((a, b) =>
    (a.process_number ?? "").localeCompare(b.process_number ?? "", "es", { numeric: true }),
  );

  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-semibold">{PROCESS_TYPE_LABELS[type]}</span>
        <span className="text-4xl font-bold leading-none">{list.length}</span>
      </div>
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white/90" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-white/80">Avance medio de etapas: {percent}%</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {sorted.slice(0, 8).map((p) => (
          <Link
            key={p.id}
            to={`/procesos/${p.id}`}
            title={`${p.process_number} — ${p.title}`}
            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 font-mono text-xs transition-colors hover:bg-white/30"
          >
            {p.process_number}
            {chainedIds.has(p.id) && <Link2 className="h-3 w-3" aria-hidden />}
          </Link>
        ))}
        {list.length > 8 && (
          <span className="text-xs text-white/70 self-center">+{list.length - 8} más</span>
        )}
      </div>
    </div>
  );
}
