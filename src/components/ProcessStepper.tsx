import type { LucideIcon } from "lucide-react";

export interface StepperStep {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface ProcessStepperProps {
  steps: StepperStep[];
  activeIndex: number;
  /** Tamaño compacto para tarjetas / listados. */
  compact?: boolean;
}

/**
 * Barra de etapas con el lenguaje visual del stepper de compra
 * (verde neón para completado/actual, celeste para pendiente).
 */
export function ProcessStepper({ steps, activeIndex, compact = false }: ProcessStepperProps) {
  const circle = compact ? "w-7 h-7" : "w-10 h-10";
  const iconSize = compact ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="relative pt-2 pb-1">
      <div
        className="relative grid items-start"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((s, i) => {
          const Icon = s.icon;
          const completed = i < activeIndex;
          const active = i === activeIndex;
          const nextCompleted = i + 1 <= activeIndex;
          const showSegment = i < steps.length - 1;

          let circleClass: string;
          let circleStyle: React.CSSProperties = {};
          if (completed || active) {
            circleClass = "text-black";
            circleStyle = {
              backgroundColor: "#39FF14",
              borderColor: "#39FF14",
              boxShadow: "0 0 12px #39FF14, 0 0 24px rgba(57,255,20,0.6)",
            };
          } else {
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
            <div key={s.key} className="flex flex-col items-center gap-2 relative min-w-0 px-0.5" title={s.label}>
              {showSegment && (
                <div
                  className="absolute h-1 rounded-full"
                  style={{ top: compact ? 13 : 20, left: "50%", width: "100%", ...segmentStyle }}
                />
              )}
              <div
                className={`${circle} rounded-full flex items-center justify-center border-2 z-10 transition-all ${circleClass} ${active ? "ring-4 ring-[#39FF14]/30" : ""}`}
                style={circleStyle}
              >
                <Icon className={iconSize} />
              </div>
              <span
                className={`hidden sm:block w-full max-w-full truncate text-[9px] md:text-[10px] text-center leading-tight z-10 ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
            </div>

          );
        })}
      </div>
    </div>
  );
}
