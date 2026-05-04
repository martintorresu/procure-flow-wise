import type { TrafficLight, Criticality, PdcStatus } from "@/types/pdc";

export function TrafficLightIndicator({ color }: { color: TrafficLight }) {
  const styles = {
    green: "bg-success",
    yellow: "bg-warning",
    red: "bg-danger animate-pulse-slow",
  };
  return (
    <span className={`inline-block w-3 h-3 rounded-full ${styles[color]}`} title={color} />
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
