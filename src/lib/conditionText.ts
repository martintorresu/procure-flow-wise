/** Traduce un condition_json a lenguaje simple (solo presentación; la evaluación vive en conditionEval). */
import { ALL_PROFILE_FIELDS, fieldLabel } from "@/lib/projectProfile";

const valueText = (field: string, v: unknown): string => {
  if (v === true) return "Sí";
  if (v === false) return "No";
  if (Array.isArray(v)) return v.map((x) => valueText(field, x)).join(" o ");
  const f = ALL_PROFILE_FIELDS.find((x) => x.key === field);
  const opt = f?.options?.find((o) => o.value === v);
  return opt ? opt.label : String(v);
};

const OPS: Record<string, string> = {
  eq: "es", neq: "no es", in: "es", not_in: "no es", gt: "mayor que", gte: "al menos", lt: "menor que", lte: "hasta",
};

export function conditionToText(c: unknown): string {
  if (!c || typeof c !== "object") return "—";
  const o = c as Record<string, unknown>;
  if (o.always === true) return "Siempre";
  if (o.review === true) return "Revisión manual";
  if (Array.isArray(o.all)) return o.all.map(conditionToText).join(" y ");
  if (Array.isArray(o.any)) return `(${o.any.map(conditionToText).join(" o ")})`;
  if (typeof o.field === "string") {
    const f = fieldLabel(o.field);
    const op = String(o.op);
    if (op === "is_empty") return `${f} sin dato`;
    if (op === "is_not_empty") return `${f} con dato`;
    if (op === "between" && Array.isArray(o.value)) return `${f} entre ${o.value[0]} y ${o.value[1]}`;
    return `${f} ${OPS[op] ?? op} ${valueText(o.field, o.value)}`;
  }
  return "—";
}
