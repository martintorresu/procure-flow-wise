import type { Pdc, TrafficLight } from "@/types/pdc";

/** Calcula el semáforo de un PdC según fecha requerida + criticidad + estado. */
export function getTrafficLight(pdc: Pdc): TrafficLight {
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
