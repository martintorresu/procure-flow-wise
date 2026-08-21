/** Utilidades de parsing y matching de compromisos de reuniones. */

export type CommitmentPriority = "alta" | "media" | "baja";
export type CommitmentStatus = "pendiente" | "en_progreso" | "completado" | "cancelado";

export const COMMITMENT_STATUSES: { value: CommitmentStatus; label: string; className: string }[] = [
  { value: "pendiente", label: "Pendiente", className: "bg-warning/15 text-warning border-warning/40" },
  { value: "en_progreso", label: "En progreso", className: "bg-info/15 text-info border-info/40" },
  { value: "completado", label: "Completado", className: "bg-success/15 text-success border-success/40" },
  { value: "cancelado", label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
];

export const statusMeta = (status: string) =>
  COMMITMENT_STATUSES.find((s) => s.value === status) ?? COMMITMENT_STATUSES[0];

/** Minúsculas, sin tildes ni puntuación. */
export function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Acepta YYYY-MM-DD, DD/MM/YYYY, DD-MM-YY… Devuelve ISO (YYYY-MM-DD) o null. */
export function parseFlexibleDate(value?: string | null): string | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

const PRIORITY_WORDS: Record<string, CommitmentPriority> = {
  alta: "alta", high: "alta", urgente: "alta", critica: "alta",
  media: "media", medium: "media", normal: "media",
  baja: "baja", low: "baja",
};

export function parsePriority(value?: string | null): CommitmentPriority | null {
  if (!value) return null;
  return PRIORITY_WORDS[norm(value)] ?? null;
}

const PDC_REF = /\b((?:pdc|pc|ct|lt|pm)[-\s]?\d{4}[-\s]?\d{2,6})\b/i;

export interface ParsedCommitment {
  text: string;
  responsible: string;
  dueDate: string | null;
  priority: CommitmentPriority | null;
  pdcReference: string;
}

/**
 * Parsea el textarea manual. Formato flexible, uno por línea:
 *   - [Responsable] Compromiso | Fecha límite | Prioridad | PDC relacionado
 * Tolera viñetas/numeración, "Responsable:" en vez de corchetes, separadores
 * `|`, `;` o ` - `, y orden libre de fecha/prioridad/PDC.
 */
export function parseCommitmentsText(input: string): ParsedCommitment[] {
  const out: ParsedCommitment[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    // Ignorar encabezados de ayuda
    if (/^(formato|ejemplo)\b/i.test(line)) continue;
    line = line.replace(/^[-*•·]+\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
    if (!line) continue;

    let responsible = "";
    const bracket = line.match(/^\[([^\]]+)\]\s*/);
    if (bracket) {
      responsible = bracket[1].trim();
      line = line.slice(bracket[0].length).trim();
    } else {
      const prefixed = line.match(/^(responsable|resp)\s*:\s*([^|;]+?)\s*(?:[|;]|-\s)\s*/i);
      if (prefixed) {
        responsible = prefixed[2].trim();
        line = line.slice(prefixed[0].length).trim();
      }
    }

    const parts = line.split(/\s*[|;]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) continue;

    let text = parts[0];
    let dueDate: string | null = null;
    let priority: CommitmentPriority | null = null;
    let pdcReference = "";

    for (const part of parts.slice(1)) {
      const d = parseFlexibleDate(part);
      if (d && !dueDate) { dueDate = d; continue; }
      const p = parsePriority(part);
      if (p && !priority) { priority = p; continue; }
      const ref = part.match(PDC_REF);
      if (ref && !pdcReference) { pdcReference = ref[1].trim(); continue; }
      if (!pdcReference && /^[A-Za-z]{2,4}[-\s]?\d/.test(part)) { pdcReference = part; continue; }
      text += ` — ${part}`;
    }

    if (!pdcReference) {
      const inline = text.match(PDC_REF);
      if (inline) pdcReference = inline[1].trim();
    }
    if (!responsible) {
      const inlineResp = text.match(/\(([^)]{3,40})\)\s*$/);
      if (inlineResp) responsible = inlineResp[1].trim();
    }

    out.push({ text: text.trim(), responsible, dueDate, priority, pdcReference });
  }
  return out;
}

export interface MatchableUser { id: string; full_name: string | null; email: string }
export interface MatchableProcess { id: string; pdc_number: string; title?: string; name?: string }

/** Matching fuzzy de responsable contra usuarios del tenant. */
export function matchUser<T extends MatchableUser>(responsible: string, users: T[]): T | null {
  const target = norm(responsible);
  if (!target) return null;
  const exact = users.find((u) => norm(u.full_name ?? "") === target || norm(u.email) === target);
  if (exact) return exact;
  const local = users.find((u) => norm(u.email.split("@")[0]) === target);
  if (local) return local;
  const tokens = target.split(" ").filter((t) => t.length > 2);
  if (!tokens.length) return null;
  const scored = users
    .map((u) => {
      const hay = `${norm(u.full_name ?? "")} ${norm(u.email)}`;
      return { u, hits: tokens.filter((t) => hay.includes(t)).length };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  if (!scored.length) return null;
  if (scored.length > 1 && scored[1].hits === scored[0].hits) return null;
  return scored[0].hits >= Math.ceil(tokens.length / 2) ? scored[0].u : null;
}

/** Matching de referencia textual a un proceso existente. */
export function matchProcess<T extends MatchableProcess>(reference: string, procs: T[]): T | null {
  const flat = (s: string) => norm(s).replace(/\s/g, "");
  const target = flat(reference);
  if (!target) return null;
  const exact = procs.find((p) => flat(p.pdc_number) === target);
  if (exact) return exact;
  const partial = procs.filter(
    (p) => flat(p.pdc_number).includes(target) || target.includes(flat(p.pdc_number)),
  );
  if (partial.length === 1) return partial[0];
  const byName = procs.filter((p) => norm(p.title ?? p.name ?? "").includes(norm(reference)));
  if (byName.length === 1) return byName[0];
  return null;
}
