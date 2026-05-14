import { DynamicField } from "./DynamicField";
import { useEtFieldSchema } from "@/hooks/useEtFieldSchemas";
import { schemaToFieldDef } from "@/lib/etSchemaBuilder";

interface CustomFieldsBlockProps {
  sectionNumber: number;
  /** Diccionario de valores actuales (por field_key). */
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
  /** Errores de validación por field_key (opcional). */
  errors?: Record<string, string>;
}

/**
 * Renderiza solo los campos custom (is_system=false) activos para esa sección
 * del tenant actual. Si no hay custom fields, no muestra nada.
 */
export function CustomFieldsBlock({ sectionNumber, values, onChange, disabled, errors }: CustomFieldsBlockProps) {
  const { data: fields = [] } = useEtFieldSchema(sectionNumber);
  const custom = fields.filter((f) => !f.is_system);
  if (custom.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-dashed">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Campos adicionales del tenant
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {custom.map((f) => {
          const err = errors?.[f.field_key];
          return (
            <div key={f.id} className="space-y-1">
              <DynamicField
                field={schemaToFieldDef(f)}
                value={values[f.field_key]}
                onChange={(v) => onChange(f.field_key, v)}
                disabled={disabled}
              />
              {err && <p className="text-xs text-danger">{err}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
