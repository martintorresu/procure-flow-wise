
- Requisitos y Documentos: catálogo legal/municipal compartido sin tenant_id, editable solo por `platform_admins`; datos de proyecto en `project_requirement_items` (la antigua `project_requirements` y `requirement_catalog` quedan deprecadas, no se borran para no romper la app publicada).
- Catálogo legal: toda carga pasa por `src/lib/catalogImport.ts` (Centro de carga `/catalogo-legal`, solo platform_admins) y registra en `import_jobs`/`import_rows`; es idempotente (versión mayor = nueva versión, sin versión = se omite si existe) para que reimportar no duplique.
- Aplicabilidad: `condition_json` se evalúa solo con `src/lib/conditionEval.ts`; un campo de perfil faltante da `review_required`, nunca exclusión.
