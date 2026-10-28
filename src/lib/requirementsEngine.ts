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
      out.set(code, { requirement_code: code, applicability: "review_required", rule_id: null, explanation: "Sin regla: requiere revisión.", conflict: false });
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
