import { describe, it, expect } from "vitest";
import { validateRequirementFile } from "@/lib/requirementFiles";

describe("validateRequirementFile", () => {
  it("acepta DWG en mayúsculas", () => {
    expect(validateRequirementFile({ name: "Plano.DWG", size: 1000 })).toBeNull();
  });
  it("rechaza .exe", () => {
    expect(validateRequirementFile({ name: "virus.exe", size: 10 })).toMatch(/Formato no permitido/);
  });
  it("rechaza archivos de más de 25 MB", () => {
    expect(validateRequirementFile({ name: "a.pdf", size: 25 * 1024 * 1024 + 1 })).toMatch(/25 MB/);
  });
});
