import type { StepperStep } from "@/components/ProcessStepper";
import type { StageProgress } from "@/lib/stageProgress";

interface ProcessStepperZoomProps {
  steps: StepperStep[];
  activeIndex: number;
  /** Avance calculado desde purchase_milestones; si es null no se muestra el bloque. */
  progress?: StageProgress | null;
}

const WINDOW = 2;

/**
 * Vista "zoom" del flujo: 5 nodos alrededor de la etapa crítica.
 * Reutiliza los tokens visuales de ProcessStepper (verde neón / celeste),
 * y marca la etapa crítica en rojo (--danger): "requiere atención ahora".
 */
export function ProcessStepperZoom({ steps, activeIndex, progress }: ProcessStepperZoomProps) {
  const safeActive = Math.max(0, Math.min(steps.length - 1, activeIndex));
  const start = Math.max(0, safeActive - WINDOW);
  const end = Math.min(steps.length - 1, safeActive + WINDOW);
  const visible = steps.slice(start, end + 1);
  const hiddenBefore = start;
  const hiddenAfter = steps.length - 1 - end;

  return (
    <div className="flex items-start gap-3">
      {hiddenBefore > 0 && (
        <div className="shrink-0 self-center rounded-full border border-[#39FF14]/40 bg-[#39FF14]/10 px-3 py-1 text-[11px] text-muted-foreground">
          +{hiddenBefore} etapa{hiddenBefore > 1 ? "s" : ""} anterior{hiddenBefore > 1 ? "es" : ""}
        </div>
      )}

      <div
        className="relative grid flex-1 items-start pt-3 pb-1"
        style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}
      >
        {visible.map((s, i) => {
          const absolute = start + i;
          const Icon = s.icon;
          const isCritical = absolute === safeActive;
          const completed = absolute < safeActive;
          const showSegment = i < visible.length - 1;
          const nextCompleted = absolute + 1 <= safeActive;

          let circleStyle: React.CSSProperties;
          let circleClass: string;
          let size: string;

          if (isCritical) {
            size = "w-20 h-20";
            circleClass = "text-[hsl(var(--danger-foreground))] ring-8 ring-[hsl(var(--danger))]/20";
            circleStyle = {
              backgroundColor: "hsl(var(--danger))",
              borderColor: "hsl(var(--danger))",
              boxShadow: "0 0 16px hsl(var(--danger) / 0.8), 0 0 34px hsl(var(--danger) / 0.45)",
            };
          } else if (completed) {
            size = "w-10 h-10";
            circleClass = "text-black";
            circleStyle = {
              backgroundColor: "#39FF14",
              borderColor: "#39FF14",
              boxShadow: "0 0 12px #39FF14, 0 0 24px rgba(57,255,20,0.6)",
            };
          } else {
            size = "w-10 h-10";
            circleClass = "text-sky-700";
            circleStyle = {
              backgroundColor: "rgba(125,211,252,0.25)",
              borderColor: "#7DD3FC",
              boxShadow: "0 0 8px rgba(125,211,252,0.6)",
            };
          }

          const segmentStyle: React.CSSProperties = nextCompleted
            ? { backgroundColor: "#39FF14", boxShadow: "0 0 8px #39FF14" }
            : { backgroundColor: "#7DD3FC", boxShadow: "0 0 6px rgba(125,211,252,0.6)" };

          return (
            <div key={s.key} className="relative flex flex-col items-center gap-2">
              {showSegment && (
                <div
                  className="absolute h-1 rounded-full"
                  style={{ top: 40, left: "50%", width: "100%", ...segmentStyle }}
                />
              )}
              <div
                className={`${size} z-10 flex items-center justify-center rounded-full border-2 transition-all ${circleClass}`}
                style={{ ...circleStyle, marginTop: isCritical ? 0 : 20 }}
              >
                <Icon className={isCritical ? "w-8 h-8" : "w-4 h-4"} />
              </div>
              <span
                title={s.label}
                className={`z-10 w-full max-w-full truncate px-0.5 text-center text-[9px] md:text-[10px] leading-tight ${isCritical ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>

              {isCritical && progress && (
                <div className="z-10 text-center leading-tight">
                  <p className="text-xs font-bold text-danger">Avance real: {Math.round(progress.real)}%</p>
                  <p className="text-xs text-muted-foreground">Avance programado: {Math.round(progress.scheduled)}%</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hiddenAfter > 0 && (
        <div className="shrink-0 self-center rounded-full border border-[#7DD3FC]/50 bg-[#7DD3FC]/10 px-3 py-1 text-[11px] text-muted-foreground">
          +{hiddenAfter} etapa{hiddenAfter > 1 ? "s" : ""} siguiente{hiddenAfter > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
