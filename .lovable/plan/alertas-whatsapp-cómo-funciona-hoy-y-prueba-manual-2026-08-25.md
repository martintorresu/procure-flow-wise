# Alertas WhatsApp: cómo funciona hoy y prueba manual

## 1. Qué dispara `send-whatsapp-alert`

Hoy hay 4 orígenes, todos "best effort" (si fallan, la alerta in-app igual se crea):

| Origen | Archivo | Cuándo |
|---|---|---|
| Avance de etapa que requiere aprobación | `src/hooks/usePdcs.ts:296` (`notifyWhatsappByRole`) | Al intentar avanzar un proceso y coincidir una regla de la matriz de aprobación: crea alerta `approval_required` y notifica a todos los usuarios del tenant con el rol requerido |
| Compromisos creados desde la app | `src/hooks/useCommitments.ts:118` | Al insertar compromisos con responsable asignado (alerta tipo `commitment`) |
| Vencimiento de permisos | `src/hooks/usePermits.ts:315` | Sincronización automática al montar la vista de Permisos: alertas 60/30/7 días al `responsible_user_id` |
| Importación por API | `supabase/functions/import-commitments/index.ts:216` | Al importar compromisos vía API key, solo si `whatsapp_config.enabled` |

El helper `src/lib/whatsapp.ts` invoca la función con `{ alert_id, user_id, tenant_id }`. La función valida JWT, que el caller sea del mismo tenant, y luego corta el envío si: WhatsApp deshabilitado en el tenant, usuario con opt-out, sin teléfono, o teléfono no E.164.

## 2. Dónde se configura el teléfono

- Tabla `profile_contacts` (`phone`, `rut`, `whatsapp_notifications_enabled`), separada de `profiles` por privacidad.
- El propio usuario: página **Perfil** (`src/pages/ProfilePage.tsx`).
- Un admin: **Admin → Contacto de usuarios** (`TenantUsersContactSection.tsx`), con validación E.164 (`+56912345678`).
- Credenciales de Meta y el switch global: **Admin → WhatsApp** (`whatsapp_config`: `phone_number_id`, `access_token`, `enabled`). Si existe el secret `META_WHATSAPP_ACCESS_TOKEN`, ese tiene prioridad.

## 3. Prueba end-to-end: no existe hoy

No hay ningún botón de prueba manual. La única forma actual es provocar un evento real (avanzar un proceso bloqueado por aprobación, o crear un compromiso con responsable).

## Propuesta: botón "Enviar prueba" en Admin → WhatsApp

- Añadir a `WhatsappConfigSection` un bloque de prueba: un selector/input opcional de destinatario (por defecto el usuario logueado) y un botón **Enviar mensaje de prueba**.
- Extender `send-whatsapp-alert` para aceptar `test: true` sin `alert_id`: en ese modo arma la plantilla `procurem_alerta` con valores de ejemplo ({{1}} "Prueba de configuración", {{2}} "Proceso de prueba", {{3}} "—", {{4}} "Mensaje de verificación desde Pro.Curem"), la envía al teléfono del usuario indicado y registra el resultado en `whatsapp_log` con `alert_id = null`.
- Solo admins del tenant pueden usar el modo prueba (validación de rol en la edge function).
- Mostrar en la UI el resultado exacto (message id de Meta o el error que devuelve Graph API) y refrescar la tabla "Últimos envíos".

### Detalles técnicos
- `whatsapp_log.alert_id` ya es nullable, no requiere migración.
- La validación de tenant y las mismas guardas (enabled, opt-out, E.164) se reutilizan; en modo prueba se devuelve el motivo del `skip` de forma visible en la UI en vez de silenciarlo.
