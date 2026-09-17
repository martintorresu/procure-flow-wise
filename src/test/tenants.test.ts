import { describe, it, expect } from "vitest";
import { resolveTenant } from "@/config/tenants";

describe("resolveTenant", () => {
  it("resuelve espacioluz desde dominio por cliente procurement.<slug>.inovahr-app.com", () => {
    expect(resolveTenant("/", "procurement.espacioluz.inovahr-app.com").slug).toBe("espacioluz");
  });

  it("resuelve espacioluz desde la ruta /t/espacioluz/login", () => {
    expect(resolveTenant("/t/espacioluz/login", "minuta-activa.lovable.app").slug).toBe("espacioluz");
  });

  it("devuelve default cuando el subdominio no existe en TENANTS", () => {
    expect(resolveTenant("/", "procurement.demo.inovahr-app.com").slug).toBe("default");
  });

  it("usa parts[0] como fallback en subdominios genéricos", () => {
    expect(resolveTenant("/", "espacioluz.algo.com").slug).toBe("espacioluz");
  });
});
