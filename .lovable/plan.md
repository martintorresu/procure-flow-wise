## Sprint de Configurabilidad — Plan de ejecución

Voy a ejecutar los 3 bloques en orden, con verificación al final de cada uno antes de seguir. Algunas decisiones que tomé y necesito confirmar antes de tocar código:

---

### Decisiones / supuestos que necesito validar

1. **Roles en `approval_matrix`**: el enum `app_role` actual de la BD es `('admin','compras','ingenieria','programacion','gerente','planificacion','logistica')` (en español). El prompt pide guardar `'manager'`, `'engineering'`, etc. (en inglés). **Voy a usar el enum existente en español** (`gerente`, `compras`, …) para no romper `has_role()` ni introducir un mapping paralelo. Si prefieres el inglés, lo cambio antes de migrar.

2. **Estado `pending_approval`**: el enum `process_stage` actual no tiene este valor. En lugar de agregarlo (rompería RLS y la tabla de etapas), voy a:
   - Agregar columna `purchase_processes.approval_status text` con valores `null | 'pending' | 'approved' | 'rejected'` y `approval_required_role app_role`.
   - El PdC permanece en su etapa actual; el avance se bloquea desde `useAdvanceStage` mientras `approval_status = 'pending'`.
   - El badge en el Stepper lee `approval_status`.

3. **"Notificar al rol requerido"**: la tabla `alerts` no tiene columna `owner_role`. Voy a agregarla (`owner_role app_role nullable`) y filtrar el dashboard del Gerente por `owner_role = 'gerente' OR has_role(auth.uid(),'gerente')`.

4. **Lógica de evaluación de alertas server-side**: hoy las alertas se crean a mano (no hay job de evaluación). Voy a dejar la tabla `alert_rules` lista + el hook + UI, pero **no** voy a implementar un cron/edge function que recorra PdCs y emita alertas según las reglas (eso es trabajo aparte y no está en el alcance explícito). Las reglas quedan disponibles para que cualquier código que cree alertas las consulte.

5. **`useAdvanceStage`**: hoy no existe como mutación. Lo creo desde cero como parte del Bloque 2.

---

### Bloque 1 — Reglas de alerta configurables

**Migración**:
- Tabla `alert_rules` con esquema del prompt + RLS (`SELECT` para authenticated del tenant; `INSERT/UPDATE/DELETE` solo admin).
- Seed de las 7 reglas por defecto para cada tenant existente.

**Frontend**:
- `src/lib/queryKeys.ts` (creado en Bloque 2, pero reutilizo aquí la key `["alert_rules"]`).
- `src/hooks/useAlertRules.ts` con `useAlertRules()` y `useUpdateAlertRule()`.
- `src/pages/AdminPage.tsx`: nueva sección "Reglas de Alerta" (tabla editable, solo visible para admin).

**Verificación**: cambio `fat_unscheduled → 21 días` en tenant `default` vía la UI y leo `alert_rules` con `read_query`.

---

### Bloque 2 — `usePdcs` a TanStack Query

**Archivos**:
- Nuevo `src/lib/queryKeys.ts` con todas las keys.
- Refactor `src/hooks/usePdcs.ts`: `usePdcs(filters?)`, `usePdc(id)`, `useCreatePdc()`, `useUpdatePdc()`, `useAdvanceStage()`.
- Actualizar los 7 hooks existentes (`useAlerts`, `useMilestones`, `useRfqs`, `usePurchaseOrders`, `useDrawings`, `useFatEvents`, `useLogisticsEvents`) para importar de `queryKeys`.
- Actualizar consumidores de `usePdcs`/`usePdc` (`DashboardPage`, `PdcListPage`, `PdcDetailPage`, `EditPdcPage`, `CreatePdcPage`).
- `DashboardPage`: `queryClient.prefetchQuery(queryKeys.pdcs())` en `useEffect`.

**Filtros**: proyecto (text), criticidad (low/medium/high), etapa (process_stage), semáforo (calculado client-side, no en query).

**Verificación**: crear PdC y avanzar etapa, confirmar refetch automático; `bunx tsc --noEmit`.

---

### Bloque 3 — Matriz de aprobación

**Migración**:
- Tabla `approval_matrix` con esquema del prompt (uso enum `app_role` español; ver supuesto #1).
- Columnas nuevas en `purchase_processes`: `approval_status text`, `approval_required_role app_role`.
- Columna nueva en `alerts`: `owner_role app_role`.
- RLS: `SELECT` para authenticated del tenant; `INSERT/UPDATE/DELETE` solo admin.
- Seed: 2 reglas por defecto por tenant (OC > 100k → gerente; criticidad alta en adjudicación → gerente).

**Lógica**:
- `useAdvanceStage()` consulta `approval_matrix` antes del avance. Si aplica regla activa → set `approval_status='pending'` + insert en `alerts` con `owner_role`. Si no → avanza.
- `useApprovePdc()` → set `approval_status='approved'`, avanza etapa, resuelve alerta.

**Hook**: `src/hooks/useApprovalMatrix.ts` con `useApprovalMatrix()`, `useUpdateApprovalRule()`, `useApprovePdc()`.

**UI**:
- Stepper en `PdcDetailPage`: badge "Esperando aprobación de {rol}" si `approval_status='pending'`.
- `DashboardPage` (gerente): sección "Pendientes de aprobación".
- `AdminPage`: tabla de reglas de aprobación.

**Verificación**: crear PdC con monto > 100k → bloqueo; aprobar como gerente → avance; PdC < 100k → avance directo. `bunx tsc --noEmit`.

---

### Entregables al cierre

- Resumen de tablas nuevas (`alert_rules`, `approval_matrix`) + columnas agregadas.
- Mapa de hooks → query keys.
- Output de `bunx tsc --noEmit`.
- Lista de vistas de Admin modificadas.

---

**¿Confirmas las 4 decisiones de la sección "Decisiones / supuestos" y arranco con la migración del Bloque 1?**
