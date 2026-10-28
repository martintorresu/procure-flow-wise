# Requisitos y Documentos — Etapa 0 (análisis, sin cambios)

## 1. Lo que encontré

**Tablas actuales**
| Tabla | Filas | Políticas RLS | Uso en el código |
|---|---|---|---|
| requirement_catalog | 18 (P01–P18, espacioluz) | 4 | `useRequirements.ts`, `RequirementTemplatePage.tsx` |
| business_rules | 10 | 4 | `useRequirements.ts`, `RequirementTemplatePage.tsx` |
| project_requirements | 0 | 4 | `useRequirements.ts`, `ProjectRequirements.tsx` (pestaña en `ProjectChainPage.tsx`) |
| projects | — | 4 | solo id, name, tenant_id |

Rutas/menú: `App.tsx` (ruta de la plantilla) y `AppSidebar.tsx` ("Plantilla Permisos DOM", solo Espacio Luz admin/gestor).

**Otros datos comprobados**
- `private.has_role` existe; las políticas nuevas pueden usarla.
- Proyecto Piedra Roja 1570 (`e340de8e…`) existe.
- El proceso «Recepción Municipal DOM» (`24ee8fae…`) hoy se llama **PROC-08** (no PR-08) y tiene **16 etapas**: coincide con el criterio 6.
- Las dos planillas (V3_1 y V3_2) son idénticas celda por celda. Uso una sola.

## 2. Bloqueos antes de la Etapa 2

1. **Faltan 4 archivos** citados en el prompt: `requirement_catalog.csv` (340), `applicability_rules.csv` (340), `sector_certificate_catalog.csv` (17) y `espacio_luz_example.csv` (54). Sin ellos no se pueden cargar los 340 requisitos ni probar la carga mixta. La Etapa 1 (esquema) sí puede avanzar.
2. **Administradores de plataforma:** hay varias cuentas posibles — Martín: `martin@inovahr.com`, `martin@pro-curem.com`; Claudia: `claudia@pro-curem.com`, `claudia@inovahr.com`, `claudia@inovahr.cl`, `cyanezh15@gmail.com`. Necesito saber cuáles.

## 3. Esquema propuesto (Etapa 1)

**Renombre y reemplazo**
- `requirement_catalog` → `dom_process_steps` (conserva datos y sus 4 políticas).
- `business_rules` se mantiene (la pantalla de plantilla la sigue mostrando).
- `project_requirements` (0 filas) se elimina y se recrea con el modelo nuevo; se adaptan `useRequirements.ts`, `ProjectRequirements.tsx` y `RequirementTemplatePage.tsx`.

**Capa 1 — Catálogo legal (sin tenant_id; lectura autenticada; escritura solo `platform_admins`)**
`platform_admins`, `legal_processes`, `legal_requirements` (version_major/minor enteros, catalog_version texto, family, effective_from/to, evidence_pending; único requirement_code+major+minor), `sector_certificates`, `process_applicability_rules`, `applicability_rules` (condition_json, action include/exclude/requires_review, priority, human_validation_required).

**Capa 2 — Municipal:** `municipalities` (se crea Las Condes), `municipal_requirements` (tenant_id nulo = compartida, solo plataforma edita; con valor = propia del tenant).

**Capa 3 — Tenant:** `tenant_requirements`, `requirement_templates`, `requirement_template_items`.

**Capa 4 — Proyecto:** `project_processes`, `project_requirements` (campos del punto 3, único project_id+origin_type+código), `requirement_documents` (versionado), `requirement_events`, `flow_gate_reviews`, `import_jobs`, `import_rows`.

**Flujo:** `flow_stages` (E1–E6) y `flow_gates` (G01–G09), alimentadas desde `dom_process_steps`.

**projects:** + `municipality_id`, + `profile jsonb`.

**Storage:** bucket privado `requirement-documents`, ruta `{tenant_id}/{project_id}/…`, URLs firmadas cortas, PDF/JPG/PNG/DOCX/XLSX/DWG, máx. 25 MB.

**Permisos (RLS con `private.has_role`)**: plataforma → capas 1 y 2 compartidas; admin → plantillas, propios, cargas, municipales propias; gestor → trámites, activación, gates, revisión de documentos, validación de vínculos; colaborador → solo requisitos asignados (UPDATE limitado por trigger) y documentos; lector → solo lectura. Toda tabla con tenant_id, created/updated_by/at e índices pedidos. Función `purge_project_requirement_data(project_id)` para retención (R15).

**Verificación al cerrar Etapa 1:** conteo de políticas por tabla, consulta de aislamiento entre tenants, y comprobación de que un colaborador no puede escribir en el catálogo legal.

## 4. Etapas siguientes
- Etapa 2: centro de carga, evaluador de condition_json (vacío → review_required), importación de los archivos de Claudia y V.3.
- Etapa 3: perfil, asistente de trámites, pestaña Requisitos, ficha, documentos, estados, gates, dashboard E1–E6, exportación.
- Etapa 4: los 15 criterios de aceptación con consultas a la base.

## 5. Nota
La memoria del proyecto todavía describe el modelo antiguo de compras (PdC). Al final la actualizo junto con el knowledge, como pide el prompt.
