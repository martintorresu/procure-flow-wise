import { describe, it, expect } from "vitest";
import { evaluateRequirements, suggestProcesses, stageStats, isOverdue, matchFileToCode } from "@/lib/requirementsEngine";
import { effectiveProfile } from "@/lib/projectProfile";
import { nextStatuses } from "@/lib/requirementLabels";

describe("nivel 1: trámites", () => {
  const procs = [{ process_code: "T11", name: "Ampliación", default_flow_stage: "E3" }];
  const rules = [{ process_code: "T11", condition_json: { all: [{ field: "project_type", op: "eq", value: "extension" }, { field: "area_m2", op: "gt", value: 100 }] } }];
  it("sugiere T11 con ampliación > 100 m²", () => {
    expect(suggestProcesses(procs, rules, { project_type: "extension", area_m2: 150 })[0].result).toBe("applicable");
  });
  it("sin superficie queda en revisión, nunca excluido", () => {
    expect(suggestProcesses(procs, rules, { project_type: "extension" })[0].result).toBe("review_required");
  });
});

describe("nivel 2: requisitos", () => {
  it("gana la mayor prioridad y el conflicto deja el requisito en revisión", () => {
    const d = evaluateRequirements(["R1"], [
      { rule_id: "A", requirement_code: "R1", condition_json: { always: true }, action: "include", priority: 10 },
      { rule_id: "B", requirement_code: "R1", condition_json: { always: true }, action: "exclude", priority: 50 },
    ], {}).get("R1")!;
    expect(d.rule_id).toBe("B");
    expect(d.applicability).toBe("review_required");
  });
  it("requires_review siempre queda en revisión", () => {
    const d = evaluateRequirements(["R2"], [{ rule_id: "C", requirement_code: "R2", condition_json: { always: true }, action: "requires_review", priority: 1 }], {}).get("R2")!;
    expect(d.applicability).toBe("review_required");
  });
});

describe("perfil", () => {
  it("requires_cip y pays_municipal_fees valen true por defecto", () => {
    const p = effectiveProfile({});
    expect(p.requires_cip).toBe(true);
    expect(p.pays_municipal_fees).toBe(true);
  });
  it("con nombre de ITO, has_ito se responde solo", () => {
    expect(effectiveProfile({ ito_name: "Juan" }).has_ito).toBe(true);
  });
});

describe("avance por etapa", () => {
  it("avance = conformes ÷ (total − no aplica)", () => {
    const s = stageStats([
      { flow_stage_id: "e", applicability: "applicable", status: "compliant" },
      { flow_stage_id: "e", applicability: "applicable", status: "pending" },
      { flow_stage_id: "e", applicability: "not_applicable", status: null },
    ], 1, 0);
    expect(s.progress).toBe(50);
    expect(s.state).toBe("open");
  });
  it("lista para gate y aprobada", () => {
    const items = [{ flow_stage_id: "e", applicability: "applicable" as const, status: "compliant" as const }];
    expect(stageStats(items, 1, 0).state).toBe("ready");
    expect(stageStats(items, 1, 1).state).toBe("approved");
  });
});

describe("indicadores", () => {
  it("vencido: fecha pasada y no conforme", () => {
    expect(isOverdue({ due_date: "2026-01-01", status: "pending", applicability: "applicable" }, "2026-02-01")).toBe(true);
    expect(isOverdue({ due_date: "2026-01-01", status: "compliant", applicability: "applicable" }, "2026-02-01")).toBe(false);
  });
  it("propone requisito por nombre de archivo", () => {
    expect(matchFileToCode("EL-024_TE1.pdf", ["EL-02", "EL-024"])).toBe("EL-024");
    expect(matchFileToCode("informe.pdf", ["EL-024"])).toBeNull();
  });
  it("solo un gestor puede reabrir un Conforme", () => {
    expect(nextStatuses("compliant", false)).toEqual([]);
    expect(nextStatuses("compliant", true)).toEqual(["observed"]);
  });
});

import { planGeneration } from "@/lib/requirementsEngine";
describe("generación de requisitos", () => {
  const base = {
    processCodes: ["T10"],
    requirements: [{ id: "1", requirement_code: "R1", process_code: "T10", requirement_name: "x", legal_reference: null, catalog_version: "2.0", evidence_required: null, evidence_pending: true, default_priority: null }],
    rules: [{ rule_id: "RULE-1", requirement_code: "R1", condition_json: { field: "has_gas", op: "eq", value: true }, action: "exclude", priority: 1, explanation: "Sin gas" }],
    municipal: [], processStage: new Map(), stageIdByCode: new Map(), docCount: new Map(),
  };
  it("exclude deja No aplica con justificación de la regla", () => {
    const r = planGeneration({ ...base, profile: { has_gas: true }, existing: [] }).inserts[0];
    expect(r.applicability).toBe("not_applicable");
    expect(r.justification).toBe("Excluido por regla RULE-1: Sin gas");
  });
  it("volver a generar no crea filas y no pisa requisitos con gestión", () => {
    const existing = [{ id: "a", origin_type: "legal", code: "R1", applicability: "review_required" as const, status: null, owner_user_id: null, owner_name: "Juan", justification: null, process_code: "T10" }];
    const p = planGeneration({ ...base, profile: { has_gas: true }, existing });
    expect(p.inserts).toHaveLength(0);
    expect(p.changes[0].locked).toBe(true);
  });
});
