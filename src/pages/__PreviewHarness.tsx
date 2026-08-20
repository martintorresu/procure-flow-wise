import { DashboardFlowHero } from "@/components/DashboardFlowHero";
import { ProcessStepperZoom } from "@/components/ProcessStepperZoom";
import { FileText, Wrench, ClipboardList, FileSearch, Award, Truck, FlaskConical, Ship, Check, MapPin } from "lucide-react";
import type { Pdc } from "@/types/pdc";

const mk = (i: number, stage: string, type: Pdc["process_type"], days: number, pred?: string): Pdc => ({
  id: `p${i}`, pdc_number: `PC-2026-00${i}`, project: "Proyecto", title: `Proceso ${i}`,
  description: "", category: "", criticality: "medium", estimated_amount: 1000, currency: "USD",
  required_on_site_date: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
  current_status: "planning", current_owner: "Ana", created_at: "", updated_at: "",
  current_stage: stage, process_type: type, predecessor_process_id: pred ?? null,
});

const pdcs: Pdc[] = [
  mk(1, "ingenieria", "compra", 200), mk(2, "programacion", "compra", 100),
  mk(3, "cotizacion", "compra", 30, "p1"), mk(4, "recepcion", "compra", 300),
  mk(5, "ingenieria", "licitacion", 40), mk(6, "orden_compra", "contrato", 150),
  mk(7, "programacion", "permiso", 400),
];

const steps = [
  { key: "draft", label: "Borrador", icon: FileText },
  { key: "technical_definition", label: "Técnica", icon: Wrench },
  { key: "planning", label: "Planificación", icon: ClipboardList },
  { key: "quotation", label: "Cotización", icon: FileSearch },
  { key: "evaluation", label: "Evaluación", icon: FileSearch },
  { key: "awarded", label: "Adjudicación", icon: Award },
  { key: "po_issued", label: "OC / Vendor", icon: Truck },
  { key: "drawings", label: "Planos", icon: ClipboardList },
  { key: "fat", label: "FAT", icon: FlaskConical },
  { key: "shipping", label: "Logística", icon: Ship },
  { key: "arrived", label: "Arribado", icon: MapPin },
  { key: "closed", label: "Cerrado", icon: Check },
];

export default function PreviewHarness() {
  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <DashboardFlowHero pdcs={pdcs} />
      <div className="rounded-xl border p-6">
        <ProcessStepperZoom steps={steps} activeIndex={4} progress={{ real: 62, scheduled: 78 }} />
      </div>
    </div>
  );
}
