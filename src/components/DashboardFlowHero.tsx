import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ClipboardList, Wrench, Check, Link2 } from "lucide-react";
import { GENERIC_STAGES, PROCESS_TYPE_LABELS, genericStageIndex, type ProcessType } from "@/lib/processTypes";
import { getTrafficLight } from "@/lib/trafficLight";
import type { Pdc, TrafficLight } from "@/types/pdc";

const STAGE_ICONS = [FileText, ClipboardList, Wrench, Check];
/** Posiciones de referencia de las 4 etapas dentro de una pista. */
const TRACK_POS = [12, 37, 62, 87];

const CHIP_COLOR: Record<TrafficLight, string> = {
  green: "#39FF14",
  yellow: "#FBBF24",
  red: "#F43F5E",
};

interface Props {
  pdcs: Pdc[];
}

function chipStyle(light: TrafficLight): React.CSSProperties {
  return {
    backgroundColor: CHIP_COLOR[light],
    boxShadow: `0 0 6px ${CHIP_COLOR[light]}`,
  };
}

export function DashboardFlowHero({ pdcs }: Props) {
  const [view, setView] = useState<"aggregate" | "byType">("aggregate");

  const chainedIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of pdcs) {
      if (p.predecessor_process_id) {
        set.add(p.id);
        set.add(p.predecessor_process_id);
      }
    }
    return set;
  }, [pdcs]);

  const buckets = useMemo(() => {
    const b: Pdc[][] = [[], [], [], []];
    for (const p of pdcs) b[genericStageIndex(p.current_stage)].push(p);
    return b;
  }, [pdcs]);

  const byType = useMemo(() => {
    const map = new Map<ProcessType, Pdc[]>();
    for (const p of pdcs) {
      const t = (p.process_type ?? "compra") as ProcessType;
      map.set(t, [...(map.get(t) ?? []), p]);
    }
    return Array.from(map.entries());
  }, [pdcs]);

  const Chip = ({ p }: { p: Pdc }) => (
    <Link
      to={`/pdcs/${p.id}`}
      title={`${p.pdc_number} — ${p.title}`}
      aria-label={`${p.pdc_number} — ${p.title}`}
      className="relative inline-flex h-3 w-3 items-center justify-center rounded-full transition-transform hover:scale-150"
      style={chipStyle(getTrafficLight(p))}
    >
      {chainedIds.has(p.id) && (
        <Link2 className="absolute -right-2 -top-2 h-2.5 w-2.5 text-white/90" aria-hidden />
      )}
    </Link>
  );

  return (
    <section
      className="relative overflow-hidden rounded-xl p-6 text-white"
      style={{ background: "var(--sidebar-gradient)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
      </div>

      <header className="relative mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Flujo de procesos activos</h2>
          <p className="text-xs text-white/70">{pdcs.length} procesos en curso</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/70">Vista:</span>
          <div className="inline-flex rounded-full border border-white/25 bg-white/10 p-0.5">
            {([["aggregate", "Agregada"], ["byType", "Por tipo"]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={`rounded-full px-3 py-1 transition-colors ${
                  view === key ? "bg-white/90 font-semibold text-slate-900" : "text-white/80 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {view === "aggregate" ? (
        <div className="relative grid grid-cols-4 gap-2">
          <div
            className="pointer-events-none absolute left-[12%] right-[12%] top-5 h-0.5 rounded-full"
            style={{ background: "linear-gradient(90deg, rgba(125,211,252,0.2), #7DD3FC, rgba(125,211,252,0.2))" }}
          />
          {GENERIC_STAGES.map((stage, i) => {
            const Icon = STAGE_ICONS[i];
            const items = buckets[i];
            return (
              <div key={stage.key} className="relative flex flex-col items-center gap-2 text-center">
                <div
                  className="z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-slate-900"
                  style={{
                    backgroundColor: "#7DD3FC",
                    borderColor: "#7DD3FC",
                    boxShadow: "0 0 12px rgba(125,211,252,0.8)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-white/80">{stage.label}</span>
                <span className="text-3xl font-bold leading-none">{items.length}</span>
                <div className="flex max-w-[140px] flex-wrap justify-center gap-1.5 pt-1">
                  {items.map((p) => <Chip key={p.id} p={p} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative space-y-3">
          {byType.length === 0 && <p className="text-sm text-white/70">Sin procesos activos.</p>}
          {byType.map(([type, items]) => (
            <div key={type} className="flex items-center gap-3">
              <div className="w-32 shrink-0">
                <p className="text-xs font-semibold">{PROCESS_TYPE_LABELS[type]}</p>
                <p className="text-[11px] text-white/60">{items.length} proceso{items.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="relative h-10 flex-1 rounded-full border border-white/15 bg-white/5">
                <div
                  className="pointer-events-none absolute left-[6%] right-[6%] top-1/2 h-0.5 -translate-y-1/2 rounded-full"
                  style={{ background: "linear-gradient(90deg, rgba(125,211,252,0.2), #7DD3FC, rgba(125,211,252,0.2))" }}
                />
                {items.map((p, i) => {
                  const pos = TRACK_POS[genericStageIndex(p.current_stage)];
                  return (
                    <div
                      key={p.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${pos}%`, top: `${30 + ((i % 3) * 20)}%` }}
                    >
                      <Chip p={p} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <div className="w-32 shrink-0" />
            <div className="relative h-4 flex-1">
              {GENERIC_STAGES.map((s, i) => (
                <span
                  key={s.key}
                  className="absolute -translate-x-1/2 text-[11px] text-white/70"
                  style={{ left: `${TRACK_POS[i]}%` }}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
