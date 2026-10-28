/**
 * Motor de aplicabilidad en dos niveles (lógica pura).
 * Nivel 1: trámites sugeridos según el perfil (los confirma un gestor).
 * Nivel 2: requisitos, solo de los trámites confirmados.
 */
import { evaluateCondition, evaluateRule, type Outcome, type Profile } from "@/lib/conditionEval";
import type { ReqApplicability, ReqStatus } from "@/lib/requirementLabels";
import { fieldLabel } from "@/lib/projectProfile";

export interface ProcessRule { process_code: string; condition_json: unknown; explanation?: string | null }
export interface CatalogProcess { process_code: string; name: string; default_flow_stage: string | null; family?: string | null }

export interface ProcessSuggestion {
  process_code: string;
  name: string;
  result: Outcome;
  missing: string[];
  explanation: string;
}

export function suggestProcesses(processes: CatalogProcess[], rules: ProcessRule[], profile: Profile): ProcessSuggestion[] {
  const byCode = new Map(rules.map((r) => [r.process_code, r]));
  return processes.map((p) => {
    const rule = byCode.get(p.process_code);
    if (!rule) return { process_code: p.process_code, name: p.name, result: "review_required" as Outcome, missing: [], explanation: "Sin regla de aplicabilidad: requiere revisión." };
    const r = evaluateCondition(rule.condition_json, profile);
    const base = rule.explanation ?? "";
    const explanation =
      r.result === "review_required" && r.missing.length
        ? `Faltan datos del perfil: ${[...new Set(r.missing)].map(fieldLabel).join(", ")}.${base ? ` ${base}` : ""}`
        : base || (r.result === "applicable" ? "Cumple la condición del trámite." : "No cumple la condición del trámite.");
    return { process_code: p.process_code, name: p.name, result: r.result, missing: r.missing, explanation };
  });
}

export interface RequirementRule {
  rule_id: string;
  requirement_code: string;
  condition_json: unknown;
  action: string;
  priority: number;
  explanation?: string | null;
  active?: boolean;
}

export interface RequirementDecision {
  requirement_code: string;
  applicability: ReqApplicability;
  rule_id: string | null;
  explanation: string;
  conflict: boolean;
  missing: string[];
}

/**
 * Evalúa los requisitos. Gana la regla de mayor prioridad; si otra regla
 * activa entrega un resultado distinto, el requisito queda en revisión.
 */
export function evaluateRequirements(codes: string[], rules: RequirementRule[], profile: Profile): Map<string, RequirementDecision> {
  const byReq = new Map<string, RequirementRule[]>();
  for (const r of rules) {
    if (r.active === false) continue;
    byReq.set(r.requirement_code, [...(byReq.get(r.requirement_code) ?? []), r]);
  }
  const out = new Map<string, RequirementDecision>();
  for (const code of codes) {
    const list = (byReq.get(code) ?? []).sort((a, b) => b.priority - a.priority);
    if (!list.length) {
      out.set(code, { requirement_code: code, applicability: "review_required", rule_id: null, explanation: "Sin regla: requiere revisión.", conflict: false, missing: [] });
      continue;
    }
    const results = list.map((r) => ({ r, e: evaluateRule(r, profile) }));
    const top = results[0];
    const conflict = results.some((x) => x.e.result !== top.e.result);
    const missing = [...new Set(top.e.missing)];
    let explanation = top.r.explanation ?? "";
    if (missing.length) explanation = `Faltan datos del perfil: ${missing.map(fieldLabel).join(", ")}. ${explanation}`.trim();
    if (conflict) explanation = `Reglas en conflicto; gana ${top.r.rule_id}. ${explanation}`.trim();
    out.set(code, {
      requirement_code: code,
      applicability: conflict ? "review_required" : top.e.result,
      rule_id: top.r.rule_id,
      explanation,
      conflict,
      missing,
    });
  }
  return out;
}

/* ----------------------------- Avance por etapa ----------------------------- */

export interface StageItem {
  flow_stage_id: string | null;
  applicability: ReqApplicability;
  status: ReqStatus | null;
  requirement_level?: string | null;
}

export type StageState = "empty" | "open" | "ready" | "approved";

export interface StageStats {
  total: number;
  applicable: number;
  notApplicable: number;
  review: number;
  compliant: number;
  /** conformes ÷ (aplicables − no aplica), en %. */
  progress: number;
  state: StageState;
}

/**
 * Avance = conformes ÷ (total considerado − no aplica).
 * Lista para gate: todos los obligatorios están Conforme o No aplica (y no hay revisiones pendientes).
 * Aprobada: todos los gates de la etapa tienen revisión registrada.
 */
export function stageStats(items: StageItem[], gatesTotal: number, gatesApproved: number): StageStats {
  const total = items.length;
  const notApplicable = items.filter((i) => i.applicability === "not_applicable").length;
  const applicable = items.filter((i) => i.applicability === "applicable").length;
  const review = items.filter((i) => i.applicability === "review_required").length;
  const compliant = items.filter((i) => i.applicability === "applicable" && i.status === "compliant").length;
  const denom = total - notApplicable;
  const progress = denom > 0 ? Math.round((compliant / denom) * 100) : 0;
  const mandatory = items.filter((i) => !i.requirement_level || i.requirement_level === "mandatory");
  const allDone = mandatory.every((i) => i.applicability === "not_applicable" || (i.applicability === "applicable" && i.status === "compliant"));
  let state: StageState = "open";
  if (total === 0) state = "empty";
  else if (allDone && review === 0) state = gatesTotal > 0 && gatesApproved >= gatesTotal ? "approved" : "ready";
  return { total, applicable, notApplicable, review, compliant, progress, state };
}

export const STAGE_STATE_LABELS: Record<StageState, string> = {
  empty: "Sin requisitos",
  open: "Abierta",
  ready: "Lista para gate",
  approved: "Aprobada",
};

/** Indicador calculado: fecha comprometida pasada y no conforme. */
export function isOverdue(item: { due_date: string | null; status: ReqStatus | null; applicability: ReqApplicability }, today = new Date().toISOString().slice(0, 10)) {
  return item.applicability === "applicable" && !!item.due_date && item.due_date < today && item.status !== "compliant";
}

/** Si el nombre de archivo empieza con un código de requisito conocido, lo propone (ej. EL-024_TE1.pdf). */
export function matchFileToCode(fileName: string, codes: string[]): string | null {
  const upper = fileName.toUpperCase();
  const sorted = [...codes].sort((a, b) => b.length - a.length);
  for (const c of sorted) {
    const cu = c.toUpperCase();
    if (upper.startsWith(cu) && !/[A-Z0-9]/.test(upper.charAt(cu.length))) return c;
  }
  return null;
}

/** "E3 Permiso de edificación" → "E3". */
export const stageCodeOf = (s: string | null | undefined) => (s ? (/^E\d+/.exec(s.trim())?.[0] ?? null) : null);

/* ------------------------- Generación de requisitos ------------------------- */

export interface GenCatalogReq {
  id: string; requirement_code: string; process_code: string; requirement_name: string; legal_reference: string | null;
  catalog_version: string | null; evidence_required: string | null; evidence_pending: boolean; default_priority: string | null;
}
export interface GenMunicipalReq {
  id: string; code: string; name: string; process_code: string | null; flow_stage_code: string | null; source: string;
  evidence_required: string | null; mapping_status: string;
}
export interface GenExisting {
  id: string; origin_type: string; code: string; applicability: ReqApplicability; status: ReqStatus | null;
  owner_user_id: string | null; owner_name: string | null; justification: string | null; process_code: string | null;
}
export interface GenRow {
  origin_type: "legal" | "municipal"; origin_id: string; code: string; name: string; process_code: string | null;
  legal_reference: string | null; origin_version: string | null; evidence_required: string | null; evidence_pending: boolean;
  activation_mode: "rules"; rule_id: string | null; rule_explanation: string | null; mapping_status: string;
  applicability: ReqApplicability; justification: string | null; flow_stage_id: string | null; priority: string | null;
}
export interface GenChange { id: string; code: string; from: ReqApplicability; to: ReqApplicability; justification: string | null; rule_id: string | null; rule_explanation: string | null; locked: boolean; lockReason: string | null }

export const RULE_JUSTIFICATION_PREFIX = "Excluido por regla ";

/** ¿El requisito ya tiene gestión? (estado ≠ pendiente, responsable, documentos o justificación manual). */
export function managementLock(e: GenExisting, docCount: number): string | null {
  if (e.status && e.status !== "pending") return "tiene estado de gestión";
  if (e.owner_user_id || (e.owner_name ?? "").trim()) return "tiene responsable";
  if (docCount > 0) return "tiene documentos";
  if ((e.justification ?? "").trim() && !e.justification!.startsWith(RULE_JUSTIFICATION_PREFIX)) return "tiene justificación manual";
  return null;
}

export function planGeneration(args: {
  processCodes: string[];
  requirements: GenCatalogReq[];
  rules: RequirementRule[];
  municipal: GenMunicipalReq[];
  processStage: Map<string, string | null>; // process_code → flow_stage_id
  stageIdByCode: Map<string, string>;
  profile: Profile;
  existing: GenExisting[];
  docCount: Map<string, number>;
  label?: (field: string) => string;
}): { inserts: GenRow[]; changes: GenChange[] } {
  const label = args.label ?? ((f: string) => f);
  const codes = new Set(args.processCodes);
  const reqs = args.requirements.filter((r) => codes.has(r.process_code));
  const decisions = evaluateRequirements(reqs.map((r) => r.requirement_code), args.rules, args.profile);
  const existing = new Map(args.existing.map((e) => [`${e.origin_type}:${e.code}`, e]));
  const inserts: GenRow[] = [];
  const changes: GenChange[] = [];

  for (const r of reqs) {
    const d = decisions.get(r.requirement_code)!;
    const ruleText = d.explanation || "";
    const justification = d.applicability === "not_applicable" ? `${RULE_JUSTIFICATION_PREFIX}${d.rule_id ?? "—"}: ${ruleText || "sin explicación"}` : null;
    const ruleExpl = d.applicability === "review_required" && d.missing.length
      ? `Datos faltantes: ${d.missing.join(", ")} (${d.missing.map(label).join(", ")}). ${ruleText}`.trim()
      : ruleText;
    const ex = existing.get(`legal:${r.requirement_code}`);
    if (ex) {
      if (ex.applicability !== d.applicability) {
        const lock = managementLock(ex, args.docCount.get(ex.id) ?? 0);
        changes.push({ id: ex.id, code: ex.code, from: ex.applicability, to: d.applicability, justification, rule_id: d.rule_id, rule_explanation: ruleExpl, locked: !!lock, lockReason: lock });
      }
      continue;
    }
    inserts.push({
      origin_type: "legal", origin_id: r.id, code: r.requirement_code, name: r.requirement_name, process_code: r.process_code,
      legal_reference: r.legal_reference, origin_version: r.catalog_version, evidence_required: r.evidence_pending ? null : r.evidence_required,
      evidence_pending: r.evidence_pending, activation_mode: "rules", rule_id: d.rule_id, rule_explanation: ruleExpl,
      mapping_status: "linked", applicability: d.applicability, justification,
      flow_stage_id: args.processStage.get(r.process_code) ?? null, priority: r.default_priority,
    });
  }

  for (const m of args.municipal) {
    if (m.process_code && !codes.has(m.process_code)) continue;
    if (existing.has(`municipal:${m.code}`)) continue;
    const st = stageCodeOf(m.flow_stage_code);
    inserts.push({
      origin_type: "municipal", origin_id: m.id, code: m.code, name: m.name, process_code: m.process_code, legal_reference: m.source,
      origin_version: null, evidence_required: m.evidence_required, evidence_pending: !m.evidence_required, activation_mode: "rules",
      rule_id: null, rule_explanation: "Exigencia municipal de la comuna del proyecto.", mapping_status: m.mapping_status,
      applicability: "review_required", justification: null, flow_stage_id: st ? args.stageIdByCode.get(st) ?? null : null, priority: null,
    });
  }
  return { inserts, changes };
}

/** Un trámite solo se desactiva si ninguno de sus requisitos tiene gestión. */
export function deactivationBlockers(processCode: string, existing: GenExisting[], docCount: Map<string, number>) {
  return existing
    .filter((e) => e.process_code === processCode)
    .map((e) => ({ code: e.code, reason: managementLock(e, docCount.get(e.id) ?? 0) }))
    .filter((x): x is { code: string; reason: string } => !!x.reason && x.reason !== "tiene justificación manual");
}
