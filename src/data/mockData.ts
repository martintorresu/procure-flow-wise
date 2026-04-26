import type { Pdc, PdcMilestone, TechnicalSpec, Rfq, RfqSupplier, PurchaseOrder, FatEvent, LogisticsEvent, Alert, User } from "@/types/pdc";

export const mockUsers: User[] = [
  { id: "u1", name: "Carlos Mendoza", email: "carlos@procurement.cl", role: "admin", tenantSlug: "default" },
  { id: "u2", name: "María López", email: "maria@procurement.cl", role: "compras", tenantSlug: "default" },
  { id: "u3", name: "Juan Torres", email: "juan@procurement.cl", role: "ingenieria", tenantSlug: "acme" },
  { id: "u4", name: "Ana Ruiz", email: "ana@procurement.cl", role: "gerente", tenantSlug: "codelco" },
  { id: "u5", name: "Pedro Silva", email: "pedro@procurement.cl", role: "planificacion", tenantSlug: "default" },
  { id: "u6", name: "Lucia Vargas", email: "lucia@procurement.cl", role: "logistica", tenantSlug: "default" },
];

export const mockPdcs: Pdc[] = [
  {
    id: "pdc-1", pdc_number: "PDC-2026-001", project: "Planta Concentradora Fase II",
    title: "Bomba centrífuga 500HP", description: "Bomba centrífuga para circuito de molienda SAG",
    category: "Equipos Mecánicos", criticality: "high", estimated_amount: 285000, currency: "USD",
    required_on_site_date: "2026-08-15", current_status: "quotation", current_owner: "María López",
    created_at: "2026-01-10", updated_at: "2026-04-01",
  },
  {
    id: "pdc-2", pdc_number: "PDC-2026-002", project: "Ampliación Subestación Eléctrica",
    title: "Transformador de poder 110kV", description: "Transformador trifásico 110/23kV 40MVA",
    category: "Equipos Eléctricos", criticality: "high", estimated_amount: 1200000, currency: "USD",
    required_on_site_date: "2026-10-01", current_status: "fat", current_owner: "Juan Torres",
    selected_supplier: "ABB Chile", created_at: "2025-11-05", updated_at: "2026-03-28",
  },
  {
    id: "pdc-3", pdc_number: "PDC-2026-003", project: "Sistema de Relaves",
    title: "Válvulas de control 12\"", description: "Set de 24 válvulas de control para línea de relaves",
    category: "Válvulas", criticality: "medium", estimated_amount: 156000, currency: "USD",
    required_on_site_date: "2026-07-20", current_status: "po_issued", current_owner: "María López",
    selected_supplier: "Flowserve", created_at: "2025-12-15", updated_at: "2026-03-15",
  },
  {
    id: "pdc-4", pdc_number: "PDC-2026-004", project: "Planta Concentradora Fase II",
    title: "Instrumentación de campo", description: "Transmisores de presión, flujo y nivel para área molienda",
    category: "Instrumentación", criticality: "low", estimated_amount: 89000, currency: "USD",
    required_on_site_date: "2026-09-30", current_status: "technical_definition", current_owner: "Juan Torres",
    created_at: "2026-02-20", updated_at: "2026-03-30",
  },
  {
    id: "pdc-5", pdc_number: "PDC-2026-005", project: "Ampliación Subestación Eléctrica",
    title: "Cables de poder MT", description: "Cable XLPE 23kV 3x240mm2 para alimentadores",
    category: "Materiales Eléctricos", criticality: "medium", estimated_amount: 320000, currency: "USD",
    required_on_site_date: "2026-06-15", current_status: "shipping", current_owner: "Lucia Vargas",
    selected_supplier: "Nexans", created_at: "2025-10-20", updated_at: "2026-04-02",
  },
  {
    id: "pdc-6", pdc_number: "PDC-2026-006", project: "Sistema de Relaves",
    title: "Estructura metálica soporte", description: "Estructura para soporte de tuberías de relaves",
    category: "Estructuras", criticality: "low", estimated_amount: 45000, currency: "USD",
    required_on_site_date: "2026-12-01", current_status: "draft", current_owner: "Carlos Mendoza",
    created_at: "2026-04-01", updated_at: "2026-04-01",
  },
];

export const mockMilestones: PdcMilestone[] = [
  { id: "m1", pdc_id: "pdc-1", milestone_type: "Definición Técnica", planned_date: "2026-02-01", actual_date: "2026-02-05", deviation_days: 4, status: "completed" },
  { id: "m2", pdc_id: "pdc-1", milestone_type: "Envío RFQ", planned_date: "2026-03-01", actual_date: "2026-03-01", deviation_days: 0, status: "completed" },
  { id: "m3", pdc_id: "pdc-1", milestone_type: "Cierre Cotizaciones", planned_date: "2026-04-15", deviation_days: 0, status: "pending" },
  { id: "m4", pdc_id: "pdc-1", milestone_type: "Adjudicación", planned_date: "2026-04-30", deviation_days: 0, status: "pending" },
  { id: "m5", pdc_id: "pdc-1", milestone_type: "Emisión OC", planned_date: "2026-05-10", deviation_days: 0, status: "pending" },
  { id: "m6", pdc_id: "pdc-2", milestone_type: "FAT", planned_date: "2026-03-20", actual_date: "2026-03-25", deviation_days: 5, status: "completed" },
  { id: "m7", pdc_id: "pdc-2", milestone_type: "Despacho", planned_date: "2026-04-10", deviation_days: 0, status: "pending" },
  { id: "m8", pdc_id: "pdc-5", milestone_type: "Arribo Chile", planned_date: "2026-05-01", deviation_days: 0, status: "pending" },
];

export const mockTechnicalSpecs: TechnicalSpec[] = [
  { id: "ts1", pdc_id: "pdc-1", summary_description: "Bomba centrífuga horizontal, 500HP, carcasa partida, material A890 Gr 1B para servicio de pulpa.", has_studies: true, studies_available_date: "2026-01-25", validation_status: "validated" },
  { id: "ts2", pdc_id: "pdc-4", summary_description: "Transmisores inteligentes HART, rango de operación según datasheet adjunto.", has_studies: false, validation_status: "pending" },
];

export const mockRfqs: Rfq[] = [
  { id: "rfq1", pdc_id: "pdc-1", sent_date: "2026-03-01", close_date: "2026-04-15" },
];

export const mockRfqSuppliers: RfqSupplier[] = [
  { id: "rs1", rfq_id: "rfq1", supplier_name: "Weir Minerals", quoted_amount: 275000, lead_time_days: 120, technical_score: 92, commercial_score: 85, total_score: 89 },
  { id: "rs2", rfq_id: "rfq1", supplier_name: "Metso Outotec", quoted_amount: 295000, lead_time_days: 100, technical_score: 95, commercial_score: 78, total_score: 87 },
  { id: "rs3", rfq_id: "rfq1", supplier_name: "KSB Chile", quoted_amount: 260000, lead_time_days: 140, technical_score: 80, commercial_score: 90, total_score: 85 },
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  { id: "po1", pdc_id: "pdc-3", po_number: "OC-2026-0045", issue_date: "2026-02-28", accepted_date: "2026-03-05", amount: 156000 },
];

export const mockFatEvents: FatEvent[] = [
  { id: "fat1", pdc_id: "pdc-2", scheduled_date: "2026-03-20", executed_date: "2026-03-25", result: "passed", report_received: true },
];

export const mockLogisticsEvents: LogisticsEvent[] = [
  { id: "log1", pdc_id: "pdc-5", exwork_date: "2026-03-15", shipped_date: "2026-03-20", damages_reported: false },
];

export const mockAlerts: Alert[] = [
  { id: "a1", pdc_id: "pdc-2", type: "milestone_deviation", severity: "high", message: "FAT ejecutado con 5 días de retraso respecto a fecha planificada", resolved: false, created_at: "2026-03-25" },
  { id: "a2", pdc_id: "pdc-1", type: "milestone_upcoming", severity: "medium", message: "Cierre de cotizaciones en 8 días - verificar respuestas de proveedores", due_date: "2026-04-15", resolved: false, created_at: "2026-04-07" },
  { id: "a3", pdc_id: "pdc-5", type: "logistics", severity: "low", message: "Embarque confirmado, en tránsito hacia Chile", resolved: false, created_at: "2026-03-20" },
  { id: "a4", pdc_id: "pdc-4", type: "technical", severity: "medium", message: "Especificación técnica pendiente de validación por ingeniería", resolved: false, created_at: "2026-04-01" },
  { id: "a5", pdc_id: "pdc-3", type: "vendor", severity: "critical", message: "Proveedor no ha confirmado fecha de despacho - OC emitida hace 30 días", due_date: "2026-04-05", resolved: false, created_at: "2026-04-03" },
];

export function getTrafficLight(pdc: Pdc): "green" | "yellow" | "red" {
  const requiredDate = new Date(pdc.required_on_site_date);
  const today = new Date();
  const daysUntilRequired = Math.ceil((requiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (pdc.current_status === "closed") return "green";
  if (pdc.current_status === "closed_with_incident") return "red";
  if (pdc.criticality === "high" && daysUntilRequired < 90) return "red";
  if (daysUntilRequired < 60) return "red";
  if (daysUntilRequired < 120) return "yellow";
  return "green";
}
