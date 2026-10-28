/**
 * Evaluador de condition_json del catálogo legal.
 *
 * Gramática:
 *   { "always": true }                      → aplica siempre
 *   { "review": true }                      → requiere revisión humana
 *   { "all": [cond, ...] }                  → todas deben cumplirse
 *   { "any": [cond, ...] }                  → basta una
 *   { "field": "x", "op": "eq", "value": v } → comparación sobre el perfil del proyecto
 *
 * Regla clave: si falta un campo que la condición necesita, el resultado es
 * "review_required", nunca exclusión.
 */

export type Outcome = "applicable" | "not_applicable" | "review_required";

export const CONDITION_OPS = [
  "eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "between", "is_empty", "is_not_empty",
] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

export type Condition =
  | { always: true }
  | { review: true }
  | { all: Condition[] }
  | { any: Condition[] }
  | { field: string; op: ConditionOp; value?: unknown };

export type Profile = Record<string, unknown>;

export interface EvalResult {
  result: Outcome;
  /** Campos del perfil que faltaban y forzaron revisión. */
  missing: string[];
}

const isEmpty = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

const toNum = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
};

const same = (a: unknown, b: unknown) => {
  if (a === b) return true;
  const na = toNum(a), nb = toNum(b);
  if (na !== null && nb !== null && typeof a !== "boolean" && typeof b !== "boolean") return na === nb;
  if (typeof a === "boolean" || typeof b === "boolean") return String(a) === String(b);
  return false;
};

function compare(op: ConditionOp, actual: unknown, expected: unknown): boolean | null {
  switch (op) {
    case "eq": return same(actual, expected);
    case "neq": return !same(actual, expected);
    case "in": return Array.isArray(expected) ? expected.some((e) => same(actual, e)) : null;
    case "not_in": return Array.isArray(expected) ? !expected.some((e) => same(actual, e)) : null;
    case "gt": case "gte": case "lt": case "lte": {
      const a = toNum(actual), e = toNum(expected);
      if (a === null || e === null) return null;
      return op === "gt" ? a > e : op === "gte" ? a >= e : op === "lt" ? a < e : a <= e;
    }
    case "between": {
      if (!Array.isArray(expected) || expected.length !== 2) return null;
      const a = toNum(actual), lo = toNum(expected[0]), hi = toNum(expected[1]);
      if (a === null || lo === null || hi === null) return null;
      return a >= lo && a <= hi;
    }
    default: return null;
  }
}

export function evaluateCondition(cond: unknown, profile: Profile): EvalResult {
  if (!cond || typeof cond !== "object" || Array.isArray(cond)) return { result: "review_required", missing: [] };
  const c = cond as Record<string, unknown>;

  if (c.always === true) return { result: "applicable", missing: [] };
  if (c.review === true) return { result: "review_required", missing: [] };

  if (Array.isArray(c.all) || Array.isArray(c.any)) {
    const isAll = Array.isArray(c.all);
    const parts = ((isAll ? c.all : c.any) as unknown[]).map((p) => evaluateCondition(p, profile));
    const missing = parts.flatMap((p) => p.missing);
    if (parts.length === 0) return { result: "review_required", missing };
    if (isAll) {
      if (parts.some((p) => p.result === "not_applicable")) return { result: "not_applicable", missing: [] };
      if (parts.some((p) => p.result === "review_required")) return { result: "review_required", missing };
      return { result: "applicable", missing: [] };
    }
    if (parts.some((p) => p.result === "applicable")) return { result: "applicable", missing: [] };
    if (parts.some((p) => p.result === "review_required")) return { result: "review_required", missing };
    return { result: "not_applicable", missing: [] };
  }

  if (typeof c.field === "string") {
    const op = c.op as ConditionOp;
    const actual = profile[c.field];
    if (op === "is_empty") return { result: isEmpty(actual) ? "applicable" : "not_applicable", missing: [] };
    if (op === "is_not_empty") return { result: isEmpty(actual) ? "not_applicable" : "applicable", missing: [] };
    if (isEmpty(actual)) return { result: "review_required", missing: [c.field] };
    const ok = compare(op, actual, c.value);
    if (ok === null) return { result: "review_required", missing: [] };
    return { result: ok ? "applicable" : "not_applicable", missing: [] };
  }

  return { result: "review_required", missing: [] };
}

/** Combina la condición de una regla con su acción. */
export function evaluateRule(
  rule: { condition_json: unknown; action: string },
  profile: Profile,
): EvalResult {
  if (rule.action === "requires_review") {
    return { result: "review_required", missing: evaluateCondition(rule.condition_json, profile).missing };
  }
  const r = evaluateCondition(rule.condition_json, profile);
  if (rule.action === "exclude" && r.result !== "review_required") {
    return { result: r.result === "applicable" ? "not_applicable" : "applicable", missing: [] };
  }
  return r;
}

/** Devuelve un mensaje de error en español o null si la condición es válida. */
export function validateCondition(cond: unknown, path = "condición"): string | null {
  if (!cond || typeof cond !== "object" || Array.isArray(cond)) return `${path}: debe ser un objeto JSON`;
  const c = cond as Record<string, unknown>;
  if ("always" in c) return c.always === true ? null : `${path}: "always" debe ser true`;
  if ("review" in c) return c.review === true ? null : `${path}: "review" debe ser true`;
  for (const k of ["all", "any"] as const) {
    if (k in c) {
      if (!Array.isArray(c[k]) || (c[k] as unknown[]).length === 0) return `${path}: "${k}" debe ser una lista no vacía`;
      for (const [i, p] of (c[k] as unknown[]).entries()) {
        const e = validateCondition(p, `${path}.${k}[${i}]`);
        if (e) return e;
      }
      return null;
    }
  }
  if (typeof c.field === "string" && c.field.trim()) {
    if (!(CONDITION_OPS as readonly string[]).includes(c.op as string)) return `${path}: operador desconocido "${String(c.op)}"`;
    const op = c.op as ConditionOp;
    if ((op === "in" || op === "not_in") && !Array.isArray(c.value)) return `${path}: "${op}" requiere una lista de valores`;
    if (op === "between" && !(Array.isArray(c.value) && c.value.length === 2)) return `${path}: "between" requiere [mínimo, máximo]`;
    if (["gt", "gte", "lt", "lte"].includes(op) && toNum(c.value) === null) return `${path}: "${op}" requiere un número`;
    if (op !== "is_empty" && op !== "is_not_empty" && !("value" in c)) return `${path}: falta "value"`;
    return null;
  }
  return `${path}: estructura no reconocida`;
}
