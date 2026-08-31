/** Generación del acta de minuta como documento imprimible (Guardar como PDF). */

import type { LLMAnalysis } from "@/lib/analyzeTranscript";

export interface MinutaPdfData {
  title: string;
  meetingDate: string;
  createdBy: string;
  participants: Array<{ name: string; role?: string; email?: string; company?: string; isGuest: boolean }>;
  transcript: string;
  commitments: Array<{ text: string; responsible: string; dueDate: string | null; priority: string | null }>;
  qualityScore: number;
  llmAnalysis?: LLMAnalysis;
}

function esc(value?: string | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(data: MinutaPdfData): string {
  const participantRows = data.participants.length
    ? data.participants
        .map(
          (p) => `<tr>
            <td>${esc(p.name)}${p.isGuest ? " <em>(invitado)</em>" : ""}</td>
            <td>${esc(p.role || p.company || "—")}</td>
            <td>${esc(p.email || "—")}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="3">Sin participantes registrados.</td></tr>`;

  const commitmentRows = data.commitments.length
    ? data.commitments
        .map(
          (c, i) => `<tr>
            <td class="num">${i + 1}</td>
            <td>${esc(c.text)}</td>
            <td>${esc(c.responsible || "—")}</td>
            <td>${esc(c.dueDate || "—")}</td>
            <td>${esc(c.priority || "—")}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="5">Sin compromisos registrados.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Acta — ${esc(data.title)}</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; line-height: 1.5; margin: 0; padding: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 8px; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #444; padding-bottom: 4px; }
  .meta { font-size: 12px; color: #444; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f2f2f2; font-weight: bold; }
  td.num { width: 28px; text-align: center; }
  .transcript { white-space: pre-wrap; font-size: 12px; border: 1px solid #ccc; padding: 12px; }
  footer { margin-top: 32px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 11px; color: #666; display: flex; justify-content: space-between; }
  @media print { body { padding: 0; } .noprint { display: none; } }
</style>
</head>
<body>
  <h1>${esc(data.title)}</h1>
  <p class="meta">Fecha de la reunión: ${esc(data.meetingDate)}</p>
  <p class="meta">Registrada por: ${esc(data.createdBy)} · Calidad de minuta: ${data.qualityScore}%</p>

  <h2>Participantes</h2>
  <table>
    <thead><tr><th>Nombre</th><th>Cargo / Empresa</th><th>Correo</th></tr></thead>
    <tbody>${participantRows}</tbody>
  </table>

  <h2>Transcripción</h2>
  <div class="transcript">${esc(data.transcript) || "Sin transcripción."}</div>

  <h2>Compromisos</h2>
  <table>
    <thead><tr><th class="num">#</th><th>Compromiso</th><th>Responsable</th><th>Fecha límite</th><th>Prioridad</th></tr></thead>
    <tbody>${commitmentRows}</tbody>
  </table>

  <footer>
    <span>Pro·Curem Flow</span>
    <span>Generado el ${esc(new Date().toLocaleDateString("es-CL"))}</span>
  </footer>
  <script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 300); });</script>
</body>
</html>`;
}

/** Abre el acta en una ventana nueva y lanza el diálogo de impresión (Guardar como PDF). */
export function downloadMinutaPdf(data: MinutaPdfData): void {
  const html = buildHtml(data);
  const win = window.open("", "_blank");
  if (!win) {
    // Bloqueo de pop-ups: fallback a descarga del HTML imprimible
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acta-${data.title.replace(/[^\w\-]+/g, "-").toLowerCase() || "minuta"}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
