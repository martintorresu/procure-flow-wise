/**
 * Importador del catálogo legal compartido (Centro de carga).
 * Lógica pura + commit con el cliente que se le pase, para usarla igual
 * desde la pantalla y desde scripts de verificación.
 *
 * Idempotente: en tablas con versión solo crea una versión nueva cuando
 * (version_major, version_minor) de origen es mayor que la vigente; en tablas
 * sin versión, un código existente se omite.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateCondition } from "@/lib/conditionEval";

export type Cell = string | number | boolean | Date | null | undefined;
export type Grid = Cell[][];

export type CatalogKind =
  | "legal_processes"
  | "legal_requirements"
  | "sector_certificates"
  | "process_applicability_rules"
  | "applicability_rules";

export interface KindConfig {
  kind: CatalogKind;
  label: string;
  description: string;
  codeField: string;
  keyHeader: string;
  versioned: boolean;
  mainSheetHint?: string;
  adjust?: { label: string; sheetHint: string; keyHeader: string };
}

export const CATALOG_KINDS: KindConfig[] = [
  { kind: "legal_processes", label: "Trámites", description: "Hoja «Trámites V.3» del Excel de ajustes.", codeField: "process_code", keyHeader: "process_code", versioned: true, mainSheetHint: "Trámites V.3" },
  { kind: "legal_requirements", label: "Requisitos legales", description: "requirement_catalog.csv. Ajuste opcional: hoja «Evidencia T25».", codeField: "requirement_code", keyHeader: "requirement_code", versioned: true, adjust: { label: "Evidencias propuestas", sheetHint: "Evidencia T25", keyHeader: "requirement_code" } },
  { kind: "sector_certificates", label: "Certificados sectoriales", description: "sector_certificate_catalog.csv.", codeField: "certificate_id", keyHeader: "certificate_id", versioned: true },
  { kind: "process_applicability_rules", label: "Reglas de aplicabilidad de trámites", description: "Columna condition_json de la hoja «Trámites V.3».", codeField: "process_code", keyHeader: "process_code", versioned: true, mainSheetHint: "Trámites V.3" },
  { kind: "applicability_rules", label: "Reglas de aplicabilidad de requisitos", description: "applicability_rules.csv. Ajuste opcional: hoja «Reglas corregidas».", codeField: "rule_id", keyHeader: "rule_id", versioned: true, adjust: { label: "Reglas corregidas", sheetHint: "Reglas corregidas", keyHeader: "rule_id" } },
];

export const kindConfig = (k: CatalogKind) => CATALOG_KINDS.find((c) => c.kind === k)!;

export type RowRecord = Record<string, string>;
export interface ParsedRow {
  rowNumber: number;
  code: string;
  source: RowRecord;
  data: Record<string, unknown>;
  errors: string[];
}
export type PlanAction = "create" | "update" | "skip" | "error";
export interface PlannedRow extends ParsedRow { action: PlanAction; reason?: string }

const cellStr = (v: Cell) => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

/** Encuentra la fila de encabezados (la que contiene keyHeader) y devuelve los registros. */
export function gridToRecords(grid: Grid, keyHeader: string): { records: { rowNumber: number; rec: RowRecord }[]; error?: string } {
  const hIdx = grid.findIndex((r) => r.some((c) => cellStr(c) === keyHeader));
  if (hIdx < 0) return { records: [], error: `No se encontró la columna «${keyHeader}» en el archivo.` };
  const headers = grid[hIdx].map(cellStr);
  const records: { rowNumber: number; rec: RowRecord }[] = [];
  for (let i = hIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    if (!r || r.every((c) => cellStr(c) === "")) continue;
    const rec: RowRecord = {};
    headers.forEach((h, j) => { if (h) rec[h] = cellStr(r[j]); });
    records.push({ rowNumber: i + 1, rec });
  }
  return { records };
}

const findCol = (rec: RowRecord, prefix: string) => Object.keys(rec).find((k) => k.startsWith(prefix));
const nul = (s: string | undefined) => (s && s.trim() !== "" ? s.trim() : null);

function parseVersion(v: string, errors: string[]) {
  const m = /^(\d+)\.(\d+)$/.exec(v || "");
  if (!m) { errors.push(`Versión inválida «${v}» (se espera N.N)`); return { version_major: 0, version_minor: 0 }; }
  return { version_major: Number(m[1]), version_minor: Number(m[2]) };
}
function parseBool(v: string, field: string, errors: string[], dflt: boolean) {
  if (v === "") return dflt;
  if (/^(true|1|sí|si)$/i.test(v)) return true;
  if (/^(false|0|no)$/i.test(v)) return false;
  errors.push(`${field}: valor booleano inválido «${v}»`);
  return dflt;
}
function parseDate(v: string, field: string, errors: string[]) {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) { errors.push(`${field}: fecha inválida «${v}» (AAAA-MM-DD)`); return null; }
  return v;
}
function oneOf(v: string, field: string, allowed: string[], errors: string[]) {
  if (v && !allowed.includes(v)) errors.push(`${field}: valor «${v}» no permitido (${allowed.join(", ")})`);
  return nul(v);
}
function parseJson(v: string, errors: string[]): unknown {
  try { return JSON.parse(v); } catch { errors.push(`condition_json no es JSON válido`); return null; }
}

const OP_MAP: Record<string, string> = { equals: "eq", eq: "eq", not_equals: "neq", neq: "neq", in: "in", not_in: "not_in", gt: "gt", gte: "gte", lt: "lt", lte: "lte", between: "between", is_empty: "is_empty", is_not_empty: "is_not_empty" };
const ACTION_MAP: Record<string, string> = { include: "include", exclude: "exclude", requires_review: "requires_review", suggest: "requires_review", manual_review: "requires_review" };

function parseScalar(v: string): unknown {
  if (/^true$/i.test(v)) return true;
  if (/^false$/i.test(v)) return false;
  if (v !== "" && !Number.isNaN(Number(v))) return Number(v);
  if (v.startsWith("[")) { try { return JSON.parse(v); } catch { /* texto */ } }
  return v;
}

/** Versión opcional (catalog_version / version); sin columna se asume 2.0. */
function versionFields(rec: RowRecord, errors: string[]) {
  const v = rec.catalog_version || rec.version || "2.0";
  return {
    ...parseVersion(v, errors),
    effective_from: parseDate(rec.effective_from ?? "", "effective_from", errors),
    effective_to: parseDate(rec.effective_to ?? "", "effective_to", errors),
    catalog_status: "active",
  };
}

export interface BuildContext {
  /** Códigos de trámite conocidos (BD + mismo lote). */
  processCodes: Set<string>;
  /** Códigos de requisito conocidos (BD + mismo lote). */
  requirementCodes: Set<string>;
}

/** Convierte las filas del archivo (y del ajuste opcional) en registros listos para guardar. */
export function buildRows(kind: CatalogKind, main: Grid, adjust: Grid | null, ctx: BuildContext): { rows: ParsedRow[]; error?: string } {
  const cfg = kindConfig(kind);
  const parsed = gridToRecords(main, cfg.keyHeader);
  if (parsed.error) return { rows: [], error: parsed.error };

  let adjustMap = new Map<string, RowRecord>();
  if (adjust && cfg.adjust) {
    const a = gridToRecords(adjust, cfg.adjust.keyHeader);
    if (a.error) return { rows: [], error: `Archivo de ajustes: ${a.error}` };
    adjustMap = new Map(a.records.map((r) => [r.rec[cfg.adjust!.keyHeader], r.rec]));
  }

  const seen = new Map<string, number>();
  const rows: ParsedRow[] = parsed.records.map(({ rowNumber, rec }) => {
    const errors: string[] = [];
    const code = rec[cfg.codeField] ?? "";
    let data: Record<string, unknown> = {};

    switch (kind) {
      case "legal_processes": {
        if (!/^T\d{2}$/.test(code)) errors.push(`process_code inválido «${code}» (se espera T00)`);
        if (!rec.process_name) errors.push("Falta process_name");
        data = {
          process_code: code, name: rec.process_name, family: nul(rec.group_name),
          legal_nature: nul(rec.legal_nature), recipient: nul(rec.recipient), output_document: nul(rec.output_document),
          default_flow_stage: nul(rec.default_flow_stage), applicability_text: nul(rec.applicability),
          catalog_version: rec.catalog_version, ...parseVersion(rec.catalog_version, errors), catalog_status: "active",
        };
        break;
      }
      case "process_applicability_rules": {
        if (!/^T\d{2}$/.test(code)) errors.push(`process_code inválido «${code}»`);
        const col = findCol(rec, "condition_json");
        const raw = col ? rec[col] : "";
        if (!raw) errors.push("Falta condition_json");
        const cond = raw ? parseJson(raw, errors) : null;
        if (cond) { const e = validateCondition(cond); if (e) errors.push(e); }
        data = {
          process_code: code, condition_json: cond ?? {}, applicability: nul(rec.applicability),
          explanation: nul(rec.applicability), ...parseVersion(rec.catalog_version, errors), catalog_status: "active",
        };
        break;
      }
      case "legal_requirements": {
        if (!/^R\d{4}$/.test(code)) errors.push(`requirement_code inválido «${code}» (se espera R0000)`);
        if (!/^T\d{2}$/.test(rec.process_code ?? "")) errors.push(`process_code inválido «${rec.process_code}»`);
        else if (!ctx.processCodes.has(rec.process_code)) errors.push(`El trámite ${rec.process_code} no existe en el catálogo; cárguelo primero`);
        if (!rec.requirement_name) errors.push("Falta requirement_name");
        const adj = adjustMap.get(code);
        const proposed = adj ? (adj[findCol(adj, "evidencia propuesta") ?? ""] ?? "") : "";
        const useProposed = !!adj && /^propuesta/i.test(adj.estado ?? "") && proposed !== "";
        data = {
          requirement_code: code, process_code: rec.process_code, group_code: nul(rec.group_code), group_name: nul(rec.group_name),
          requirement_name: rec.requirement_name, legal_nature: nul(rec.legal_nature), applicability_text: nul(rec.applicability_text),
          requirement_level: oneOf(rec.requirement_level ?? "", "requirement_level", ["mandatory", "conditional", "posterior", "recommended"], errors),
          evidence_required: useProposed ? proposed : null,
          evidence_pending: !useProposed,
          issuer: nul(rec.issuer), legal_reference: nul(rec.legal_reference), recipient: nul(rec.recipient), output_document: nul(rec.output_document),
          source_document: nul(rec.source_document), source_version: nul(rec.source_version),
          effective_from: parseDate(rec.effective_from ?? "", "effective_from", errors), effective_to: parseDate(rec.effective_to ?? "", "effective_to", errors),
          catalog_status: oneOf(rec.catalog_status || "active", "catalog_status", ["active", "closed"], errors) ?? "active",
          catalog_version: rec.catalog_version, ...parseVersion(rec.catalog_version, errors),
          is_customizable: parseBool(rec.is_customizable ?? "", "is_customizable", errors, true),
          allows_override: parseBool(rec.allows_override ?? "", "allows_override", errors, true),
          default_priority: oneOf(rec.default_priority ?? "", "default_priority", ["high", "medium", "low"], errors),
          family: nul(rec.default_gate),
        };
        break;
      }
      case "sector_certificates": {
        if (!/^CERT-\d{3}$/.test(code)) errors.push(`certificate_id inválido «${code}» (se espera CERT-000)`);
        data = {
          certificate_id: code, codigo: nul(rec.codigo), especialidad: nul(rec.especialidad), antecedente: nul(rec.antecedente),
          etapa_asociada: nul(rec.etapa_asociada), emisor: nul(rec.emisor), documento_emitido: nul(rec.documento_emitido),
          base_normativa: nul(rec.base_normativa), condicion: nul(rec.condicion),
          ...versionFields(rec, errors),
        };
        break;
      }
      case "applicability_rules": {
        if (!/^RULE-\d{4}$/.test(code)) errors.push(`rule_id inválido «${code}» (se espera RULE-0000)`);
        const req = rec.requirement_code ?? "";
        if (!ctx.requirementCodes.has(req)) errors.push(`El requisito ${req || "(vacío)"} no existe en el catálogo; cárguelo primero`);
        const adj = adjustMap.get(code);
        let cond: unknown;
        let action: string;
        if (adj) {
          if (adj.requirement_code && adj.requirement_code !== req) errors.push(`La regla corregida apunta a ${adj.requirement_code} y el archivo a ${req}`);
          const condCol = findCol(adj, "condición propuesta");
          cond = parseJson(condCol ? adj[condCol] : "", errors);
          const actCol = findCol(adj, "acción propuesta");
          action = ACTION_MAP[(actCol ? adj[actCol] : "").trim()] ?? "";
          if (!action) errors.push(`Acción corregida desconocida «${actCol ? adj[actCol] : ""}»`);
        } else {
          const field = rec.field_name ?? "";
          const op = OP_MAP[rec.operator ?? ""];
          if (field === "always") cond = { always: true };
          else if (field === "manual_review") cond = { review: true };
          else if (!op) { errors.push(`Operador desconocido «${rec.operator}»`); cond = null; }
          else cond = { field, op, value: parseScalar(rec.comparison_value ?? "") };
          action = ACTION_MAP[rec.action ?? ""] ?? "";
          if (!action) errors.push(`Acción desconocida «${rec.action}»`);
          if (field === "manual_review") action = "requires_review";
        }
        if (cond) { const e = validateCondition(cond); if (e) errors.push(e); }
        const priority = Number(rec.priority || "100");
        if (!Number.isInteger(priority)) errors.push(`priority inválida «${rec.priority}»`);
        const review = action === "requires_review";
        data = {
          rule_id: code, requirement_code: req, rule_group: nul(rec.rule_group), condition_json: cond ?? {},
          action: action || "requires_review", priority: Number.isInteger(priority) ? priority : 100,
          explanation: nul(rec.explanation),
          human_validation_required: review ? true : adj ? false : parseBool(rec.human_validation_required ?? "", "human_validation_required", errors, false),
          active: parseBool(rec.active ?? "", "active", errors, true),
          ...versionFields(rec, errors),
        };
        break;
      }
    }

    if (code) {
      const prev = seen.get(code);
      if (prev !== undefined) errors.push(`Código duplicado en el archivo (ya aparece en la fila ${prev})`);
      else seen.set(code, rowNumber);
    }
    return { rowNumber, code, source: rec, data, errors };
  });
  return { rows };
}

export type ExistingIndex = Map<string, { major: number; minor: number }>;

/** Decide qué hacer con cada fila frente a lo que ya hay en la base. */
export function planRows(kind: CatalogKind, rows: ParsedRow[], existing: ExistingIndex): PlannedRow[] {
  const cfg = kindConfig(kind);
  return rows.map((r) => {
    if (r.errors.length) return { ...r, action: "error" };
    const ex = existing.get(r.code);
    if (!ex) return { ...r, action: "create" };
    if (!cfg.versioned) return { ...r, action: "skip", reason: "Ya existe" };
    const M = Number(r.data.version_major), m = Number(r.data.version_minor);
    if (M > ex.major || (M === ex.major && m > ex.minor)) return { ...r, action: "update", reason: `Nueva versión ${M}.${m} (vigente ${ex.major}.${ex.minor})` };
    return { ...r, action: "skip", reason: `Ya existe la versión ${ex.major}.${ex.minor}` };
  });
}

export function summarize(rows: PlannedRow[]) {
  return {
    created: rows.filter((r) => r.action === "create").length,
    updated: rows.filter((r) => r.action === "update").length,
    skipped: rows.filter((r) => r.action === "skip").length,
    errors: rows.filter((r) => r.action === "error").length,
  };
}

/* ------------------------------ Acceso a datos ------------------------------ */

type Client = SupabaseClient<any, any, any>;

export async function loadExisting(client: Client, kind: CatalogKind): Promise<ExistingIndex> {
  const cfg = kindConfig(kind);
  const cols = cfg.versioned ? `${cfg.codeField},version_major,version_minor` : cfg.codeField;
  // Certificados y reglas de requisitos se comparan contra su versión vigente
  const source = kind === "sector_certificates" || kind === "applicability_rules" ? `${kind}_current` : kind;
  const { data, error } = await client.from(source).select(cols).limit(10000);
  if (error) throw error;
  const idx: ExistingIndex = new Map();
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const code = String(row[cfg.codeField]);
    const major = Number(row.version_major ?? 0), minor = Number(row.version_minor ?? 0);
    const cur = idx.get(code);
    if (!cur || major > cur.major || (major === cur.major && minor > cur.minor)) idx.set(code, { major, minor });
  }
  return idx;
}

export async function loadContext(client: Client): Promise<BuildContext> {
  const [p, r] = await Promise.all([
    client.from("legal_processes").select("process_code").limit(10000),
    client.from("legal_requirements").select("requirement_code").limit(10000),
  ]);
  if (p.error) throw p.error;
  if (r.error) throw r.error;
  return {
    processCodes: new Set((p.data ?? []).map((x: { process_code: string }) => x.process_code)),
    requirementCodes: new Set((r.data ?? []).map((x: { requirement_code: string }) => x.requirement_code)),
  };
}

/** Análisis completo (sin guardar). */
export async function analyzeImport(client: Client, kind: CatalogKind, main: Grid, adjust: Grid | null) {
  const ctx = await loadContext(client);
  // Requisitos del mismo lote cuentan como conocidos para las reglas (y trámites para los requisitos)
  const built = buildRows(kind, main, adjust, ctx);
  if (built.error) return { error: built.error, rows: [] as PlannedRow[] };
  const existing = await loadExisting(client, kind);
  return { rows: planRows(kind, built.rows, existing) };
}

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Guarda lo planificado y registra el trabajo en import_jobs / import_rows. */
export async function commitImport(client: Client, kind: CatalogKind, fileName: string, rows: PlannedRow[]) {
  const cfg = kindConfig(kind);
  const sum = summarize(rows);
  const { data: job, error: jobErr } = await client
    .from("import_jobs")
    .insert({ kind: "legal_catalog", target_table: kind, file_name: fileName, status: "running", tenant_id: null })
    .select("id")
    .single();
  if (jobErr) throw jobErr;
  const jobId = (job as { id: string }).id;

  const results = new Map<number, { result: string; error: string | null }>();
  try {
    // Nuevas versiones: cerrar la versión vigente antes de publicar la nueva
    const updates = rows.filter((r) => r.action === "update");
    if (cfg.versioned && updates.length) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      for (const r of updates) {
        const { error } = await client.from(kind).update({ catalog_status: "closed", effective_to: yesterday })
          .eq(cfg.codeField, r.code).eq("catalog_status", "active");
        if (error) throw error;
      }
    }
    const toInsert = rows.filter((r) => r.action === "create" || r.action === "update");
    for (const part of chunk(toInsert, 100)) {
      const { error } = await client.from(kind).insert(part.map((r) => r.data));
      if (error) {
        // Reintento fila a fila para aislar el error
        for (const r of part) {
          const { error: e1 } = await client.from(kind).insert(r.data);
          results.set(r.rowNumber, e1 ? { result: "error", error: e1.message } : { result: r.action === "create" ? "created" : "updated", error: null });
        }
      } else part.forEach((r) => results.set(r.rowNumber, { result: r.action === "create" ? "created" : "updated", error: null }));
    }
  } catch (e) {
    await client.from("import_jobs").update({ status: "failed" }).eq("id", jobId);
    throw e;
  }

  const final = rows.map((r) => {
    const res = results.get(r.rowNumber);
    if (res) return { ...r, result: res.result, error: res.error };
    return { ...r, result: r.action === "error" ? "error" : "skipped", error: r.action === "error" ? r.errors.join("; ") : r.reason ?? null };
  });
  const counts = {
    created_count: final.filter((r) => r.result === "created").length,
    updated_count: final.filter((r) => r.result === "updated").length,
    skipped_count: final.filter((r) => r.result === "skipped").length,
    error_count: final.filter((r) => r.result === "error").length,
  };
  for (const part of chunk(final, 200)) {
    const { error } = await client.from("import_rows").insert(part.map((r) => ({
      job_id: jobId, tenant_id: null, row_number: r.rowNumber, record_code: r.code || null,
      data: r.source, result: r.result, error: r.error,
    })));
    if (error) throw error;
  }
  await client.from("import_jobs").update({ status: "completed", ...counts }).eq("id", jobId);
  void sum;
  return { jobId, ...counts };
}
