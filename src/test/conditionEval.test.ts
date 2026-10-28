import { describe, it, expect } from "vitest";
import { evaluateCondition, evaluateRule, validateCondition } from "@/lib/conditionEval";

const T11 = { all: [{ field: "project_type", op: "eq", value: "extension" }, { field: "area_m2", op: "gt", value: 100 }] };
const T12 = { all: [{ field: "project_type", op: "eq", value: "extension" }, { field: "area_m2", op: "lte", value: 100 }] };
const elecOrGas = { any: [{ field: "has_electric", op: "eq", value: true }, { field: "has_gas", op: "eq", value: true }] };

describe("evaluateCondition", () => {
  it("campo faltante → review_required, nunca exclusión", () => {
    const r = evaluateCondition({ field: "has_elevators", op: "eq", value: true }, {});
    expect(r.result).toBe("review_required");
    expect(r.missing).toEqual(["has_elevators"]);
  });

  it("all con un campo faltante y el resto cumplido → review_required", () => {
    expect(evaluateCondition(T11, { project_type: "extension" }).result).toBe("review_required");
  });

  it("all con una parte no cumplida → not_applicable aunque falte otro campo", () => {
    expect(evaluateCondition(T11, { project_type: "new_build" }).result).toBe("not_applicable");
  });

  it("any de has_electric / has_gas", () => {
    expect(evaluateCondition(elecOrGas, { has_electric: false, has_gas: true }).result).toBe("applicable");
    expect(evaluateCondition(elecOrGas, { has_electric: true }).result).toBe("applicable");
    expect(evaluateCondition(elecOrGas, { has_electric: false, has_gas: false }).result).toBe("not_applicable");
    expect(evaluateCondition(elecOrGas, { has_electric: false }).result).toBe("review_required");
  });

  it("area_m2 > 100 → T11; ≤ 100 → T12", () => {
    const big = { project_type: "extension", area_m2: 150 };
    const edge = { project_type: "extension", area_m2: 100 };
    expect(evaluateCondition(T11, big).result).toBe("applicable");
    expect(evaluateCondition(T12, big).result).toBe("not_applicable");
    expect(evaluateCondition(T11, edge).result).toBe("not_applicable");
    expect(evaluateCondition(T12, edge).result).toBe("applicable");
  });

  it("operadores in, not_in, neq, gte, lt, between, is_empty, is_not_empty", () => {
    const p = { project_type: "alteration", n: 5, name: "" };
    expect(evaluateCondition({ field: "project_type", op: "in", value: ["new_build", "alteration"] }, p).result).toBe("applicable");
    expect(evaluateCondition({ field: "project_type", op: "not_in", value: ["alteration"] }, p).result).toBe("not_applicable");
    expect(evaluateCondition({ field: "project_type", op: "neq", value: "new_build" }, p).result).toBe("applicable");
    expect(evaluateCondition({ field: "n", op: "gte", value: 5 }, p).result).toBe("applicable");
    expect(evaluateCondition({ field: "n", op: "lt", value: 5 }, p).result).toBe("not_applicable");
    expect(evaluateCondition({ field: "n", op: "between", value: [1, 5] }, p).result).toBe("applicable");
    expect(evaluateCondition({ field: "name", op: "is_empty" }, p).result).toBe("applicable");
    expect(evaluateCondition({ field: "name", op: "is_not_empty" }, p).result).toBe("not_applicable");
  });

  it("always y review", () => {
    expect(evaluateCondition({ always: true }, {}).result).toBe("applicable");
    expect(evaluateCondition({ review: true }, { x: 1 }).result).toBe("review_required");
  });
});

describe("evaluateRule", () => {
  it("acción requires_review siempre pide revisión", () => {
    expect(evaluateRule({ condition_json: { always: true }, action: "requires_review" }, {}).result).toBe("review_required");
  });
  it("acción exclude invierte, pero un campo faltante sigue en revisión", () => {
    const c = { field: "has_gas", op: "eq", value: true };
    expect(evaluateRule({ condition_json: c, action: "exclude" }, { has_gas: true }).result).toBe("not_applicable");
    expect(evaluateRule({ condition_json: c, action: "exclude" }, {}).result).toBe("review_required");
  });
});

describe("validateCondition", () => {
  it("rechaza operadores desconocidos y estructuras inválidas", () => {
    expect(validateCondition({ field: "x", op: "like", value: 1 })).toMatch(/operador/);
    expect(validateCondition({ all: [] })).toMatch(/no vacía/);
    expect(validateCondition({ field: "x", op: "in", value: 1 })).toMatch(/lista/);
    expect(validateCondition(T11)).toBeNull();
  });
});
