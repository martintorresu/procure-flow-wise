import { useMemo } from "react";
import { STAGE_STATUS_META, type ProcessStage } from "@/hooks/useProcessStages";
import { formatDate } from "@/lib/stageLabels";

const DAY = 86_400_000;
const ms = (d: string | null) => (d ? new Date(`${d}T00:00:00`).getTime() : null);

type Bar = { left: number; width: number } | null;

function bar(start: number | null, end: number | null, min: number, span: number): Bar {
  if (start === null && end === null) return null;
  const s = start ?? end!;
  const e = Math.max(end ?? s, s);
  return { left: ((s - min) / span) * 100, width: Math.max(((e - s + DAY) / span) * 100, 1.5) };
}

/** Barra simple plan vs. real por etapa (Gantt liviano). Solo lectura. */
export function StageTimeline({ stages }: { stages: ProcessStage[] }) {
  const model = useMemo(() => {
    const rows = stages
      .map((s) => ({
        stage: s,
        ps: ms(s.planned_start),
        pe: ms(s.planned_end),
        as: ms(s.actual_start),
        ae: ms(s.actual_end),
      }))
      .filter((r) => r.ps || r.pe || r.as || r.ae);
    const points = rows.flatMap((r) => [r.ps, r.pe, r.as, r.ae].filter((v): v is number => v !== null));
    if (!points.length) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = Math.max(max - min + DAY, DAY);
    return { rows, min, span };
  }, [stages]);

  if (!model) return null;
  const todayLeft = ((Date.now() - model.min) / model.span) * 100;

  return (
    <div className="mb-4 rounded-lg border border-border p-3">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Plan vs. real</p>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-6 rounded-full bg-muted-foreground/40" aria-hidden /> Planificado
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-6 rounded-full bg-primary" aria-hidden /> Real
        </span>
      </div>
      <div className="space-y-2">
        {model.rows.map(({ stage, ps, pe, as, ae }) => {
          const plan = bar(ps, pe, model.min, model.span);
          const real = bar(as, ae, model.min, model.span);
          const overdue = pe !== null && pe < Date.now() && stage.status !== "completed";
          return (
            <div key={stage.id} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium" title={stage.name}>{stage.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {stage.planned_end ? `Plan: ${formatDate(stage.planned_end)}` : "Sin plan"}
                  {overdue ? " · atrasada" : ""}
                </p>
              </div>
              <div className="relative h-7 rounded bg-muted/50">
                {plan && (
                  <div
                    className="absolute top-1 h-2 rounded-full bg-muted-foreground/40"
                    style={{ left: `${plan.left}%`, width: `${plan.width}%` }}
                  />
                )}
                {real && (
                  <div
                    className={`absolute top-4 h-2 rounded-full ${overdue ? "bg-danger" : "bg-primary"}`}
                    style={{ left: `${real.left}%`, width: `${real.width}%` }}
                  />
                )}
                {todayLeft >= 0 && todayLeft <= 100 && (
                  <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${todayLeft}%` }} aria-hidden />
                )}
                <span className="sr-only">
                  {`${stage.name}: ${STAGE_STATUS_META[stage.status].label}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
