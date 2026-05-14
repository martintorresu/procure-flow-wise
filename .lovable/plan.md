# Plan: Multi-tenancy real con aislamiento por tenant_id

## Contexto y problema

Actualmente el "multi-tenant" de Procurement by InHR es **cosmético**:
- `src/config/tenants.ts` resuelve un slug desde URL/subdominio
- Los usuarios en `mockUsers` tienen `tenantSlug`, pero la BD **no tiene ningún concepto de tenant**
- No hay tabla `tenants`, no hay `tenant_id` en `profiles`, ni en `purchase_processes`
- RLS actual sólo filtra por `created_by = auth.uid()` o por rol/etapa — un usuario "acme" puede ver PdCs de "codelco" si tiene el rol adecuado

Además, la mayoría de tablas de negocio que el frontend referencia (`rfqs`, `purchase_orders`, `fat_events`, `logistics_events`, `alerts`, `milestones`, `technical_specs`, `drawings`, `rfq_suppliers`) **no existen en la BD** — viven en `src/data/mockData.ts`.

## Alcance de esta entrega

### 1. Fundación de tenancy
- Crear tabla `public.tenants` (id, slug único, name, created_at)
- Sembrar tenants base: `default`, `acme`, `codelco`, `bhp`, `antofagasta` (para alinear con `src/config/tenants.ts`)
- Añadir `tenant_id uuid NOT NULL REFERENCES tenants(id)` a `public.profiles`
- Función `SECURITY DEFINER public.get_user_tenant_id(_user_id uuid) RETURNS uuid` (evita recursión RLS)
- Backfill: todos los profiles existentes → tenant `default`
- Actualizar trigger `handle_new_user` para asignar `tenant_id` desde `raw_user_meta_data->>'tenant_slug'` (fallback `default`)

### 2. tenant_id en tablas existentes
Añadir `tenant_id uuid NOT NULL` (con backfill desde `created_by → profile.tenant_id`) a:
- `purchase_processes`
- `et_forms`
- `et_form_data` (vía `et_form_id`)
- `et_audit_log`

Reescribir todas sus políticas RLS para combinar reglas actuales **AND** `tenant_id = get_user_tenant_id(auth.uid())`.

### 3. Tablas nuevas de negocio (con tenant_id + RLS desde el día 1)
Migrar de mock a producción:
- `purchase_milestones` (pdc_id, milestone_type, planned_date, actual_date, deviation_days, status)
- `technical_specs` (pdc_id, summary_description, has_studies, studies_available_date, validation_status)
- `rfqs` (pdc_id, sent_date, close_date)
- `rfq_suppliers` (rfq_id, supplier_name, quoted_amount, lead_time_days, technical_score, commercial_score, total_score)
- `purchase_orders` (pdc_id, po_number, issue_date, accepted_date, amount)
- `drawings` (pdc_id, requested_date, received_date, approved)
- `fat_events` (pdc_id, scheduled_date, executed_date, result, report_received)
- `logistics_events` (pdc_id, exwork_date, shipped_date, chile_arrival_date, port_arrival_date, damages_reported)
- `alerts` (pdc_id, type, severity, message, due_date, resolved)

Patrón RLS uniforme para cada tabla:
- SELECT: `tenant_id = get_user_tenant_id(auth.uid())` AND (`creator OR has_role(admin) OR user_can_access_stage(...)`)
- INSERT: `tenant_id = get_user_tenant_id(auth.uid())` (no se puede insertar en otro tenant)
- UPDATE/DELETE: equivalente con guardas de rol

Trigger `set_tenant_id_from_user()` para auto-completar `tenant_id` en INSERT desde el tenant del usuario, evitando que el cliente pueda forzar otro valor.

### 4. Test de aislamiento cross-tenant (entregable visible)
Script ejecutado al final que:
1. Crea (vía service role) usuario `acme-tester@test.local` en tenant `acme`
2. Crea (vía service role) usuario `codelco-tester@test.local` en tenant `codelco`
3. Login como acme → inserta `purchase_processes` con tenant=acme → guarda el id
4. Logout. Login como codelco → `SELECT * FROM purchase_processes WHERE id = <id_acme>`
5. Repite el SELECT sobre `alerts`, `rfqs`, `purchase_orders` con registros de prueba
6. **Imprime tabla de resultados**:
   ```
   Tabla              | acme insertó | codelco lee | ✅/❌
   purchase_processes | 1 fila       | 0 filas     | ✅
   alerts             | 1 fila       | 0 filas     | ✅
   ...
   ```
7. Limpia los usuarios y datos de prueba

El resultado de ese test se incluye **literal** en la respuesta. Si alguna fila da ❌, no declaro la tarea cerrada.

### 5. Lo que NO entra en este sprint
- Migrar el frontend de `mockData.ts` a las nuevas tablas (siguiente sprint — requiere hooks `useAlerts`, `useRfqs`, etc., y refactor de `PdcDetailPage`). Las tablas quedan creadas y con RLS, pero la UI seguirá mostrando mocks hasta el próximo paso.
- UI para cambio/asignación de tenant por admin
- Rate limiting de edge functions

## Detalles técnicos

```text
auth.users ──┐
             │ id
profiles ────┤── tenant_id ──► tenants.id
             │
             └─► get_user_tenant_id(uid) (SECURITY DEFINER)
                         │
                         ▼
       Toda RLS: tenant_id = get_user_tenant_id(auth.uid())
```

- `get_user_tenant_id` es SECURITY DEFINER → no entra en recursión RLS contra `profiles`
- `set_tenant_id_from_user()` BEFORE INSERT → previene tenant spoofing
- Índice compuesto `(tenant_id, <fk_principal>)` en cada tabla nueva para performance

## Riesgo

- Migración añade NOT NULL a tablas existentes con datos. Backfill se ejecuta antes del NOT NULL para no romper. Si algún profile no tiene `created_by` resoluble, va a `default`.
- Si confirmas, ejecuto las migraciones en una sola transacción y luego corro el test.

¿Procedo?
