import type { TrafficLight, Criticality, PdcStatus } from "@/types/pdc";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { genericStageIndex } from "@/lib/processTypes";

const TRAFFIC_LABELS: Record<TrafficLight, string> = {
  green: "En plazo (>120 días al sitio o cerrado OK)",
  yellow: "Advertencia (60–120 días al sitio)",
  red: "Riesgo (<60 días, alta criticidad <90 días, o cerrado con incidente)",
};

const STATUS_TO_GENERIC_STAGE: Record<PdcStatus, string> = {
  draft: "ingenieria",
  technical_definition: "ingenieria",
  planning: "ingenieria",
  quotation: "programacion",
  evaluation: "programacion",
  awarded: "ejecucion",
  po_issued: "ejecucion",
  drawings: "ejecucion",
  fat: "ejecucion",
  shipping: "ejecucion",
  arrived: "recepcion",
  closed: "recepcion",
  closed_with_incident: "recepcion",
};

export function TrafficLightIndicator({
  color,
  showIcon,
  size = "md",
}: {
  color: TrafficLight;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const housingClasses = {
    sm: "w-3.5 h-[30px] p-[3px] gap-[3px]",
    md: "w-4 h-[36px] p-1 gap-1",
    lg: "w-[18px] h-[42px] p-[5px] gap-[5px]",
  };
  const dotClasses = {
    sm: "w-[5px] h-[5px]",
    md: "w-[6px] h-[6px]",
    lg: "w-[7px] h-[7px]",
  };
  const glowVars: Record<TrafficLight, string> = {
    green: "hsl(var(--success))",
    yellow: "hsl(var(--warning))",
    red: "hsl(var(--danger))",
  };

  const lights: TrafficLight[] = ["green", "yellow", "red"];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={`Semáforo: ${TRAFFIC_LABELS[color]}`}
            className={`inline-flex flex-col items-center justify-between rounded-full shrink-0 bg-muted border border-border/50 ${housingClasses[size]}`}
          >
            {lights.map((light) => {
              const isActive = light === color;
              const activeClass =
                light === "green"
                  ? "bg-success"
                  : light === "yellow"
                    ? "bg-warning"
                    : "bg-danger";
              return (
                <span
                  key={light}
                  className={`rounded-full ${dotClasses[size]} ${
                    isActive
                      ? `${activeClass} ${light === "red" ? "animate-pulse-slow" : ""}`
                      : "bg-muted-foreground/20"
                  }`}
                  style={isActive ? { boxShadow: `0 0 6px ${glowVars[light]}` } : undefined}
                />
              );
            })}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {TRAFFIC_LABELS[color]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TrafficLightLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {(["green", "yellow", "red"] as const).map((c) => (
        <div key={c} className="flex items-center gap-1.5">
          <TrafficLightIndicator color={c} />
          <span>{TRAFFIC_LABELS[c]}</span>
        </div>
      ))}
    </div>
  );
}

export function CriticalityBadge({ level }: { level: Criticality }) {
  const styles = {
    low: "bg-success/15 text-success border-success/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    high: "bg-danger/15 text-danger border-danger/30",
  };
  const labels = { low: "Baja", medium: "Media", high: "Alta" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

export function StatusBadge({
  status,
  colorizeByStage = false,
}: {
  status: PdcStatus;
  colorizeByStage?: boolean;
}) {
  const labels: Record<PdcStatus, string> = {
    draft: "Borrador", technical_definition: "Def. Técnica", planning: "Planificación",
    quotation: "Cotización", evaluation: "Evaluación", awarded: "Adjudicado",
    po_issued: "OC Emitida", drawings: "Planos", fat: "Prueba de Fábrica", shipping: "En Tránsito",
    arrived: "Arribado", closed: "Cerrado", closed_with_incident: "Cerrado c/Inc.",
  };

  const getColor = (s: PdcStatus) => {
    if (colorizeByStage) {
      const stageIdx = genericStageIndex(STATUS_TO_GENERIC_STAGE[s]);
      switch (stageIdx) {
        case 0:
          return "bg-muted text-muted-foreground border border-border";
        case 1:
          return "bg-accent/15 text-accent border border-accent/30";
        case 3:
          return "bg-success/15 text-success border border-success/30";
        default:
          return "bg-primary/10 text-primary border border-primary/20";
      }
    }
    if (["draft", "technical_definition", "planning"].includes(s)) return "bg-muted text-muted-foreground";
    if (["quotation", "evaluation"].includes(s)) return "bg-accent/15 text-accent border border-accent/30";
    if (["awarded", "po_issued", "drawings"].includes(s)) return "bg-primary/10 text-primary border border-primary/20";
    if (["fat", "shipping"].includes(s)) return "bg-warning/15 text-warning border border-warning/30";
    if (s === "arrived" || s === "closed") return "bg-success/15 text-success border border-success/30";
    return "bg-danger/15 text-danger border border-danger/30";
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${getColor(status)}`}>
      {labels[status]}
    </span>
  );
}
