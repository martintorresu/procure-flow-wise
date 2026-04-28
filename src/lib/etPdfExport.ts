import jsPDF from "jspdf";
import type { EtFormState } from "@/types/etForm";
import type { EtFieldDef } from "@/types/etForm";

interface ExportArgs {
  pdcNumber: string | null;
  status: string | null;
  completionPct: number;
  equipmentTypeName: string | null;
  schema: EtFieldDef[] | null;
  data: EtFormState;
}

/** Genera PDF del formulario ET y dispara descarga */
export function exportEtFormToPdf(args: ExportArgs): void {
  const { pdcNumber, status, completionPct, equipmentTypeName, schema, data } = args;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const lineHeight = 14;
  const newPageIfNeeded = (extra: number) => {
    if (y + extra > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 10);
    const wrapped = doc.splitTextToSize(text, pageWidth - margin * 2);
    wrapped.forEach((ln: string) => {
      newPageIfNeeded(lineHeight);
      doc.text(ln, margin, y);
      y += lineHeight;
    });
  };

  const sectionHeader = (title: string) => {
    y += 6;
    newPageIfNeeded(lineHeight + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setFillColor(230, 230, 240);
    doc.rect(margin, y - 11, pageWidth - margin * 2, lineHeight + 2, "F");
    doc.text(title, margin + 4, y);
    y += lineHeight + 4;
  };

  const kv = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === "") return;
    writeLine(`${k}: ${String(v)}`);
  };

  // Header
  writeLine("Formulario de Especificaciones Técnicas (ET)", { bold: true, size: 14 });
  writeLine(`PdC: ${pdcNumber ?? "—"}    Estado: ${status ?? "borrador"}    Completitud: ${completionPct}%`);
  writeLine(`Generado: ${new Date().toLocaleString()}`);
  y += 6;

  // Sección 1
  sectionHeader("1. Identificación");
  const s1 = data.section_1 as Record<string, unknown>;
  kv("Responsable Técnico", s1.responsable);
  kv("Fecha Solicitud", s1.fecha_solicitud);
  kv("TAG / Identificador", s1.tag_equipo);
  kv("Ubicación / Área", s1.ubicacion);
  kv("Objetivo", s1.objetivo);
  kv("Alcance del Suministro", s1.alcance);
  kv("Exclusiones", s1.exclusiones);

  // Sección 2 — Gestión de compra
  sectionHeader("2. Datos de Gestión de Compra");
  const s2 = data.section_2 as Record<string, unknown>;
  kv("Criticidad", s2.criticidad);
  kv("Área Solicitante", s2.area_solicitante);
  kv("Plazo de Entrega", s2.plazo_entrega);
  kv("Lugar de Entrega", s2.lugar_entrega);
  kv("Centro de Costo", s2.centro_costo);
  kv("Presupuesto Estimado (USD)", s2.presupuesto);
  kv("Justificación", s2.justificacion);

  // Sección 3
  sectionHeader("3. Especificaciones Técnicas");
  kv("Tipo de Equipo", equipmentTypeName);
  const items = data.section_3 as Record<string, unknown>[];
  items.forEach((it, idx) => {
    writeLine(`Equipo #${idx + 1}`, { bold: true });
    if (schema) {
      schema.forEach((f) => kv(f.label, it[f.key]));
    } else {
      Object.entries(it).forEach(([k, v]) => kv(k, v));
    }
    y += 4;
  });

  // Sección 4
  sectionHeader("4. Condiciones de Sitio");
  const s4 = data.section_4 as Record<string, unknown>;
  kv("Temperatura Ambiente (°C)", s4.temperatura_ambiente);
  kv("Altitud (msnm)", s4.altitud);
  kv("Humedad Relativa (%)", s4.humedad);
  kv("Sismicidad / Zona", s4.sismicidad);
  kv("Condiciones especiales", s4.condiciones);

  // Sección 5
  sectionHeader("5. Documentación Requerida");
  const docs = data.section_5 as Record<string, unknown>[];
  if (docs.length === 0) writeLine("(sin documentos)");
  docs.forEach((d, idx) => writeLine(`${idx + 1}. ${d.nombre ?? ""}`));

  // Sección 6 — FAT
  sectionHeader("6. Protocolo FAT");
  const s6 = data.section_6 as Record<string, unknown>;
  const tests = (s6.pruebas_seleccionadas as string[] | undefined) ?? [];
  kv("Pruebas seleccionadas", tests.length > 0 ? tests.join(", ") : null);
  kv("Lugar de FAT", s6.lugar_fat);
  kv("Asistencia del Cliente", s6.asistencia_cliente);
  kv("Criterios de Aceptación", s6.criterios_aceptacion);
  kv("Observaciones FAT", s6.observaciones_fat);

  // Sección 7 — Accesorios y repuestos
  sectionHeader("7. Accesorios y Repuestos");
  const accs = data.section_7 as Record<string, unknown>[];
  if (accs.length === 0) writeLine("(sin ítems)");
  accs.forEach((a, idx) =>
    writeLine(
      `${idx + 1}. [${a.tipo ?? "—"}] ${a.nombre ?? ""} — ${a.cantidad ?? ""} ${a.unidad ?? ""}`.trim(),
    ),
  );

  // Sección 8 — Condiciones comerciales
  sectionHeader("8. Condiciones Comerciales");
  const s8 = data.section_8 as Record<string, unknown>;
  kv("Garantía (meses)", s8.garantia_meses);
  kv("Plazo de Validez de Oferta", s8.plazo_validez_oferta);
  kv("Forma de Pago", s8.forma_pago);
  kv("Incoterm", s8.incoterm);
  kv("Multa por Atraso", s8.multa_atraso);
  kv("Moneda", s8.moneda);
  kv("Observaciones Generales", s8.observaciones);
  kv("Riesgos Identificados", s8.riesgos);

  doc.save(`ET_${pdcNumber ?? "form"}.pdf`);
}
