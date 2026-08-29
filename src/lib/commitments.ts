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
/** Devuelve la fecha ISO solo si es un calendario válido (rechaza 31/02, mes 13, etc.). */
function isoIfReal(yyyy: string, mm: string, dd: string): string | null {
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== parseInt(dd, 10)) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function parseFlexibleDate(value?: string | null): string | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return isoIfReal(m[1], m[2].padStart(2, "0"), m[3].padStart(2, "0"));
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return isoIfReal(yy, m[2].padStart(2, "0"), m[1].padStart(2, "0"));
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

const PROCESS_REF = /\b((?:process|pc|ct|lt|pm)[-\s]?\d{4}[-\s]?\d{2,6})\b/i;

export interface ParsedCommitment {
  text: string;
  responsible: string;
  dueDate: string | null;
  priority: CommitmentPriority | null;
  processReference: string;
}

/**
 * Parsea el textarea manual. Formato flexible, uno por línea:
 *   - [Responsable] Compromiso | Fecha límite | Prioridad | PROCESS relacionado
 * Tolera viñetas/numeración, "Responsable:" en vez de corchetes, separadores
 * `|`, `;` o ` - `, y orden libre de fecha/prioridad/PROCESS.
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
    let processReference = "";

    for (const part of parts.slice(1)) {
      const d = parseFlexibleDate(part);
      if (d && !dueDate) { dueDate = d; continue; }
      const p = parsePriority(part);
      if (p && !priority) { priority = p; continue; }
      const ref = part.match(PROCESS_REF);
      if (ref && !processReference) { processReference = ref[1].trim(); continue; }
      if (!processReference && /^[A-Za-z]{2,4}[-\s]?\d/.test(part)) { processReference = part; continue; }
      text += ` — ${part}`;
    }

    if (!processReference) {
      const inline = text.match(PROCESS_REF);
      if (inline) processReference = inline[1].trim();
    }
    if (!responsible) {
      const inlineResp = text.match(/\(([^)]{3,40})\)\s*$/);
      if (inlineResp) responsible = inlineResp[1].trim();
    }

    out.push({ text: text.trim(), responsible, dueDate, priority, processReference });
  }
  return out;
}

export interface MatchableUser { id: string; full_name: string | null; email: string }
export interface MatchableProcess { id: string; process_number: string; title?: string; name?: string }

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
  const exact = procs.find((p) => flat(p.process_number) === target);
  if (exact) return exact;
  const partial = procs.filter(
    (p) => flat(p.process_number).includes(target) || target.includes(flat(p.process_number)),
  );
  if (partial.length === 1) return partial[0];
  const byName = procs.filter((p) => norm(p.title ?? p.name ?? "").includes(norm(reference)));
  if (byName.length === 1) return byName[0];
  return null;
}

/* ------------------------------------------------------------------ */
/* Vencimientos                                                        */
/* ------------------------------------------------------------------ */

export interface DueMeta {
  days: number | null;
  overdue: boolean;
  label: string;
  className: string;
}

/** Días restantes / vencimiento respecto de hoy (fecha ISO YYYY-MM-DD). */
export function dueMeta(dueDate: string | null | undefined, status?: string): DueMeta {
  if (!dueDate) return { days: null, overdue: false, label: "Sin fecha", className: "text-muted-foreground" };
  const today = new Date();
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = dueDate.split("-").map(Number);
  if (!y || !m || !d) return { days: null, overdue: false, label: "Sin fecha", className: "text-muted-foreground" };
  const days = Math.round((Date.UTC(y, m - 1, d) - t) / 86_400_000);
  const closed = status === "completado" || status === "cancelado";
  if (closed) return { days, overdue: false, label: "Cerrado", className: "text-muted-foreground" };
  if (days < 0) return { days, overdue: true, label: `Vencido hace ${Math.abs(days)} d`, className: "text-danger" };
  if (days === 0) return { days, overdue: false, label: "Vence hoy", className: "text-danger" };
  if (days === 1) return { days, overdue: false, label: "Queda 1 día", className: "text-warning" };
  if (days <= 3) return { days, overdue: false, label: `Quedan ${days} días`, className: "text-warning" };
  return { days, overdue: false, label: `Quedan ${days} días`, className: "text-muted-foreground" };
}

/* ------------------------------------------------------------------ */
/* Parser de transcripción libre                                       */
/* ------------------------------------------------------------------ */

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const WEEKDAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Extrae una fecha de lenguaje natural: "25/08", "el 25 de agosto", "el viernes", "mañana". */
export function extractNaturalDate(sentence: string, today = new Date()): string | null {
  const s = norm(sentence);
  const explicit = sentence.match(/\b(\d{1,2}[/\-.]\d{1,2}(?:[/\-.]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})\b/);
  if (explicit) {
    const raw = explicit[1];
    const parsed = parseFlexibleDate(raw);
    if (parsed) return parsed;
    const dm = raw.match(/^(\d{1,2})[/\-.](\d{1,2})$/);
    if (dm) {
      const y = today.getFullYear();
      const cand = new Date(y, Number(dm[2]) - 1, Number(dm[1]));
      if (cand.getTime() < today.getTime() - 86_400_000) cand.setFullYear(y + 1);
      return iso(cand);
    }
  }
  const dm = s.match(/\b(\d{1,2})\s+de\s+([a-z]+)\b/);
  if (dm && MONTHS[dm[2]]) {
    const y = today.getFullYear();
    const cand = new Date(y, MONTHS[dm[2]] - 1, Number(dm[1]));
    if (cand.getTime() < today.getTime() - 86_400_000) cand.setFullYear(y + 1);
    return iso(cand);
  }
  if (/\bpasado manana\b/.test(s)) {
    const d = new Date(today); d.setDate(d.getDate() + 2); return iso(d);
  }
  if (/\bmanana\b/.test(s)) {
    const d = new Date(today); d.setDate(d.getDate() + 1); return iso(d);
  }
  if (/\bhoy\b/.test(s)) return iso(today);
  if (/\bproxima semana\b|\bsemana que viene\b/.test(s)) {
    const d = new Date(today); d.setDate(d.getDate() + 7); return iso(d);
  }
  const wd = s.match(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
  if (wd) {
    const target = WEEKDAYS[wd[1]];
    const d = new Date(today);
    let delta = (target - d.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    d.setDate(d.getDate() + delta);
    return iso(d);
  }
  return null;
}

const NAME = "[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2}";

const COMMIT_PATTERNS: RegExp[] = [
  new RegExp(`\\b(${NAME})\\s+(?:se\\s+compromete\\s+a|queda\\s+(?:de|en)|se\\s+encarga\\s+de|debe|deberá|tiene\\s+que|va\\s+a|enviará|entregará|coordinará|revisará|subirá|gestionará|confirmará|cotizará)\\b`, "u"),
  /\bresponsable\s*:\s*([^.,;\n]+)/iu,
  /\ba cargo de\s+([^.,;\n]+)/iu,
];

const TRIGGERS =
  /(se compromete|queda pendiente|queda de|queda en|se encarga|hay que|debe|debera|tiene que|va a enviar|se acuerda|acordamos|responsable|a cargo de|entregar|enviar|coordinar|revisar|cotizar|gestionar|confirmar|subir|reparar|corregir)/;

const PRIORITY_HINT = /(urgente|critic|prioridad alta|cuanto antes|inmediato)/;
const LOW_HINT = /(cuando se pueda|sin apuro|baja prioridad)/;

/* ------------------------------------------------------------------ */
/* Pre-segmentación de transcripciones sin puntuación                  */
/* ------------------------------------------------------------------ */

const PRESEGMENT_VERBS =
  "se\\s+compromete|debe|deberá|tiene\\s+que|va\\s+a|queda\\s+(?:de|en)|se\\s+encarga|" +
  "enviará|entregará|coordinará|revisará|gestionará|confirmará|cotizará|subirá|reparará|corregirá";

const PRESEGMENT_RE = new RegExp(`\\b(?:${NAME})\\s+(?:${PRESEGMENT_VERBS})\\b`, "u");

/**
 * La voz dictada (Web Speech API) llega sin puntuación ni saltos de línea.
 * Detecta el inicio de cada compromiso —nombre propio + verbo de compromiso—
 * e inserta un salto de línea antes de cada uno (salvo al inicio del texto),
 * para que parseTranscriptText pueda separarlos en chunks.
 */
export function presegmentTranscript(input: string): string {
  const re = new RegExp(PRESEGMENT_RE.source, PRESEGMENT_RE.flags + "g");
  let out = "";
  let last = 0;
  for (const m of input.matchAll(re)) {
    const idx = m.index ?? 0;
    out += input.slice(last, idx);
    if (idx > 0) out += "\n";
    last = idx;
  }
  return out + input.slice(last);
}

/**
 * Parser tolerante para transcripciones de reunión / notas de voz.
 * Detecta frases con verbos de compromiso, responsable, fecha y prioridad.
 */
export function parseTranscriptText(input: string, today = new Date()): ParsedCommitment[] {
  const out: ParsedCommitment[] = [];
  const chunks = presegmentTranscript(input)
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/u)
    .map((c) => c.replace(/^[-*•·\d.)\s]+/, "").trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const flat = norm(chunk);
    if (flat.length < 12) continue;
    if (!TRIGGERS.test(flat)) continue;

    let responsible = "";
    for (const re of COMMIT_PATTERNS) {
      const m = chunk.match(re);
      if (m?.[1]) { responsible = m[1].trim(); break; }
    }
    if (!responsible) {
      const pend = chunk.match(new RegExp(`queda\\s+pendiente\\s+que\\s+(${NAME})`, "u"));
      if (pend) responsible = pend[1].trim();
    }

    const dueDate = extractNaturalDate(chunk, today);
    const priority: CommitmentPriority | null = PRIORITY_HINT.test(flat)
      ? "alta"
      : LOW_HINT.test(flat)
        ? "baja"
        : null;

    const refMatch = chunk.match(PROCESS_REF);
    const processReference = refMatch ? refMatch[1].trim() : "";

    const text = chunk.replace(/\s+/g, " ").replace(/^[,;:\s]+/, "").trim();
    out.push({ text, responsible, dueDate, priority, processReference });
  }
  return out;
}
