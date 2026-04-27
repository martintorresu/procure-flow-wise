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

  // Sección 2
  sectionHeader("2. Descripción y Alcance");
  const s2 = data.section_2 as Record<string, unknown>;
  kv("Objetivo", s2.objetivo);
  kv("Alcance del Suministro", s2.alcance);
  kv("Exclusiones", s2.exclusiones);

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

  // Sección 6
  sectionHeader("6. Observaciones");
  const s6 = data.section_6 as Record<string, unknown>;
  kv("Observaciones generales", s6.observaciones);
  kv("Riesgos identificados", s6.riesgos);

  doc.save(`ET_${pdcNumber ?? "form"}.pdf`);
}
