# Changelog — Procurement by InHR / Pro.Curem Flow

**Sprint:** 20 – 25 de agosto de 2026  
**Versión objetivo:** Producción estable con planes Free/Pro, gestión de documentos y hardening de seguridad.  
**Autor:** Equipo de desarrollo InovaHR  
**Estado:** Entregado para revisión interna.

---

## Resumen ejecutivo

Durante el sprint del 20 al 25 de agosto de 2026 se entregaron las siguientes capacidades principales:

1. Sistema de suscripciones **Free y Pro** con validación en base de datos y gating en frontend.
2. Módulo de **gestión de documentos** adjuntos a procesos de compra.
3. Paquete de **correcciones de QA/UI** (responsive, fechas, textos técnicos, tildes, stepper, filtros).
4. Página pública de **política de privacidad**.
5. Múltiples ciclos de **hardening de seguridad** (RLS, funciones, PII, participantes).
6. Estabilización de **comunicaciones** (WhatsApp Business API y Resend).
7. Consolidación de **módulos de negocio** (Permisología, Compromisos de Reunión, MCP).
8. **Aprovisionamiento** de cuentas administrativas clave.

---

## 1. Sistema de planes Free y Pro

### Qué se hizo
Se implementó un sistema de tiering manual (sin Stripe) que permite al administrador asignar a cada tenant un plan **Free** o **Pro**. El plan Free limita a **3 procesos activos** y **2 usuarios**; el plan Pro es ilimitado. La validación se aplica tanto en base de datos (triggers) como en la interfaz de usuario.

### Archivos, tablas y funciones principales
- `src/lib/plans.ts` — Configuración centralizada `PLAN_LIMITS`, `PLAN_LABELS` y mensajes de límite.
- `src/hooks/useTenantSubscription.ts` — Hook `useTenantSubscription()` que expone `{ tier, limits, usage, isAtProcessLimit, isAtUserLimit, isLoading }`.
- `src/components/admin/SubscriptionsSection.tsx` — Panel de administración para ver tenants, uso y cambiar de plan.
- `src/pages/AdminPage.tsx` — Integración de la sección “Planes de Suscripción”.
- `src/pages/PdcListPage.tsx` — Badge de plan/uso y botón “Crear Proceso” deshabilitado con tooltip al alcanzar el límite.
- `src/pages/CreatePdcPage.tsx` — Banner informativo del plan Free y botón de submit bloqueado cuando aplica.
- `src/pages/DashboardPage.tsx` — Badge de plan y uso en el dashboard.
- Migración SQL: columnas `tenants.subscription_tier` y `tenants.subscription_updated_at`.
- Triggers de validación:
  - `trg_free_plan_process_limit` — rechaza INSERT en `purchase_processes` si Free ≥ 3 procesos activos.
  - `trg_free_plan_user_limit` — rechaza INSERT en `profiles` si Free ≥ 2 usuarios.
- Permisos revocados públicos sobre las funciones de trigger para evitar ejecución no autorizada.

### Fecha estimada
25 de agosto de 2026.

---

## 2. Gestión de documentos en procesos

### Qué se hizo
Se añadió una pestaña **“Documentos”** en la ficha de cada proceso de compra. Los usuarios pueden subir planos, certificados, especificaciones técnicas y otros documentos, clasificarlos por categoría, agregar una descripción opcional, descargarlos y eliminarlos (autor o admin).

### Archivos, tablas y funciones principales
- `src/components/ProcessDocuments.tsx` — Componente principal de la pestaña con drag & drop, listado, íconos por tipo y acciones.
- `src/hooks/useProcessDocuments.ts` — Hooks para listar, subir, eliminar y generar URLs firmadas de descarga.
- `src/pages/PdcDetailPage.tsx` — Integración de la pestaña “Documentos” junto a Descripción, Evaluación Técnica, etc.
- Tabla `process_documents`:
  - `id uuid`, `process_id uuid references purchase_processes`, `file_name text`, `file_type text`, `file_size bigint`, `file_path text`, `uploaded_by uuid references profiles`, `uploaded_at timestamptz`, `description text nullable`, `category text`.
- Bucket de Storage `process-documents` (privado, límite 10 MB).
- Políticas RLS:
  - Lectura para usuarios del mismo tenant.
  - Eliminación solo para el usuario que subió el archivo o administradores.

### Fecha estimada
25 de agosto de 2026.

---

## 3. Correcciones de QA / UI / Responsive

### Qué se hizo
Se resolvió un paquete de bugs de interfaz reportados por QA: sidebar no colapsaba automáticamente en móvil, fechas ISO crudas en detalle de proceso, textos técnicos visibles al usuario, tildes faltantes, superposición de labels en el stepper y filtros truncados en Permisología.

### Archivos, tablas y funciones principales
- `src/components/AppSidebar.tsx` — Integración de `useIsMobile` para colapsar automáticamente a íconos en viewports ≤768 px.
- `src/lib/stageLabels.ts` — Nuevas utilidades:
  - `formatStageLabel()` — convierte claves técnicas a nombres legibles (`orden_compra` → “Orden de Compra”).
  - `humanizeTechnicalText()` — reemplaza claves dentro de mensajes de alerta.
  - `formatDate()` — formatea ISO a `es-CL` (ej. “20 ago 2026”).
- `src/pages/PdcDetailPage.tsx` — Aplicación de `formatDate` en campos “Creado” y “Actualizado”.
- `src/pages/AlertsPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/PdcDetailPage.tsx` — Uso de `formatStageLabel` / `humanizeTechnicalText` para mensajes de alerta.
- `src/pages/AdminPage.tsx` — Tildes corregidos en roles de ejemplo (“Programación”, “Planificación”, “Logística”) y estados de la matriz de aprobación (“Evaluación”, “Pendiente de aprobación”).
- `src/components/ProcessStepper.tsx` y `src/components/ProcessStepperZoom.tsx` — Labels con `truncate`, `title` tooltip nativo y menor tamaño de fuente para evitar superposición.
- `src/pages/PermitsPage.tsx` — Grid de filtros cambiado a layout responsive (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5`) para evitar textos cortados.

### Fecha estimada
25 de agosto de 2026.

---

## 4. Política de privacidad pública

### Qué se hizo
Se creó una página pública de política de privacidad accesible sin autenticación, en español, con información profesional sobre datos recopilados, uso de WhatsApp Business API, almacenamiento, terceros, derechos del usuario y contacto.

### Archivos, tablas y funciones principales
- `src/pages/PrivacyPolicyPage.tsx` — Página completa en español.
- `src/App.tsx` — Ruta pública `/privacy` (sin login).
- `src/pages/LoginPage.tsx` y `src/pages/SignUpPage.tsx` — Enlaces de descubrimiento a `/privacy`.

### Contenido cubierto
- Datos recopilados: nombre, email, teléfono, RUT y datos de procesos de compra.
- Uso de WhatsApp Business API para alertas y notificaciones.
- Almacenamiento seguro en Supabase.
- No compartición con terceros salvo Meta/WhatsApp para el envío de notificaciones.
- Derechos de acceso, rectificación y eliminación.
- Contacto: `contacto@inovahr.com`.
- Empresa responsable: InovaHR.
- Última actualización: agosto de 2026.

### Fecha estimada
24 de agosto de 2026.

---

## 5. Seguridad (hardening)

### Qué se hizo
Se ejecutaron tres ciclos de endurecimiento de seguridad focalizados en reducir la exposición de PII, restringir operaciones sensibles por rol/etapa, mover funciones críticas a esquema privado y evitar enumeración cross-tenant en participantes externos.

### Archivos, tablas y funciones principales

#### Ciclo 1 — Funciones SECURITY DEFINER y RLS de alertas/ET/participantes
- Migración SQL que:
  - Restringe `UPDATE` en `alerts` a admins, gerentes, creadores o usuarios con `owner_role`.
  - Limita `INSERT`/`UPDATE` en formularios ET a roles técnicos (`admin`, `gerente`, `ingenieria`) o propietario.
  - Refuerza `is_process_participant` y `can_comment_process` validando `tenant_id` del proceso y `auth.uid()`.
  - Mueve `claim_process_invitations` a función privada con wrapper público `SECURITY INVOKER`.
- Hallazgos resueltos: `SUPA_authenticated_security_definer_function_executable`, `alerts_update_no_role_restriction`, `et_forms_no_insert_check_role`, `et_forms_update_no_role_restriction`, `process_participants_email_broad_access`.

#### Ciclo 2 — PII y validación de procesos
- Nueva tabla `profile_contacts` para aislar `phone`, `rut` y preferencias de notificación, con RLS estricto.
- `profiles` reducido a directorio público limitado (nombre, email, rol, tenant).
- Actualización de `purchase_processes` con políticas `WITH CHECK` que validan rol y etapa en actualizaciones.
- Actualización de hooks: `useAuth`, `useTenantUsers`, `useTenantSubscription`, `useWhatsappConfig`.
- Actualización de Edge Functions que consumen datos de contacto.
- Hallazgos resueltos: `profiles_tenant_wide_pii_exposure`, `purchase_processes_update_check_bypass`.

#### Ciclo 3 — Realtime, auto-update de invitaciones y log de WhatsApp
- `et_field_forms`: aislamiento reforzado por tenant en lecturas en tiempo real.
- `process_participants`: trigger que permite a un invitado solo aceptar/rechazar su propia invitación y bloquea cualquier otro cambio.
- `whatsapp_log`: revocados permisos de `INSERT`/`UPDATE`/`DELETE` para `authenticated` y `anon`; escritura exclusiva por `service_role`.
- Hallazgos resueltos: `et_forms_realtime_rls_reliance`, `process_participants_no_self_update`, `whatsapp_log_missing_insert_policy`.

#### Ciclo 4 — Schemas de equipos, contactos y log
- `equipment_type_schemas`: acceso restringido a usuarios autenticados, revocado `anon`.
- `profile_contacts`: política `profile_contacts_delete_own` para que cada usuario elimine sus propios datos.
- `whatsapp_log`: confirmación de política de solo lectura para clientes.
- Hallazgos resueltos: `equipment_type_schemas_broad_select`, `profile_contacts_no_delete_own`, `whatsapp_log_no_insert_policy`.

### Fecha estimada
21 – 24 de agosto de 2026.

---

## 6. Comunicaciones (WhatsApp y Email)

### Qué se hizo
Se estabilizaron los canales de comunicación reales: se corrigió el envío de WhatsApp Business API (plantilla e idioma), se añadió modo de prueba administrativo y se verificó el envío de emails reales vía Resend.

### Archivos, tablas y funciones principales
- `supabase/functions/send-whatsapp-alert/index.ts`:
  - Plantilla fijada a `procurem_alerta`.
  - Idioma corregido a `es_CL` (descubierto como el código aprobado en Meta).
  - Reintento automático entre variantes de idioma si falla la traducción inicial.
  - Manejo controlado del error `#131030` (número no en lista permitida) sin generar `502`.
  - Soporte para `test: true` con datos de ejemplo.
- `src/hooks/useWhatsappConfig.ts` — Hook `useSendWhatsappTest` para invocar modo prueba.
- `src/components/admin/WhatsappConfigSection.tsx` — Sección “Prueba de envío” con selector de usuario y resultado técnico.
- `supabase/functions/test-email/index.ts` — Edge Function temporal para envío de prueba real.
- Envíos verificados:
  - `mtorres74@hotmail.com` → ID `86485f75-efd3-4503-b905-d7d7899c0697`.
  - `martin.torres.inovahr@gmail.com` → ID `a38b6e8c-a3ae-4a56-b1d0-f26abf2dc2bf`.
  - Claudia Yáñez (+56977640802) y Martín Torres (+56992220281) — pruebas controladas con error `#131030` documentado.

### Fecha estimada
22 – 24 de agosto de 2026.

---

## 7. Módulos de negocio (Permisología, Compromisos, MCP)

### Qué se hizo
Se consolidaron tres módulos de negocio principales: gestión de permisos regulatorios con alertas, compromisos de reunión con importación por API/lenguaje natural, y servidor MCP seguro para integración con agentes.

### Archivos, tablas y funciones principales

#### Permisología
- Tablas: `permit_types`, `permits`, `permit_documents`.
- `src/hooks/usePermits.ts` — CRUD y sincronización de alertas WhatsApp/In-app.
- `src/components/permits/PermitsTimeline.tsx` — Vista tipo Gantt/calendario.
- `src/components/DashboardPermitsWidget.tsx` — Widget de vencimientos en dashboard.
- `src/pages/PermitsPage.tsx` — Vista tabla con filtros.
- `src/pages/ProjectChainPage.tsx` — Pestaña “Permisos” por proyecto.
- `src/pages/AdminPage.tsx` — Sección de administración de tipos de permiso.
- `src/pages/CreatePdcPage.tsx` — Procesos tipo `permiso` redirigen al formulario de permisología.
- Alertas automáticas a 60, 30 y 7 días del vencimiento.

#### Compromisos de Reunión
- Tabla `process_commitments`.
- `supabase/functions/import-commitments/index.ts` — Parser de lenguaje natural con matching fuzzy.
- `src/lib/commitments.ts` — Lógica de detección de fechas relativas.
- `src/components/MeetingToActionHero.tsx` — Hero de importación.
- `src/components/DashboardCommitmentsWidget.tsx` — Widget de urgencias en dashboard.
- `src/pages/CommitmentsPage.tsx` — Vista completa con tabs.
- Tabla `api_keys` para autenticación de agentes (SHA-256).

#### MCP / Agentes
- `supabase/functions/mcp/index.ts` — Servidor MCP con OAuth.
- `src/lib/mcp/tools/*` — Herramientas:
  - `list-processes.ts`
  - `list-projects.ts`
  - `list-alerts.ts`
  - `get-process.ts`
  - `add-process-comment.ts`
- `src/pages/OAuthConsent.tsx` — Pantalla de consentimiento OAuth para agentes.

### Fecha estimada
20 – 23 de agosto de 2026.

---

## 8. Accesos y aprovisionamiento de cuentas

### Qué se hizo
Se aprovisionaron y verificaron cuentas administrativas clave para el go-live y pruebas del sistema.

### Cuentas administrativas creadas/verificadas
- **Martín Torres** (`martin@inovahr.com`) — Admin verificado.
- **Ramón** (`ramon@pro-curem.com`) — Admin.
- **amutar11@gmail.com** — Admin.
- **Claudia Yáñez** (`cyanezh15@gmail.com`) — Admin, contraseña `Provisorio_1234`.

### Mecanismo
- Edge Functions temporales de aprovisionamiento y verificación de roles.
- Validación de inicio de sesión en preview para confirmar acceso administrativo.

### Fecha estimada
20 – 25 de agosto de 2026.

---

## Pendientes

| # | Pendiente | Impacto | Fecha objetivo |
|---|-----------|---------|----------------|
| 1 | **Aprobación de plantilla WhatsApp por Meta** — La plantilla `procurem_alerta` ya está aprobada en idioma `es_CL`, pero la app de WhatsApp sigue en modo de prueba. Se requiere pasar a producción o mantener lista de destinatarios de prueba actualizada. | Envío de alertas WhatsApp a usuarios finales. | A la brevedad |
| 2 | **Verificación de negocio en Meta** — Necesaria para eliminar restricción `#131030` (número no en lista permitida) y enviar mensajes a cualquier destinatario. | Alcance completo de notificaciones WhatsApp. | A la brevedad |
| 3 | **Renovación del access token de Meta** — El token actual de WhatsApp Business API tiene vigencia aproximada hasta **~23 de octubre de 2026**. Programar rotación antes de la expiración. | Continuidad del servicio de alertas WhatsApp. | ~23 de octubre de 2026 |

---

## Notas técnicas generales

- Todos los cambios de base de datos se ejecutaron mediante migraciones con `GRANT` y RLS correspondientes.
- No se introdujeron dependencias de pago (Stripe/Paddle) para el sistema de planes; la asignación de tier es manual desde administración.
- El código fue validado con `tsc --noEmit` tras cada ciclo de cambios.
- Las Edge Functions críticas (`send-whatsapp-alert`, `send-invite-email`, `send-comment-notification`, `import-commitments`, `mcp`) fueron redeployadas durante el sprint.

---

*Documento generado el 25 de agosto de 2026.*
