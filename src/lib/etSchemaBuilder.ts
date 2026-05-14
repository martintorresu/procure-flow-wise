import { z } from "zod";
import type { EtFieldSchema } from "@/types/etForm";

/** Construye un schema Zod a partir de la definición dinámica de campos. */
export function buildZodSchema(fields: EtFieldSchema[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  for (const f of fields) {
    let s: z.ZodTypeAny;
    switch (f.field_type) {
      case "number":
        s = z.coerce.number();
        if (!f.required) s = s.optional().or(z.literal("").transform(() => undefined));
        break;
      case "boolean":
        s = z.boolean();
        if (!f.required) s = s.optional();
        break;
      case "date":
        s = z.string();
        if (f.required) s = (s as z.ZodString).min(1, "Requerido");
        else s = s.optional();
        break;
      case "unit_value":
        s = z.object({
          value: z.union([z.number(), z.string()]),
          unit: z.string().min(1, "Selecciona unidad"),
        });
        if (!f.required) s = s.optional();
        break;
      case "select":
      case "text":
      case "textarea":
      default:
        s = z.string();
        if (f.required) s = (s as z.ZodString).min(1, "Requerido");
        else s = s.optional();
        break;
    }
    shape[f.field_key] = s;
  }
  return z.object(shape);
}

/** Genera field_key a partir de label (slugify simple). */
export function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/** Convierte un EtFieldSchema (BD) en el EtFieldDef que consume DynamicField. */
export function schemaToFieldDef(s: EtFieldSchema) {
  return {
    key: s.field_key,
    label: s.label,
    type: s.field_type,
    required: s.required,
    placeholder: s.placeholder ?? undefined,
    options: s.options ?? undefined,
    unitOptions: s.unit_options ?? undefined,
  };
}
