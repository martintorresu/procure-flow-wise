/**
 * Perfil del proyecto (projects.profile jsonb). Claves fijas que usan las
 * reglas de aplicabilidad del catálogo legal.
 * Minimización (Ley 21.719): de las personas solo se guarda el nombre.
 */
export type FieldKind = "text" | "date" | "number" | "bool" | "select";

export interface ProfileField {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  /** Ayuda: qué trámites o requisitos afecta. */
  affects?: string;
  defaultValue?: unknown;
}

export interface ProfileSection { title: string; fields: ProfileField[] }

const yes = (key: string, label: string, affects?: string, defaultValue?: boolean): ProfileField =>
  ({ key, label, kind: "bool", affects, defaultValue });

export const PROFILE_SECTIONS: ProfileSection[] = [
  {
    title: "Identificación",
    fields: [
      { key: "address", label: "Dirección", kind: "text" },
      { key: "tax_role", label: "Rol de avalúo", kind: "text" },
      { key: "permit_number", label: "Número de permiso", kind: "text" },
      { key: "permit_date", label: "Fecha del permiso", kind: "date" },
      { key: "owner_name", label: "Propietario (nombre)", kind: "text" },
      { key: "architect_name", label: "Arquitecto (nombre)", kind: "text" },
      { key: "ito_name", label: "ITO (nombre)", kind: "text", affects: "Responde «¿Tiene ITO?»" },
      { key: "independent_reviewer_name", label: "Revisor independiente (nombre)", kind: "text", affects: "Responde «¿Tiene revisor independiente?»" },
      { key: "target_reception_date", label: "Fecha objetivo de recepción", kind: "date" },
    ],
  },
  {
    title: "Tipo de obra",
    fields: [
      {
        key: "project_type", label: "Tipo de proyecto", kind: "select", affects: "Trámites de permiso, ampliación, regularización y demolición",
        options: [
          { value: "new_build", label: "Obra nueva" }, { value: "extension", label: "Ampliación" },
          { value: "alteration", label: "Alteración" }, { value: "regularization", label: "Regularización" },
          { value: "demolition", label: "Demolición" }, { value: "urbanization", label: "Urbanización" },
        ],
      },
      { key: "permit_route", label: "Vía de tramitación", kind: "select", affects: "Permiso o declaración jurada", options: [{ value: "permit", label: "Permiso" }, { value: "dj", label: "Declaración jurada" }] },
      { key: "area_type", label: "Zona", kind: "select", options: [{ value: "urban", label: "Urbana" }, { value: "rural", label: "Rural" }] },
      { key: "use_class", label: "Destino", kind: "text" },
      { key: "area_m2", label: "Superficie (m²)", kind: "number", affects: "Umbrales de superficie (ej. ampliaciones > 100 m²)" },
      { key: "occupancy_load", label: "Carga de ocupación", kind: "number" },
      { key: "reception_type", label: "Tipo de recepción", kind: "select", options: [{ value: "total", label: "Total" }, { value: "partial", label: "Parcial" }] },
    ],
  },
  {
    title: "Instalaciones y especialidades",
    fields: [
      yes("has_gas", "Instalación de gas", "Certificados SEC de gas (TC6)"),
      yes("has_electric", "Instalación eléctrica", "Certificados SEC eléctricos (TE1)"),
      yes("has_elevators", "Ascensores", "Certificados de ascensores"),
      yes("has_climate_system", "Climatización"),
      yes("has_structural_calculation", "Cálculo estructural", "Revisor de cálculo estructural"),
      yes("has_accessibility_scope", "Alcance de accesibilidad universal"),
      yes("has_fire_safety_scope", "Seguridad contra incendio"),
      yes("has_public_use", "Uso público"),
      yes("has_heritage_protection", "Protección patrimonial"),
      yes("has_imiv", "IMIV (impacto vial)"),
      yes("has_urbanization", "Obras de urbanización", "Trámites de urbanización y anteproyecto"),
      yes("has_demolition", "Demolición"),
    ],
  },
  {
    title: "Otras condiciones",
    fields: [
      yes("uses_anteproyecto", "Usa anteproyecto", "Trámite de anteproyecto (E2)"),
      {
        key: "lot_operation", label: "Operación de loteo", kind: "select", affects: "Fusión, subdivisión y loteo",
        options: [{ value: "none", label: "Ninguna" }, { value: "fusion", label: "Fusión" }, { value: "subdivision", label: "Subdivisión" }, { value: "loteo", label: "Loteo" }],
      },
      yes("has_project_modifications", "Modificaciones de proyecto"),
      yes("has_change_of_use", "Cambio de destino"),
      yes("is_social_housing", "Vivienda social"),
      yes("built_before_1959", "Construido antes de 1959"),
      {
        key: "special_work", label: "Obra especial", kind: "select",
        options: [{ value: "none", label: "Ninguna" }, { value: "green_area_complementary", label: "Complementaria en área verde" }, { value: "pool_near_boundary", label: "Piscina cerca del deslinde" }],
      },
      yes("has_auxiliary_works", "Obras auxiliares"),
      yes("has_ito", "Tiene ITO", "Se responde sola si hay nombre de ITO"),
      yes("has_independent_reviewer", "Tiene revisor independiente", "Se responde sola si hay nombre de revisor"),
      yes("is_condominium", "Copropiedad", "Ley de copropiedad"),
      yes("requires_cip", "Requiere CIP", "Certificado de informaciones previas", true),
      yes("pays_municipal_fees", "Paga derechos municipales", "Derechos y aranceles", true),
    ],
  },
];

export const ALL_PROFILE_FIELDS = PROFILE_SECTIONS.flatMap((s) => s.fields);

export const fieldLabel = (key: string) => ALL_PROFILE_FIELDS.find((f) => f.key === key)?.label ?? key;

export type ProjectProfile = Record<string, unknown>;

/** Perfil efectivo para evaluar reglas: aplica valores por defecto y respuestas derivadas. */
export function effectiveProfile(raw: ProjectProfile | null | undefined): ProjectProfile {
  const p: ProjectProfile = { ...(raw ?? {}) };
  for (const f of ALL_PROFILE_FIELDS) {
    if (f.defaultValue !== undefined && (p[f.key] === undefined || p[f.key] === null)) p[f.key] = f.defaultValue;
  }
  const filled = (v: unknown) => typeof v === "string" && v.trim() !== "";
  if (p.has_ito === undefined || p.has_ito === null) if (filled(p.ito_name)) p.has_ito = true;
  if (p.has_independent_reviewer === undefined || p.has_independent_reviewer === null)
    if (filled(p.independent_reviewer_name)) p.has_independent_reviewer = true;
  return p;
}
