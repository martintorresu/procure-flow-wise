import { describe, it, expect } from "vitest";
import { buildZodSchema } from "@/lib/etSchemaBuilder";
import type { EtFieldSchema, EtFieldType } from "@/types/etForm";

/**
 * Replica la lógica de `validateCustomFields()` (EtFormPanel) para
 * secciones repetibles (5 y 7): valida cada ítem.custom_fields contra
 * el schema Zod construido a partir de los EtFieldSchema activos.
 *
 * Devuelve { [itemIdx]: { [field_key]: msg } } — vacío si todo OK.
 */
function validateRepeatableSection(
  fields: EtFieldSchema[],
  items: Array<Record<string, unknown>>,
): Record<number, Record<string, string>> {
  const active = fields.filter((f) => f.active && !f.is_system);
  const errors: Record<number, Record<string, string>> = {};
  if (active.length === 0) return errors;
  const schema = buildZodSchema(active);
  items.forEach((it, idx) => {
    const cf = (it.custom_fields as Record<string, unknown> | undefined) ?? {};
    const subset: Record<string, unknown> = {};
    active.forEach((f) => { subset[f.field_key] = cf[f.field_key]; });
    const res = schema.safeParse(subset);
    if (!res.success) {
      const errs: Record<string, string> = {};
      res.error.issues.forEach((iss) => {
        const key = String(iss.path[0] ?? "");
        if (key && !errs[key]) errs[key] = iss.message;
      });
      errors[idx] = errs;
    }
  });
  return errors;
}

const baseField = (
  overrides: Partial<EtFieldSchema> & {
    field_key: string;
    label: string;
    field_type: EtFieldType;
  },
): EtFieldSchema => ({
  id: overrides.field_key,
  tenant_id: "t1",
  section_number: 5,
  options: null,
  unit_options: null,
  placeholder: null,
  required: false,
  display_order: 0,
  active: true,
  is_system: false,
  ...overrides,
});

describe("validateCustomFields — secciones repetibles 5 y 7", () => {
  describe("Sección 5 (documentos)", () => {
    const fields: EtFieldSchema[] = [
      baseField({ field_key: "revision", label: "Revisión", field_type: "text", required: true, section_number: 5 }),
      baseField({ field_key: "paginas", label: "Páginas", field_type: "number", required: false, section_number: 5 }),
    ];

    it("retorna sin errores cuando todos los ítems tienen los required", () => {
      const items = [
        { nombre: "Plano", custom_fields: { revision: "A", paginas: 3 } },
        { nombre: "Memoria", custom_fields: { revision: "B" } },
      ];
      expect(validateRepeatableSection(fields, items)).toEqual({});
    });

    it("marca error en el ítem con required vacío", () => {
      const items = [
        { nombre: "Plano", custom_fields: { revision: "A" } },
        { nombre: "Memoria", custom_fields: { revision: "" } },
        { nombre: "Cálculo", custom_fields: {} },
      ];
      const errs = validateRepeatableSection(fields, items);
      expect(errs[0]).toBeUndefined();
      expect(errs[1]?.revision).toBeDefined();
      expect(errs[2]?.revision).toBeDefined();
    });

    it("marca error si custom_fields está ausente", () => {
      const items = [{ nombre: "Plano sin cf" }];
      const errs = validateRepeatableSection(fields, items);
      expect(errs[0]?.revision).toBeDefined();
    });

    it("rechaza tipo incorrecto en number (string no numérico)", () => {
      const numRequired: EtFieldSchema[] = [
        baseField({ field_key: "paginas", label: "Páginas", field_type: "number", required: true, section_number: 5 }),
      ];
      const items = [
        { nombre: "Plano", custom_fields: { paginas: "abc" } },
      ];
      const errs = validateRepeatableSection(numRequired, items);
      expect(errs[0]?.paginas).toBeDefined();
    });

    it("acepta number coercible desde string numérico", () => {
      const numRequired: EtFieldSchema[] = [
        baseField({ field_key: "paginas", label: "Páginas", field_type: "number", required: true, section_number: 5 }),
      ];
      const items = [{ nombre: "Plano", custom_fields: { paginas: "12" } }];
      expect(validateRepeatableSection(numRequired, items)).toEqual({});
    });

    it("ignora campos inactivos o is_system", () => {
      const mixed: EtFieldSchema[] = [
        baseField({ field_key: "revision", label: "Revisión", field_type: "text", required: true, active: false }),
        baseField({ field_key: "nombre", label: "Nombre", field_type: "text", required: true, is_system: true }),
      ];
      const items = [{ custom_fields: {} }];
      expect(validateRepeatableSection(mixed, items)).toEqual({});
    });
  });

  describe("Sección 7 (accesorios y repuestos)", () => {
    const fields: EtFieldSchema[] = [
      baseField({ field_key: "proveedor", label: "Proveedor", field_type: "text", required: true, section_number: 7 }),
      baseField({
        field_key: "categoria",
        label: "Categoría",
        field_type: "select",
        required: true,
        section_number: 7,
        options: ["A", "B"],
      }),
    ];

    it("retorna vacío sin ítems", () => {
      expect(validateRepeatableSection(fields, [])).toEqual({});
    });

    it("acumula errores múltiples por ítem", () => {
      const items = [
        { nombre: "Bushing", custom_fields: { proveedor: "ABB", categoria: "A" } },
        { nombre: "Tornillo", custom_fields: {} },
      ];
      const errs = validateRepeatableSection(fields, items);
      expect(errs[0]).toBeUndefined();
      expect(errs[1]?.proveedor).toBeDefined();
      expect(errs[1]?.categoria).toBeDefined();
    });

    it("rechaza unit_value sin unidad", () => {
      const uvFields: EtFieldSchema[] = [
        baseField({ field_key: "peso", label: "Peso", field_type: "unit_value", required: true, section_number: 7 }),
      ];
      const items = [
        { nombre: "Pieza", custom_fields: { peso: { value: 5, unit: "" } } },
      ];
      const errs = validateRepeatableSection(uvFields, items);
      expect(errs[0]?.peso).toBeDefined();
    });

    it("acepta unit_value bien formado", () => {
      const uvFields: EtFieldSchema[] = [
        baseField({ field_key: "peso", label: "Peso", field_type: "unit_value", required: true, section_number: 7 }),
      ];
      const items = [
        { nombre: "Pieza", custom_fields: { peso: { value: 5, unit: "kg" } } },
      ];
      expect(validateRepeatableSection(uvFields, items)).toEqual({});
    });

    it("opcional: no falla aunque el valor esté ausente", () => {
      const optFields: EtFieldSchema[] = [
        baseField({ field_key: "nota", label: "Nota", field_type: "text", required: false, section_number: 7 }),
      ];
      const items = [{ nombre: "X", custom_fields: {} }];
      expect(validateRepeatableSection(optFields, items)).toEqual({});
    });
  });
});
