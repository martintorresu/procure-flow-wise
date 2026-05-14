import type { TrafficLight, Criticality, PdcStatus } from "@/types/pdc";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, AlertTriangle, X } from "lucide-react";

const TRAFFIC_LABELS: Record<TrafficLight, string> = {
  green: "En plazo (>120 días al sitio o cerrado OK)",
  yellow: "Advertencia (60–120 días al sitio)",
  red: "Riesgo (<60 días, alta criticidad <90 días, o cerrado con incidente)",
};

export function TrafficLightIndicator({ color, showIcon = true }: { color: TrafficLight; showIcon?: boolean }) {
  const styles = {
    green: "bg-success text-success-foreground",
    yellow: "bg-warning text-warning-foreground",
    red: "bg-danger text-danger-foreground animate-pulse-slow",
  };
  const Icon = color === "green" ? Check : color === "yellow" ? AlertTriangle : X;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={`Semáforo: ${TRAFFIC_LABELS[color]}`}
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0 ${styles[color]}`}
          >
            {showIcon && <Icon className="w-2.5 h-2.5" strokeWidth={3} aria-hidden />}
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

export function StatusBadge({ status }: { status: PdcStatus }) {
  const labels: Record<PdcStatus, string> = {
    draft: "Borrador", technical_definition: "Def. Técnica", planning: "Planificación",
    quotation: "Cotización", evaluation: "Evaluación", awarded: "Adjudicado",
    po_issued: "OC Emitida", drawings: "Planos", fat: "Prueba de Fábrica", shipping: "En Tránsito",
    arrived: "Arribado", closed: "Cerrado", closed_with_incident: "Cerrado c/Inc.",
  };

  const getColor = (s: PdcStatus) => {
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
